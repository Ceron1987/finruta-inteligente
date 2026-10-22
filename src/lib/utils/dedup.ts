/**
 * Normalizadores de clave usados por la importación de cartera para
 * detectar duplicados de manera determinista.
 * Separado para que se pueda probar en unitarios sin tocar Supabase.
 */

export function normNombre(s: unknown): string {
  return String(s ?? '').trim().toLowerCase();
}

export function normTelefono(s: unknown): string {
  return String(s ?? '').replace(/\D/g, '');
}

/** Clave compuesta: teléfono normalizado + nombre normalizado. */
export function claveCliente(nombre: unknown, telefono: unknown): string {
  return `${normTelefono(telefono)}|${normNombre(nombre)}`;
}
