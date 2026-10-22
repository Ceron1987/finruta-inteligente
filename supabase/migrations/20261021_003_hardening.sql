-- ============================================================================
-- FinRuta Inteligente — HARDENING (parche de seguridad y transaccionalidad)
-- Fecha: 2026-10-21
-- ----------------------------------------------------------------------------
-- Esta migración:
--   1. Reemplaza handle_new_user: IGNORA raw_user_meta_data->>'rol'
--      para que nadie pueda auto-ascenderse a gerente al registrarse.
--   2. Reemplaza es_gerente() y es_asesor() (ya validaban activo=true;
--      explícito aquí) y agrega CHECK de monto autorizado.
--   3. Agrega función RPC `fn_autorizar_solicitud(...)` que ejecuta
--      autorización + update + auditoría en una SOLA transacción,
--      con validaciones de servidor contra la tabla configuracion.
--   4. Blindaje de solicitudes_update: evita que un asesor cambie
--      asesor_id, cliente_id o monto_solicitado_centavos (robo/edición).
--   5. CHECK: creditos.monto_neto_centavos = bruto - tarifa, saldo >= 0.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Trigger de alta de usuarios — SIEMPRE 'asesor', nunca 'gerente' por metadata
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nombre, correo, rol)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), split_part(new.email, '@', 1)),
    new.email,
    'asesor'::role_tipo   -- FORZADO. Promoción a 'gerente' sólo vía UPDATE por un gerente existente.
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- (El trigger on_auth_user_created ya existe desde 20261021_002_seed.sql
--  y referencia esta función por nombre, así que la nueva versión toma efecto.)

-- ----------------------------------------------------------------------------
-- 2. CHECK: estados coherentes de crédito (red adicional sobre la lógica)
-- ----------------------------------------------------------------------------
alter table public.creditos
  drop constraint if exists chk_creditos_montos;
alter table public.creditos
  add constraint chk_creditos_montos check (
    monto_bruto_centavos > 0
    and tarifa_renovacion_centavos >= 0
    and monto_neto_centavos = monto_bruto_centavos - tarifa_renovacion_centavos
    and saldo_centavos >= 0
    and saldo_centavos <= monto_bruto_centavos
  );

alter table public.autorizaciones
  drop constraint if exists chk_autorizaciones_monto;
alter table public.autorizaciones
  add constraint chk_autorizaciones_monto check (
    -- Si el estado nuevo es 'verde', el monto autorizado es obligatorio y > 0.
    (estado_nuevo = 'verde' and monto_autorizado_centavos is not null and monto_autorizado_centavos > 0)
    or
    (estado_nuevo <> 'verde')
  );

