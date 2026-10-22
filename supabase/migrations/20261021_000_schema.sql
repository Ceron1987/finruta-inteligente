-- ============================================================================
-- FinRuta Inteligente — ESQUEMA BASE
-- Fecha: 2026-10-21
-- Autor: Fix-Ya Tech
-- ----------------------------------------------------------------------------
-- Convenciones:
--   - Todas las tablas en schema public.
--   - uuid v4 como PK por defecto.
--   - created_at/updated_at con zona horaria.
--   - FKs con ON DELETE RESTRICT por defecto (nada se borra en cascada
--     sin pensarlo; los registros oficiales no desaparecen silenciosamente).
--   - Montos en centavos (bigint) para evitar errores de redondeo:
--     $1,000.00 MXN = 100000.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
-- pg_trgm se usa para búsqueda difusa de clientes por nombre.
-- Debe crearse ANTES del índice GIN que usa gin_trgm_ops (más abajo).
create extension if not exists pg_trgm;

-- -----------------------------------------------------------------
-- Tipos ENUM
-- -----------------------------------------------------------------
create type role_tipo as enum ('gerente', 'asesor');

create type semaforo_estado as enum (
  'gris',      -- prospecto
  'amarillo',  -- en captura / información incompleta
  'naranja',   -- expediente completo, pendiente de decisión del gerente
  'verde',     -- autorizado
  'rojo'       -- rechazado
);

create type credito_estado as enum ('activo', 'liquidado', 'cancelado', 'vencido');
create type visita_estado as enum ('programada', 'completada', 'ausente', 'seguimiento');
create type cliente_estado as enum ('prospecto', 'activo', 'vencido', 'inactivo');
create type solicitud_tipo as enum ('nuevo', 'renovacion');

-- -----------------------------------------------------------------
-- USUARIOS (perfil extendido de auth.users)
-- -----------------------------------------------------------------
create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  correo text not null unique,
  rol role_tipo not null default 'asesor',
  zona text,
  activo boolean not null default true,
  color_hex text default '#22d3ee',
  meta_semanal_centavos bigint default 3000000, -- $30,000 MXN
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_usuarios_rol on public.usuarios(rol);
create index idx_usuarios_activo on public.usuarios(activo);

-- -----------------------------------------------------------------
-- CLIENTES
-- -----------------------------------------------------------------
create table public.clientes (
  id uuid primary key default uuid_generate_v4(),
  folio text not null unique,          -- ej. C-1001
  nombre text not null,
  telefono text,
  giro text,
  direccion text,
  colonia text,
  ciudad text default 'Querétaro',
  estado_mx text default 'Querétaro',
  cp text,
  antiguedad_negocio text,             -- ej. "5 años"
  asesor_id uuid references public.usuarios(id) on delete set null,
  estado cliente_estado not null default 'prospecto',
  lat double precision,
  lng double precision,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios(id) on delete set null
);
create index idx_clientes_asesor on public.clientes(asesor_id);
create index idx_clientes_estado on public.clientes(estado);
create index idx_clientes_folio on public.clientes(folio);
-- Para búsqueda difusa (pg_trgm ya se creó al inicio del archivo):
create index idx_clientes_nombre_trgm on public.clientes using gin (nombre gin_trgm_ops);

-- -----------------------------------------------------------------
-- DOCUMENTOS DEL EXPEDIENTE
-- Los archivos físicos viven en Supabase Storage (bucket privado
-- "expedientes"); aquí sólo guardamos el metadato.
-- -----------------------------------------------------------------
create table public.documentos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  tipo text not null,                  -- 'ine_frente', 'ine_reverso', 'comprobante_domicilio', 'foto_negocio', 'otro'
  storage_path text not null,          -- 'expedientes/{cliente_id}/{uuid}.jpg'
  nombre_original text,
  mime_type text,
  tamano_bytes bigint,
  subido_por uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_documentos_cliente on public.documentos(cliente_id);

