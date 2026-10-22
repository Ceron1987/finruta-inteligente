/**
 * POST /api/autorizacion
 * Autoriza o rechaza una solicitud. SOLO gerente activo.
 *
 * Delega el trabajo a la función SQL `fn_autorizar_solicitud` (ver
 * supabase/migrations/20261021_003_hardening.sql), que ejecuta
 * ATÓMICAMENTE:
 *   1. Verifica rol gerente activo (defensa en profundidad).
 *   2. Lee la solicitud con FOR UPDATE (evita race conditions).
 *   3. Valida límites de monto según política (nuevo / renovación).
 *   4. Inserta en autorizaciones (historial inmutable).
 *   5. Actualiza semaforo en solicitudes.
 *   6. Escribe evento en auditoria.
 * Todo bajo la misma transacción Postgres: si cualquiera falla, nada se
 * aplica. No existe el estado inconsistente "autorizado sin registro"
 * o "sin auditoría".
 */
import { requireGerente } from '@/lib/auth/current-user';
import { createServerSupabase } from '@/lib/supabase/server';
import { autorizacionSchema } from '@/lib/validations/schemas';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    await requireGerente();
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'No autorizado' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = autorizacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', detalles: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createServerSupabase();
  const { solicitud_id, estado_nuevo, monto_autorizado_centavos, comentarios } = parsed.data;

  const { data, error } = await supabase.rpc('fn_autorizar_solicitud', {
    p_solicitud_id: solicitud_id,
    p_estado_nuevo: estado_nuevo,
    p_monto_autorizado_centavos: monto_autorizado_centavos ?? null,
    p_comentarios: comentarios || null,
  });

  if (error) {
    // Las excepciones de la función llegan como error.message legible.
    const status = error.code === 'P0002' ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ ok: true, ...(data ?? {}) });
}