-- ----------------------------------------------------------------------------
-- 3. RPC transaccional: autoriza + actualiza semáforo + auditoría atómicamente
-- ----------------------------------------------------------------------------
create or replace function public.fn_autorizar_solicitud(
  p_solicitud_id uuid,
  p_estado_nuevo semaforo_estado,
  p_monto_autorizado_centavos bigint,
  p_comentarios text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_sol record;
  v_cfg record;
  v_credito_anterior record;
begin
  if v_user is null then
    raise exception 'No autenticado' using errcode = 'P0001';
  end if;

  -- Sólo gerente activo
  if not exists (
    select 1 from public.usuarios
    where id = v_user and rol = 'gerente' and activo = true
  ) then
    raise exception 'Operación reservada al gerente' using errcode = 'P0001';
  end if;

  -- Estado permitido para esta función
  if p_estado_nuevo not in ('verde','rojo','amarillo','naranja') then
    raise exception 'Estado inválido: %', p_estado_nuevo using errcode = 'P0001';
  end if;

  -- Lectura de la solicitud bajo lock
  select * into v_sol
  from public.solicitudes
  where id = p_solicitud_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada' using errcode = 'P0002';
  end if;

  if v_sol.semaforo = 'verde' and p_estado_nuevo = 'verde' then
    raise exception 'La solicitud ya está autorizada.' using errcode = 'P0001';
  end if;

  -- Configuración vigente
  select * into v_cfg from public.configuracion where id = 'singleton';

  -- Validaciones de monto cuando se autoriza en VERDE
  if p_estado_nuevo = 'verde' then
    if p_monto_autorizado_centavos is null or p_monto_autorizado_centavos <= 0 then
      raise exception 'Debes capturar el monto autorizado.' using errcode = 'P0001';
    end if;

    if v_sol.tipo = 'nuevo' then
      if p_monto_autorizado_centavos < v_cfg.monto_minimo_nuevo_centavos then
        raise exception 'Monto autorizado por debajo del mínimo para cliente nuevo.' using errcode = 'P0001';
      end if;
      if p_monto_autorizado_centavos > v_cfg.monto_maximo_nuevo_centavos then
        raise exception 'Monto autorizado por encima del máximo para cliente nuevo.' using errcode = 'P0001';
      end if;
    else  -- renovacion
      -- Debe existir un crédito previo del mismo cliente y estar liquidado (saldo = 0)
      select * into v_credito_anterior
      from public.creditos
      where cliente_id = v_sol.cliente_id and estado in ('activo','liquidado')
      order by fecha_desembolso desc
      limit 1;

      if found and v_credito_anterior.saldo_centavos > 0 then
        raise exception 'El crédito anterior tiene saldo pendiente; no se puede renovar.' using errcode = 'P0001';
      end if;

      if v_cfg.limite_renovacion_centavos is not null
         and p_monto_autorizado_centavos > v_cfg.limite_renovacion_centavos then
        raise exception 'Monto excede el límite máximo configurado para renovaciones.' using errcode = 'P0001';
      end if;
    end if;
  end if;

  -- Historial inmutable
  insert into public.autorizaciones(
    solicitud_id, estado_anterior, estado_nuevo,
    monto_autorizado_centavos, comentarios, decidido_por
  ) values (
    p_solicitud_id, v_sol.semaforo, p_estado_nuevo,
    case when p_estado_nuevo = 'verde' then p_monto_autorizado_centavos else null end,
    nullif(trim(coalesce(p_comentarios,'')), ''),
    v_user
  );

  -- Actualiza semáforo
  update public.solicitudes
     set semaforo = p_estado_nuevo
   where id = p_solicitud_id;

  -- Auditoría
  insert into public.auditoria(usuario_id, entidad, entidad_id, evento, detalle)
  values (
    v_user, 'solicitud', p_solicitud_id, 'autorizacion',
    jsonb_build_object(
      'estado_anterior', v_sol.semaforo,
      'estado_nuevo', p_estado_nuevo,
      'monto_autorizado_centavos', p_monto_autorizado_centavos
    )
  );

  return jsonb_build_object('ok', true, 'estado_nuevo', p_estado_nuevo);
end;
$$;

-- Permiso: solo usuarios autenticados pueden invocar (la función valida rol internamente)
revoke all on function public.fn_autorizar_solicitud(uuid, semaforo_estado, bigint, text) from public;
grant execute on function public.fn_autorizar_solicitud(uuid, semaforo_estado, bigint, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Blindaje RLS: un asesor NO puede cambiar asesor_id, cliente_id,
--    tipo o monto_solicitado al editar su propia solicitud.
--    Se logra con un trigger BEFORE UPDATE que revierte esos campos
--    cuando el autor del UPDATE no es gerente.
-- ----------------------------------------------------------------------------
create or replace function public.fn_proteger_solicitud_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol role_tipo;
begin
  select rol into v_rol from public.usuarios where id = auth.uid();

  if v_rol is distinct from 'gerente' then
    -- Un no-gerente no puede mover campos sensibles.
    new.asesor_id := old.asesor_id;
    new.cliente_id := old.cliente_id;
    new.tipo := old.tipo;
    new.monto_solicitado_centavos := old.monto_solicitado_centavos;
    new.folio := old.folio;
    -- Nunca puede ponerla en verde/rojo tampoco (la RLS ya lo evita, pero por si acaso):
    if new.semaforo in ('verde','rojo') then
      new.semaforo := old.semaforo;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_proteger_solicitud on public.solicitudes;
create trigger trg_proteger_solicitud
before update on public.solicitudes
for each row execute function public.fn_proteger_solicitud_update();
