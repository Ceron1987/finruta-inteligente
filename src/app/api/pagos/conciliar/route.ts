/**
 * POST /api/pagos/conciliar
 * Marca un pago como conciliado. SOLO gerente.
 * Escribe timestamp, quién concilió y evento de auditoría.
 */
import { requireGerente } from '@/lib/auth/current-user';
import { createServerSupabase } from '@/lib/supabase/server';
import { conciliarPagoSchema } from '@/lib/validations/schemas';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  let user;
  try {
    user = await requireGerente();
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'No autorizado' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = conciliarPagoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { error } = await supabase
    .from('pagos')
    .update({
      conciliado: true,
      conciliado_por: user.perfil.id,
      conciliado_en: new Date().toISOString(),
    })
    .eq('id', parsed.data.pago_id)
    .eq('conciliado', false); // idempotente

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('auditoria').insert({
    usuario_id: user.perfil.id,
    entidad: 'pago',
    entidad_id: parsed.data.pago_id,
    evento: 'conciliar',
    detalle: null,
  });

  return NextResponse.json({ ok: true });
}
