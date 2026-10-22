import { describe, expect, it } from 'vitest';
import { claveCliente, normNombre, normTelefono } from './dedup';

describe('normTelefono', () => {
  it('conserva solo dígitos', () => {
    expect(normTelefono('442 782 8924')).toBe('4427828924');
    expect(normTelefono('+52 (442) 123-4567')).toBe('524421234567');
    expect(normTelefono('  — vacío —  ')).toBe('');
    expect(normTelefono(undefined)).toBe('');
  });
});

describe('normNombre', () => {
  it('aplica trim + lowercase', () => {
    expect(normNombre('  María LÓPEZ ')).toBe('maría lópez');
  });
});

describe('claveCliente', () => {
  it('detecta mismo cliente aunque teléfono venga con formato distinto', () => {
    const a = claveCliente('María López', '442-782-8924');
    const b = claveCliente('maría lópez', '4427828924');
    expect(a).toBe(b);
  });

  it('distingue clientes distintos', () => {
    expect(claveCliente('María López', '4421111111')).not.toBe(
      claveCliente('María López', '4422222222'),
    );
  });

  it('no agrupa dos clientes distintos con teléfonos vacíos', () => {
    // Nota: cuando ambos están sin teléfono, el nombre decide; es correcto
    // que dos "Juan Pérez" sin teléfono se consideren duplicado — el usuario
    // debe limpiar el archivo. Aquí probamos que nombres distintos NO colisionan.
    const a = claveCliente('Juan Pérez', '');
    const b = claveCliente('Pedro Pérez', '');
    expect(a).not.toBe(b);
  });
});
