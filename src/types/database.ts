/**
 * Tipos de la base de datos.
 *
 * En producción, genera estos tipos con:
 *   npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.ts
 *
 * Este archivo es un stub inicial que coincide con las migraciones de
 * supabase/migrations/. Mantén la generación automatizada después del
 * primer deploy real.
 */

export type RoleTipo = 'gerente' | 'asesor';
export type SemaforoEstado = 'gris' | 'amarillo' | 'naranja' | 'verde' | 'rojo';
export type CreditoEstado = 'activo' | 'liquidado' | 'cancelado' | 'vencido';
export type VisitaEstado = 'programada' | 'completada' | 'ausente' | 'seguimiento';
export type ClienteEstado = 'prospecto' | 'activo' | 'vencido' | 'inactivo';
export type SolicitudTipo = 'nuevo' | 'renovacion';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: RoleTipo;
  zona: string | null;
  activo: boolean;
  color_hex: string | null;
  meta_semanal_centavos: number;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  folio: string;
  nombre: string;
  telefono: string | null;
  giro: string | null;
  direccion: string | null;
  colonia: string | null;
  ciudad: string | null;
  estado_mx: string | null;
  cp: string | null;
  antiguedad_negocio: string | null;
  asesor_id: string | null;
  estado: ClienteEstado;
  lat: number | null;
  lng: number | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Solicitud {
  id: string;
  folio: string;
  cliente_id: string;
  asesor_id: string;
  tipo: SolicitudTipo;
  monto_solicitado_centavos: number;
  destino_uso: string | null;
  semaforo: SemaforoEstado;
  comentarios: string | null;
  created_at: string;
  updated_at: string;
}

export interface Evaluacion {
  id: string;
  solicitud_id: string;
  ventas_diarias_centavos: number | null;
  costo_diario_centavos: number | null;
  gastos_fijos_centavos: number | null;
  otros_compromisos_centavos: number | null;
  flujo_disponible_centavos: number | null;
  capacidad_estimada_pct: number | null;
  datos_faltantes: string[] | null;
  evaluado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface Autorizacion {
  id: string;
  solicitud_id: string;
  estado_anterior: SemaforoEstado | null;
  estado_nuevo: SemaforoEstado;
  monto_autorizado_centavos: number | null;
  comentarios: string | null;
  decidido_por: string;
  created_at: string;
}

export interface Credito {
  id: string;
  folio: string;
  solicitud_id: string;
  cliente_id: string;
  asesor_id: string;
  monto_bruto_centavos: number;
  tarifa_renovacion_centavos: number;
  monto_neto_centavos: number;
  saldo_centavos: number;
  estado: CreditoEstado;
  fecha_desembolso: string;
  desembolsado_por: string | null;
  credito_anterior_id: string | null;
  created_at: string;
}

export interface Pago {
  id: string;
  folio: string;
  credito_id: string;
  cliente_id: string;
  asesor_id: string;
  monto_centavos: number;
  fecha_pago: string;
  reportado_por: string | null;
  conciliado: boolean;
  conciliado_por: string | null;
  conciliado_en: string | null;
  comentarios: string | null;
  created_at: string;
}

export interface Visita {
  id: string;
  cliente_id: string;
  asesor_id: string;
  fecha: string;
  hora_programada: string | null;
  hora_realizada: string | null;
  orden: number | null;
  estado: VisitaEstado;
  resultado: string | null;
  pago_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Configuracion {
  id: 'singleton';
  monto_minimo_nuevo_centavos: number;
  monto_maximo_nuevo_centavos: number;
  incremento_renovacion_centavos: number;
  tarifa_renovacion_centavos: number | null;
  limite_renovacion_centavos: number | null;
  meta_semanal_default_centavos: number;
  regla_comision_json: unknown | null;
  aviso_privacidad_md: string | null;
  updated_at: string;
  updated_by: string | null;
}
