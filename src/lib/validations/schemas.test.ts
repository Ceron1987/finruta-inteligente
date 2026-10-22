import { describe, expect, it } from 'vitest';
import { autorizacionSchema } from './schemas';

describe('autorizacionSchema', () => {
  const base = { solicitud_id: '00000000-0000-4000-8000-000000000000' };

  it('exige monto > 0 cuando se autoriza en verde', () => {
    const r = autorizacionSchema.safeParse({
      ...base,
      estado_nuevo: 'verde',
      monto_autorizado_centavos: null,
    });
    expect(r.success).toBe(false);
  });

  it('acepta rechazo sin monto', () => {
    const r = autorizacionSchema.safeParse({
      ...base,
      estado_nuevo: 'rojo',
      monto_autorizado_centavos: null,
    });
    expect(r.success).toBe(true);
  });

  it('acepta verde con monto positivo', () => {
    const r = autorizacionSchema.safeParse({
      ...base,
      estado_nuevo: 'verde',
      monto_autorizado_centavos: 900_000,
    });
    expect(r.success).toBe(true);
  });

  it('rechaza monto absurdamente alto', () => {
    const r = autorizacionSchema.safeParse({
      ...base,
      estado_nuevo: 'verde',
      monto_autorizado_centavos: 999_999_999_999,
    });
    expect(r.success).toBe(false);
  });
});
