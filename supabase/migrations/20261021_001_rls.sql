-- ============================================================================
-- FinRuta Inteligente — ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Regla general:
--   - Gerente: lee y escribe TODO.
--   - Asesor:  lee lo suyo (clientes/solicitudes/pagos/visitas asignados),
--              puede CREAR solicitudes y pagos (que quedan como reportados),
--              NO puede autorizar, NO puede conciliar, NO puede modificar
--              configuración ni usuarios ajenos.
--   - La seguridad vive en la DB. No depende de ocultar botones.
-- ============================================================================

-- Habilitar RLS en todas las tablas
alter table public.usuarios        enable row level security;
alter table public.clientes        enable row level security;
alter table public.documentos      enable row level security;
alter table public.solicitudes     enable row level security;
alter table public.evaluaciones    enable row level security;
alter table public.autorizaciones  enable row level security;
alter table public.creditos        enable row level security;
alter table public.pagos           enable row level security;
alter table public.visitas         enable row level security;
alter table public.importaciones   enable row level security;
alter table public.configuracion   enable row level security;
alter table public.auditoria       enable row level security;

-- Helpers
create or replace function public.es_gerente()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid() and rol = 'gerente' and activo = true
  );
$$;

create or replace function public.es_asesor()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid() and rol = 'asesor' and activo = true
  );
$$;

-- ============================================================================
-- USUARIOS
-- ============================================================================
drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios
  for select to authenticated
  using (
    es_gerente() or id = auth.uid()
  );

drop policy if exists usuarios_insert on public.usuarios;
create policy usuarios_insert on public.usuarios
  for insert to authenticated
  with check (es_gerente());

drop policy if exists usuarios_update on public.usuarios;
create policy usuarios_update on public.usuarios
  for update to authenticated
  using (es_gerente() or id = auth.uid())
  with check (
    es_gerente() or (
      id = auth.uid()
      and rol = (select rol from public.usuarios where id = auth.uid())
    )
  );

-- ============================================================================
-- CLIENTES
-- ============================================================================
drop policy if exists clientes_select on public.clientes;
create policy clientes_select on public.clientes
  for select to authenticated
  using (es_gerente() or asesor_id = auth.uid());

drop policy if exists clientes_insert on public.clientes;
create policy clientes_insert on public.clientes
  for insert to authenticated
  with check (
    es_gerente()
    or (es_asesor() and asesor_id = auth.uid())
  );

drop policy if exists clientes_update on public.clientes;
create policy clientes_update on public.clientes
  for update to authenticated
  using (es_gerente() or asesor_id = auth.uid())
  with check (es_gerente() or asesor_id = auth.uid());

-- Solo gerente puede borrar
drop policy if exists clientes_delete on public.clientes;
create policy clientes_delete on public.clientes
  for delete to authenticated
  using (es_gerente());

-- ============================================================================
-- DOCUMENTOS
-- ============================================================================
drop policy if exists documentos_select on public.documentos;
create policy documentos_select on public.documentos
  for select to authenticated
  using (
    es_gerente()
    or exists(select 1 from public.clientes c where c.id = cliente_id and c.asesor_id = auth.uid())
  );

drop policy if exists documentos_insert on public.documentos;
create policy documentos_insert on public.documentos
  for insert to authenticated
  with check (
    es_gerente()
    or exists(select 1 from public.clientes c where c.id = cliente_id and c.asesor_id = auth.uid())
  );

-- ============================================================================
-- SOLICITUDES
-- ============================================================================
drop policy if exists solicitudes_select on public.solicitudes;
create policy solicitudes_select on public.solicitudes
  for select to authenticated
  using (es_gerente() or asesor_id = auth.uid());

drop policy if exists solicitudes_insert on public.solicitudes;
create policy solicitudes_insert on public.solicitudes
  for insert to authenticated
  with check (
    es_gerente()
    or (es_asesor() and asesor_id = auth.uid() and semaforo in ('gris','amarillo','naranja'))
  );

-- IMPORTANTE: el asesor PUEDE editar su solicitud mientras no esté
-- en verde/rojo; NUNCA puede ponerla en verde o rojo (eso es sólo
-- gerente, y pasa por la ruta /api/autorizacion que escribe en
-- autorizaciones + solicitudes atómicamente).
drop policy if exists solicitudes_update on public.solicitudes;
create policy solicitudes_update on public.solicitudes
  for update to authenticated
  using (
    es_gerente()
    or (asesor_id = auth.uid() and semaforo in ('gris','amarillo','naranja'))
  )
  with check (
    es_gerente()
    or (asesor_id = auth.uid() and semaforo in ('gris','amarillo','naranja'))
  );

