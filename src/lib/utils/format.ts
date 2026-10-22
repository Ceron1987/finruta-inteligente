/**
 * Utilidades de formateo. Todos los montos se guardan en centavos (bigint)
 * y sólo se convierten para presentación.
 */

const MXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const MXN_CENTS = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

export const centavos = {
  /** centavos (bigint/number) → "$1,234" (sin decimales) */
  toMXN(c: number | bigint | null | undefined): string {
    if (c === null || c === undefined) return '—';
    const n = typeof c === 'bigint' ? Number(c) : c;
    return MXN.format(n / 100);
  },
  /** centavos → "$1,234.56" */
  toMXNFull(c: number | bigint | null | undefined): string {
    if (c === null || c === undefined) return '—';
    const n = typeof c === 'bigint' ? Number(c) : c;
    return MXN_CENTS.format(n / 100);
  },
  /** pesos (número decimal) → centavos (entero) */
  fromPesos(p: number): number {
    return Math.round(p * 100);
  },
};

export function pct(n: number, total: number): number {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

export function fechaMX(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function fechaHoraMX(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
