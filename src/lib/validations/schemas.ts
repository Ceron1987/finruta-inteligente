/**
 * Esquemas Zod — validación compartida cliente ↔ servidor.
 * Todos los montos en centavos.
 */
import { z } from 'zod';

export const semaforoSchema = z.enum(['gris', 'amarillo', 'naranja', 'verde', 'rojo']);

export const clienteCreateSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido').max(120),
  telefono: z
    .string()
    .min(10, 'Teléfono inválido')
    .max(20)
    .regex(/^[\d\s()+-]+$/, 'Caracteres no válidos')
    .optional()
    .or(z.literal('')),
  giro: z.string().max(80).optional().or(z.literal('')),
  direccion: z.string().max(240).optional().or(z.literal('')),
  colonia: z.string().max(80).optional().or(z.literal('')),
  antiguedad_negocio: z.string().max(40).optional().or(z.literal('')),
  asesor_id: z.string().uuid().optional().nullable(),
});
export type ClienteCreateInput = z.infer<typeof clienteCreateSchema>;

export const solicitudCreateSchema = z.object({
  cliente_id: z.string().uuid(),
  tipo: z.enum(['nuevo', 'renovacion']),
  monto_solicitado_centavos: z.number().int().positive(),
  destino_uso: z.string().max(240).optional().or(z.literal('')),
  comentarios: z.string().max(500).optional().or(z.literal('')),
});
export type SolicitudCreateInput = z.infer<typeof solicitudCreateSchema>;

export const evaluacionSchema = z.object({
  solicitud_id: z.string().uuid(),
  ventas_diarias_centavos: z.number().int().nonnegative().nullable(),
  costo_diario_centavos: z.number().int().nonnegative().nullable(),
  gastos_fijos_centavos: z.number().int().nonnegative().nullable(),
  otros_compromisos_centavos: z.number().int().nonnegative().nullable(),
  capacidad_estimada_pct: z.number().int().min(0).max(200).nullable(),
  datos_faltantes: z.array(z.string()).default([]),
});

export const autorizacionSchema = z
  .object({
    solicitud_id: z.string().uuid(),
    estado_nuevo: z.enum(['verde', 'rojo', 'naranja', 'amarillo']),
    monto_autorizado_centavos: z.number().int().positive().nullable(),
    comentarios: z.string().max(500).optional().or(z.literal('')),
  })
  .refine(
    (v) => v.estado_nuevo !== 'verde' || (v.monto_autorizado_centavos ?? 0) > 0,
    { message: 'Si autorizas en VERDE, debes capturar un monto autorizado positivo.', path: ['monto_autorizado_centavos'] },
  )
  // Tope absoluto defensivo (10 millones MXN) para evitar errores de tecleo
  // tipo "escribí 1300000 pero quería 13000". El servidor valida de nuevo
  // contra la configuración vigente.
  .refine(
    (v) => v.monto_autorizado_centavos === null || v.monto_autorizado_centavos <= 1_000_000_000,
    { message: 'Monto autorizado inverosímilmente alto.', path: ['monto_autorizado_centavos'] },
  );
export type AutorizacionInput = z.infer<typeof autorizacionSchema>;

export const pagoCreateSchema = z.object({
  credito_id: z.string().uuid(),
  monto_centavos: z.number().int().positive(),
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  comentarios: z.string().max(240).optional().or(z.literal('')),
});
export type PagoCreateInput = z.infer<typeof pagoCreateSchema>;

export const conciliarPagoSchema = z.object({
  pago_id: z.string().uuid(),
});
