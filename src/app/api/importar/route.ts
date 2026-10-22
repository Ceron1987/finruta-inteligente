/**
 * POST /api/importar
 * Importa cartera masivamente. SOLO gerente.
 *
 * Reglas:
 *   - Cada fila se evalúa y se devuelve con su resultado explícito:
 *     'ok' | 'error' | 'duplicada'. NUNCA se descarta en silencio.
 *   - Duplicados detectados en el SERVIDOR por (telefono normalizado + nombre)
 *     contra la base, y además dentro del mismo lote.
 *   - También se detecta colisión por `folio` si viene en el archivo.
 *   - Se inserta sólo lo marcado como 'ok'; se devuelve el detalle completo
 *     (índice de fila, motivo) para que el usuario vea exactamente qué pasó.
 *   - Escribe registro en `importaciones` con el resumen (JSONB) y evento
 *     en `auditoria`.
 */
import { requireGerente } from '@/lib/auth/current-user';
import { createServerSupabase } from '@/lib/supabase/server';
import { claveCliente, normNombre } from '@/lib/utils/dedup';
import { NextResponse } from 'next/server';

type Fila = Record<string, unknown>;
type Resultado = {
  fila: number; // índice en el archivo (base 1 para el usuario)
  estado: 'ok' | 'error' | 'duplicada';
  motivo?: string;
  folio?: string;
  nombre?: string;
};

export async function POST(req: Request) {
  let user;
  try {
    user = await requireGerente();
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'No autorizado' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const filas: Fila[] = Array.isArray(body?.filas) ? body.filas : [];
  const archivo_nombre: string = String(body?.archivo_nombre ?? 'cartera.xlsx');

  if (filas.length === 0) {
    return NextResponse.json({ error: 'No hay filas para importar.' }, { status: 400 });
  }
  if (filas.length > 5000) {
    return NextResponse.json(
      { error: 'Máximo 5000 filas por importación. Divide el archivo.' },
      { status: 400 },
    );
  }

  const supabase = createServerSupabase();

  // Cache: asesores por correo (sólo activos)
  const { data: asesores } = await supabase
    .from('usuarios')
    .select('id, correo')
    .eq('rol', 'asesor')
    .eq('activo', true);
  const asesorByCorreo = new Map<string, string>(
    (asesores ?? []).map((a: any) => [normNombre(a.correo), a.id as string]),
  );

  // Catálogo existente para detectar duplicados contra la base
  const { data: existentes } = await supabase.from('clientes').select('folio, nombre, telefono');
  const existentesKey = new Set(
    (existentes ?? []).map((c: any) => claveCliente(c.nombre, c.telefono)),
  );
  const existentesFolio = new Set((existentes ?? []).map((c: any) => String(c.folio).toLowerCase()));

  // Para detectar duplicados DENTRO del mismo lote
  const seenLote = new Set<string>();
  const seenFolioLote = new Set<string>();

  const resultados: Resultado[] = [];
  const inserts: any[] = [];

  filas.forEach((raw, i) => {
    const idx = i + 1;
    const nombre = String(raw.nombre ?? '').trim();
    const folio = String(raw.folio ?? '').trim();
    const telefono = String(raw.telefono ?? '').trim();

    if (!nombre) {
      resultados.push({ fila: idx, estado: 'error', motivo: 'Falta nombre', folio });
      return;
    }

    const key = claveCliente(nombre, telefono);

    if (folio && existentesFolio.has(folio.toLowerCase())) {
      resultados.push({ fila: idx, estado: 'duplicada', motivo: 'Folio ya existe', folio, nombre });
      return;
    }
    if (folio && seenFolioLote.has(folio.toLowerCase())) {
      resultados.push({ fila: idx, estado: 'duplicada', motivo: 'Folio repetido en el archivo', folio, nombre });
      return;
    }
    if (existentesKey.has(key)) {
      resultados.push({ fila: idx, estado: 'duplicada', motivo: 'Cliente ya existe (nombre + teléfono)', folio, nombre });
      return;
    }
    if (seenLote.has(key)) {
      resultados.push({ fila: idx, estado: 'duplicada', motivo: 'Cliente repetido en el archivo', folio, nombre });
      return;
    }

    // Asesor opcional por correo
    const asesorCorreo = normNombre(raw.asesor_correo);
    let asesor_id: string | null = null;
    if (asesorCorreo) {
      asesor_id = asesorByCorreo.get(asesorCorreo) ?? null;
      if (!asesor_id) {
        resultados.push({
          fila: idx,
          estado: 'error',
          motivo: `Asesor con correo "${asesorCorreo}" no existe o no está activo`,
          folio,
          nombre,
        });
        return;
      }
    }

    const folioFinal = folio || `C-${Date.now()}-${idx}`;
    inserts.push({
      folio: folioFinal,
      nombre,
      telefono: telefono || null,
      giro: String(raw.giro ?? '').trim() || null,
      direccion: String(raw.direccion ?? '').trim() || null,
      colonia: String(raw.colonia ?? '').trim() || null,
      antiguedad_negocio: String(raw.antiguedad_negocio ?? '').trim() || null,
      asesor_id,
      estado: 'prospecto' as const,
      created_by: user.perfil.id,
    });
    existentesKey.add(key);
    seenLote.add(key);
    if (folio) {
      existentesFolio.add(folio.toLowerCase());
      seenFolioLote.add(folio.toLowerCase());
    }
    resultados.push({ fila: idx, estado: 'ok', folio: folioFinal, nombre });
  });

  // Inserción real (si hay algo válido)
  let inserted = 0;
  if (inserts.length) {
    const { error } = await supabase.from('clientes').insert(inserts);
    if (error) {
      return NextResponse.json(
        {
          error: 'Error insertando en base: ' + error.message,
          resumen: {
            total: filas.length,
            ok: 0,
            error: resultados.filter((r) => r.estado === 'error').length,
            duplicadas: resultados.filter((r) => r.estado === 'duplicada').length,
          },
          resultados,
        },
        { status: 500 },
      );
    }
    inserted = inserts.length;
  }

  const ok = inserted;
  const errores = resultados.filter((r) => r.estado === 'error').length;
  const duplicadas = resultados.filter((r) => r.estado === 'duplicada').length;

  await supabase.from('importaciones').insert({
    archivo_nombre,
    filas_total: filas.length,
    filas_ok: ok,
    filas_error: errores,
    filas_duplicadas: duplicadas,
    resumen: resultados, // detalle fila por fila en JSONB
    importado_por: user.perfil.id,
  });

  await supabase.from('auditoria').insert({
    usuario_id: user.perfil.id,
    entidad: 'importacion',
    evento: 'importar_cartera',
    detalle: { archivo_nombre, total: filas.length, ok, errores, duplicadas },
  });

  return NextResponse.json({
    ok,
    errores,
    duplicadas,
    total: filas.length,
    resultados,
  });
}
