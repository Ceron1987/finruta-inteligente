/**
 * Reglas de crédito — fuente de verdad para validaciones client + server.
 *
 * Los valores por defecto coinciden con las migraciones:
 *   Monto mínimo nuevo: $7,000 MXN
 *   Monto máximo nuevo: $10,000 MXN
 *   Incremento renovación: +$3,000 MXN
 *
 * En runtime se SOBRESCRIBEN con la fila `configuracion` de la DB —
 * jamás hardcodear tarifas o límites que la financiera no ha confirmado.
 */
import type { Configuracion } from '@/types/database';

export const REGLAS_DEFAULT = {
  monto_minimo_nuevo_centavos: 700_000,
  monto_maximo_nuevo_centavos: 1_000_000,
  incremento_renovacion_centavos: 300_000,
  tarifa_renovacion_centavos: null as number | null, // PENDIENTE
  limite_renovacion_centavos: null as number | null, // PENDIENTE
  meta_semanal_default_centavos: 3_000_000,
} as const;

export function validarMontoNuevo(
  montoCentavos: number,
  cfg: Pick<Configuracion, 'monto_minimo_nuevo_centavos' | 'monto_maximo_nuevo_centavos'>,
): { ok: boolean; error?: string } {
  if (montoCentavos < cfg.monto_minimo_nuevo_centavos) {
    return {
      ok: false,
      error: `El monto mínimo para cliente nuevo es ${fmtCents(cfg.monto_minimo_nuevo_centavos)}.`,
    };
  }
  if (montoCentavos > cfg.monto_maximo_nuevo_centavos) {
    return {
      ok: false,
      error: `El monto máximo para cliente nuevo es ${fmtCents(cfg.monto_maximo_nuevo_centavos)}.`,
    };
  }
  return { ok: true };
}

export function validarRenovacion(
  montoCentavos: number,
  saldoAnteriorCentavos: number,
  cfg: Pick<Configuracion, 'limite_renovacion_centavos'>,
): { ok: boolean; error?: string } {
  if (saldoAnteriorCentavos > 0) {
    return {
      ok: false,
      error: 'El crédito anterior debe estar liquidado al 100% antes de autorizar una renovación.',
    };
  }
  if (cfg.limite_renovacion_centavos && montoCentavos > cfg.limite_renovacion_centavos) {
    return {
      ok: false,
      error: `El monto excede el límite máximo configurado para renovaciones (${fmtCents(cfg.limite_renovacion_centavos)}).`,
    };
  }
  return { ok: true };
}

export function calcularRenovacion(
  montoAnteriorCentavos: number,
  incrementoCentavos: number,
  tarifaCentavos: number | null,
): {
  bruto: number;
  tarifa: number | null;
  neto: number;
  tarifa_definida: boolean;
} {
  const bruto = montoAnteriorCentavos + incrementoCentavos;
  const tarifa = tarifaCentavos ?? null;
  const neto = tarifa === null ? bruto : bruto - tarifa;
  return { bruto, tarifa, neto, tarifa_definida: tarifa !== null };
}

function fmtCents(c: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(c / 100);
}
