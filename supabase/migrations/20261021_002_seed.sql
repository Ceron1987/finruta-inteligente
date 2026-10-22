-- ============================================================================
-- FinRuta Inteligente — SEED (datos ficticios para probar el MVP)
-- ----------------------------------------------------------------------------
-- Este seed asume que ya creaste los usuarios en Supabase Auth:
--   gerente@finruta.mx
--   ana@finruta.mx
--   luis@finruta.mx
--   marco@finruta.mx
--   sofia@finruta.mx
-- Copia los UUIDs reales de auth.users y pégalos en las variables de abajo.
-- Si prefieres, ejecuta esto después de iniciar sesión al menos una vez con
-- cada cuenta: entonces los perfiles se auto-crean con el trigger de abajo.
-- NO guardes datos personales reales aquí.
-- ============================================================================

-- Trigger: cuando se crea un auth.users, crea su fila en public.usuarios
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.usuarios (id, nombre, correo, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'rol')::role_tipo, 'asesor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Datos de prueba (sólo si no hay clientes todavía)
-- ----------------------------------------------------------------------------
do $$
declare
  v_asesor uuid;
  v_count int;
begin
  select count(*) into v_count from public.clientes;
  if v_count > 0 then
    raise notice 'Ya hay clientes, skip seed.';
    return;
  end if;

  -- Toma el primer asesor que exista; si no hay, no sembramos clientes.
  select id into v_asesor from public.usuarios where rol = 'asesor' limit 1;
  if v_asesor is null then
    raise notice 'Primero crea los usuarios en Auth. Skip seed de clientes.';
    return;
  end if;

  insert into public.clientes (folio, nombre, telefono, giro, direccion, colonia, antiguedad_negocio, asesor_id, estado) values
    ('C-1001', 'María López',    '4421234567', 'Abarrotes',   'Av. Hidalgo 123',   'Centro',             '8 años',  v_asesor, 'activo'),
    ('C-1002', 'Jorge Pérez',    '4422345678', 'Papelería',   'Calle Juárez 45',   'La Cruz',            '3 años',  v_asesor, 'activo'),
    ('C-1003', 'Lucía Mendoza',  '4423456789', 'Tortillería', 'Priv. Reforma 9',   'San Pedrito',        '12 años', v_asesor, 'activo'),
    ('C-1004', 'Pedro Castro',   '4424567890', 'Ferretería',  'Blvd. Zaragoza 212','El Carmen',          '6 años',  v_asesor, 'prospecto'),
    ('C-1005', 'Rosa Jiménez',   '4425678901', 'Cremería',    'Av. Universidad 88','Lomas de San Pedro', '4 años',  v_asesor, 'activo');

  -- Solicitud de ejemplo
  insert into public.solicitudes (folio, cliente_id, asesor_id, tipo, monto_solicitado_centavos, destino_uso, semaforo)
  select 'S-2001', c.id, v_asesor, 'nuevo', 800000, 'Compra de inventario', 'naranja'
  from public.clientes c where c.folio = 'C-1001' limit 1;

  raise notice 'Seed listo con 5 clientes y 1 solicitud ejemplo.';
end$$;
