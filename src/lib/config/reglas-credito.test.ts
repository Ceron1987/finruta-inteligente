import { describe, expect, it } from 'vitest';
import { calcularRenovacion, validarMontoNuevo, validarRenovacion } from './reglas-credito';

describe('validarMontoNuevo', () => {
  const cfg = { monto_minimo_nuevo_centavos: 700_000, monto_maximo_nuevo_centavos: 1_000_000 };

  it('acepta 7000 (mínimo exacto)', () => {
    expect(validarMontoNuevo(700_000, cfg).ok).toBe(true);
  });
  it('acepta 10000 (máximo exacto)', () => {
    expect(validarMontoNuevo(1_000_000, cfg).ok).toBe(true);
  });
  it('rechaza 6999 por debajo del mínimo', () => {
    const r = validarMontoNuevo(699_900, cfg);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('mínimo');
  });
  it('rechaza 10001 por encima del máximo', () => {
    const r = validarMontoNuevo(1_000_100, cfg);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('máximo');
  });
});

describe('validarRenovacion', () => {
  const cfg = { limite_renovacion_centavos: null as number | null };

  it('rechaza si hay saldo pendiente', () => {
    const r = validarRenovacion(1_300_000, 50_000, cfg);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('liquidado');
  });
  it('acepta cuando crédito anterior está en 0', () => {
    expect(validarRenovacion(1_300_000, 0, cfg).ok).toBe(true);
  });
  it('rechaza si excede el límite configurado', () => {
    expect(validarRenovacion(2_000_000, 0, { limite_renovacion_centavos: 1_500_000 }).ok).toBe(false);
  });
});

describe('calcularRenovacion', () => {
  it('calcula bruto y neto con tarifa definida', () => {
    const r = calcularRenovacion(1_000_000, 300_000, 40_000);
    expect(r.bruto).toBe(1_300_000);
    expect(r.tarifa).toBe(40_000);
    expect(r.neto).toBe(1_260_000); // 12,600
    expect(r.tarifa_definida).toBe(true);
  });
  it('cuando tarifa es null, neto = bruto y marca tarifa_definida=false', () => {
    const r = calcularRenovacion(1_000_000, 300_000, null);
    expect(r.bruto).toBe(1_300_000);
    expect(r.neto).toBe(1_300_000);
    expect(r.tarifa_definida).toBe(false);
  });
});