-- -----------------------------------------------------------------
-- SOLICITUDES DE CRÉDITO
-- -----------------------------------------------------------------
create table public.solicitudes (
  id uuid primary key default uuid_generate_v4(),
  folio text not null unique,          -- ej. S-2001
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  asesor_id uuid not null references public.usuarios(id) on delete restrict,
  tipo solicitud_tipo not null,
  monto_solicitado_centavos bigint not null check (monto_solicitado_centavos > 0),
  destino_uso text,
  semaforo semaforo_estado not null default 'gris',
  comentarios text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_solicitudes_asesor on public.solicitudes(asesor_id);
create index idx_solicitudes_cliente on public.solicitudes(cliente_id);
create index idx_solicitudes_semaforo on public.solicitudes(semaforo);

-- -----------------------------------------------------------------
-- EVALUACIÓN PRELIMINAR DEL NEGOCIO
-- Una por solicitud. Todos los montos en centavos.
-- -----------------------------------------------------------------
create table public.evaluaciones (
  id uuid primary key default uuid_generate_v4(),
  solicitud_id uuid not null unique references public.solicitudes(id) on delete cascade,
  ventas_diarias_centavos bigint,
  costo_diario_centavos bigint,
  gastos_fijos_centavos bigint,
  otros_compromisos_centavos bigint,
  flujo_disponible_centavos bigint,
  capacidad_estimada_pct int check (capacidad_estimada_pct between 0 and 200),
  datos_faltantes text[],
  evaluado_por uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------
-- AUTORIZACIONES
-- Historial completo. Nunca se borra. Cada cambio de semáforo
-- genera un registro con quién, cuándo, estado anterior y monto.
-- -----------------------------------------------------------------
create table public.autorizaciones (
  id uuid primary key default uuid_generate_v4(),
  solicitud_id uuid not null references public.solicitudes(id) on delete restrict,
  estado_anterior semaforo_estado,
  estado_nuevo semaforo_estado not null,
  monto_autorizado_centavos bigint,
  comentarios text,
  decidido_por uuid not null references public.usuarios(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index idx_autorizaciones_solicitud on public.autorizaciones(solicitud_id);

-- -----------------------------------------------------------------
-- CRÉDITOS DESEMBOLSADOS
-- Se crean cuando el gerente autoriza Y se registra el desembolso.
-- -----------------------------------------------------------------
create table public.creditos (
  id uuid primary key default uuid_generate_v4(),
  folio text not null unique,              -- ej. CR-3001
  solicitud_id uuid not null references public.solicitudes(id) on delete restrict,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  asesor_id uuid not null references public.usuarios(id) on delete restrict,
  monto_bruto_centavos bigint not null,
  tarifa_renovacion_centavos bigint default 0,  -- pendiente de política
  monto_neto_centavos bigint not null,
  saldo_centavos bigint not null,
  estado credito_estado not null default 'activo',
  fecha_desembolso date not null default current_date,
  desembolsado_por uuid references public.usuarios(id) on delete set null,
  credito_anterior_id uuid references public.creditos(id) on delete set null,  -- para renovaciones
  created_at timestamptz not null default now()
);
create index idx_creditos_cliente on public.creditos(cliente_id);
create index idx_creditos_asesor on public.creditos(asesor_id);
create index idx_creditos_estado on public.creditos(estado);

-- -----------------------------------------------------------------
-- PAGOS / COBRANZA
-- Un pago puede ser REPORTADO por un asesor y luego CONCILIADO por
-- el gerente. Hasta la conciliación no suma a cifras oficiales.
-- -----------------------------------------------------------------
create table public.pagos (
  id uuid primary key default uuid_generate_v4(),
  folio text not null unique,              -- ej. P-4001
  credito_id uuid not null references public.creditos(id) on delete restrict,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  asesor_id uuid not null references public.usuarios(id) on delete restrict,
  monto_centavos bigint not null check (monto_centavos > 0),
  fecha_pago date not null default current_date,
  reportado_por uuid references public.usuarios(id) on delete set null,
  conciliado boolean not null default false,
  conciliado_por uuid references public.usuarios(id) on delete set null,
  conciliado_en timestamptz,
  comentarios text,
  created_at timestamptz not null default now()
);
create index idx_pagos_credito on public.pagos(credito_id);
create index idx_pagos_conciliado on public.pagos(conciliado);
create index idx_pagos_fecha on public.pagos(fecha_pago);

-- -----------------------------------------------------------------
-- VISITAS Y RUTAS
-- -----------------------------------------------------------------
create table public.visitas (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  asesor_id uuid not null references public.usuarios(id) on delete restrict,
  fecha date not null default current_date,
  hora_programada time,
  hora_realizada time,
  orden int,                            -- orden dentro de la ruta del día
  estado visita_estado not null default 'programada',
  resultado text,
  pago_id uuid references public.pagos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_visitas_asesor_fecha on public.visitas(asesor_id, fecha);
create index idx_visitas_estado on public.visitas(estado);

-- -----------------------------------------------------------------
-- IMPORTACIONES DE CARTERA
-- Registro de cada archivo cargado y su resultado.
-- -----------------------------------------------------------------
create table public.importaciones (
  id uuid primary key default uuid_generate_v4(),
  archivo_nombre text not null,
  archivo_bytes bigint,
  filas_total int not null default 0,
  filas_ok int not null default 0,
  filas_error int not null default 0,
  filas_duplicadas int not null default 0,
  resumen jsonb,                        -- detalle fila-por-fila opcional
  importado_por uuid not null references public.usuarios(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------
-- CONFIGURACIÓN GLOBAL (reglas de crédito, metas, comisiones)
-- Una sola fila (id='singleton').
-- -----------------------------------------------------------------
create table public.configuracion (
  id text primary key default 'singleton' check (id = 'singleton'),
  monto_minimo_nuevo_centavos bigint not null default 700000,     -- $7,000
  monto_maximo_nuevo_centavos bigint not null default 1000000,    -- $10,000
  incremento_renovacion_centavos bigint not null default 300000,  -- +$3,000
  tarifa_renovacion_centavos bigint,                              -- PENDIENTE
  limite_renovacion_centavos bigint,                              -- PENDIENTE
  meta_semanal_default_centavos bigint not null default 3000000,  -- $30,000
  regla_comision_json jsonb,                                      -- PENDIENTE
  aviso_privacidad_md text,                                       -- Pendiente de redactar
  updated_at timestamptz not null default now(),
  updated_by uuid references public.usuarios(id) on delete set null
);

-- -----------------------------------------------------------------
-- AUDITORÍA / BITÁCORA
-- Todo evento crítico escribe aquí. Nunca se borra.
-- -----------------------------------------------------------------
create table public.auditoria (
  id bigserial primary key,
  usuario_id uuid references public.usuarios(id) on delete set null,
  entidad text not null,                -- 'solicitud', 'credito', 'pago', ...
  entidad_id uuid,
  evento text not null,                 -- 'autorizar', 'conciliar', 'importar', 'login'...
  detalle jsonb,
  created_at timestamptz not null default now()
);
create index idx_auditoria_usuario on public.auditoria(usuario_id);
create index idx_auditoria_entidad on public.auditoria(entidad, entidad_id);
create index idx_auditoria_fecha on public.auditoria(created_at desc);

-- -----------------------------------------------------------------
-- TRIGGER: updated_at automático
-- -----------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare r record;
begin
  for r in
    select table_name
    from information_schema.columns
    where table_schema='public' and column_name='updated_at'
  loop
    execute format(
      'drop trigger if exists trg_touch_%I on public.%I;
       create trigger trg_touch_%I before update on public.%I
       for each row execute function public.touch_updated_at();',
      r.table_name, r.table_name, r.table_name, r.table_name
    );
  end loop;
end$$;

-- -----------------------------------------------------------------
-- Fila singleton de configuración (se crea vacía con valores base)
-- -----------------------------------------------------------------
insert into public.configuracion (id) values ('singleton')
on conflict (id) do nothing;