-- ============================================================================
-- EVALUACIONES
-- ============================================================================
drop policy if exists evaluaciones_rw on public.evaluaciones;
create policy evaluaciones_rw on public.evaluaciones
  for all to authenticated
  using (
    es_gerente()
    or exists(select 1 from public.solicitudes s where s.id = solicitud_id and s.asesor_id = auth.uid())
  )
  with check (
    es_gerente()
    or exists(select 1 from public.solicitudes s where s.id = solicitud_id and s.asesor_id = auth.uid())
  );

-- ============================================================================
-- AUTORIZACIONES
-- SELECT: todos los involucrados ven. INSERT: SOLO gerente.
-- Nunca UPDATE/DELETE (es historial).
-- ============================================================================
drop policy if exists autorizaciones_select on public.autorizaciones;
create policy autorizaciones_select on public.autorizaciones
  for select to authenticated
  using (
    es_gerente()
    or exists(select 1 from public.solicitudes s where s.id = solicitud_id and s.asesor_id = auth.uid())
  );

drop policy if exists autorizaciones_insert on public.autorizaciones;
create policy autorizaciones_insert on public.autorizaciones
  for insert to authenticated
  with check (es_gerente() and decidido_por = auth.uid());

-- ============================================================================
-- CRÉDITOS
-- SELECT: gerente + asesor asignado. INSERT/UPDATE: solo gerente
-- (lo correcto: lo hace la ruta /api que valida reglas y escribe
--  solicitud → autorización → crédito).
-- ============================================================================
drop policy if exists creditos_select on public.creditos;
create policy creditos_select on public.creditos
  for select to authenticated
  using (es_gerente() or asesor_id = auth.uid());

drop policy if exists creditos_insert on public.creditos;
create policy creditos_insert on public.creditos
  for insert to authenticated
  with check (es_gerente());

drop policy if exists creditos_update on public.creditos;
create policy creditos_update on public.creditos
  for update to authenticated
  using (es_gerente())
  with check (es_gerente());

-- ============================================================================
-- PAGOS
-- Asesor PUEDE insertar pagos (quedan como no conciliados).
-- Solo gerente puede conciliar (poner conciliado=true).
-- Nadie modifica el monto después de insertar.
-- ============================================================================
drop policy if exists pagos_select on public.pagos;
create policy pagos_select on public.pagos
  for select to authenticated
  using (es_gerente() or asesor_id = auth.uid());

drop policy if exists pagos_insert on public.pagos;
create policy pagos_insert on public.pagos
  for insert to authenticated
  with check (
    es_gerente()
    or (es_asesor() and asesor_id = auth.uid() and conciliado = false)
  );

drop policy if exists pagos_update on public.pagos;
create policy pagos_update on public.pagos
  for update to authenticated
  using (es_gerente())
  with check (es_gerente());

-- ============================================================================
-- VISITAS
-- ============================================================================
drop policy if exists visitas_select on public.visitas;
create policy visitas_select on public.visitas
  for select to authenticated
  using (es_gerente() or asesor_id = auth.uid());

drop policy if exists visitas_rw on public.visitas;
create policy visitas_rw on public.visitas
  for all to authenticated
  using (es_gerente() or asesor_id = auth.uid())
  with check (es_gerente() or asesor_id = auth.uid());

-- ============================================================================
-- IMPORTACIONES
-- ============================================================================
drop policy if exists importaciones_select on public.importaciones;
create policy importaciones_select on public.importaciones
  for select to authenticated
  using (es_gerente());

drop policy if exists importaciones_insert on public.importaciones;
create policy importaciones_insert on public.importaciones
  for insert to authenticated
  with check (es_gerente() and importado_por = auth.uid());

-- ============================================================================
-- CONFIGURACIÓN
-- Todos leen, solo gerente escribe.
-- ============================================================================
drop policy if exists configuracion_select on public.configuracion;
create policy configuracion_select on public.configuracion
  for select to authenticated
  using (true);

drop policy if exists configuracion_update on public.configuracion;
create policy configuracion_update on public.configuracion
  for update to authenticated
  using (es_gerente())
  with check (es_gerente());

-- ============================================================================
-- AUDITORÍA
-- Solo gerente lee; todos pueden insertar su propio evento.
-- Nadie modifica ni borra.
-- ============================================================================
drop policy if exists auditoria_select on public.auditoria;
create policy auditoria_select on public.auditoria
  for select to authenticated
  using (es_gerente());

drop policy if exists auditoria_insert on public.auditoria;
create policy auditoria_insert on public.auditoria
  for insert to authenticated
  with check (usuario_id = auth.uid());
