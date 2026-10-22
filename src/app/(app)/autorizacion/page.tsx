import { AutorizarForm } from '@/components/autorizacion/autorizar-form';
import { SemaforoChip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createServerSupabase } from '@/lib/supabase/server';
import { centavos } from '@/lib/utils/format';
import { SEMAFORO, SEMAFORO_FLUJO } from '@/lib/utils/semaforo';

export const dynamic = 'force-dynamic';

export default async function AutorizacionPage() {
  const u = await getCurrentUser();
  if (!u) return null;
  const supabase = createServerSupabase();

  const [{ data: pendientes }, { data: all }] = await Promise.all([
    supabase
      .from('solicitudes')
      .select(
        'id, folio, tipo, monto_solicitado_centavos, semaforo, created_at, clientes(nombre, giro), usuarios:asesor_id(nombre), evaluaciones(ventas_diarias_centavos, flujo_disponible_centavos, capacidad_estimada_pct)',
      )
      .in('semaforo', ['naranja', 'amarillo'])
      .order('created_at', { ascending: true }),
    supabase.from('solicitudes').select('semaforo'),
  ]);

  const buckets = Object.fromEntries(SEMAFORO_FLUJO.map((s) => [s, 0])) as Record<string, number>;
  (all ?? []).forEach((s) => (buckets[s.semaforo] = (buckets[s.semaforo] ?? 0) + 1));

  const esGerente = u.perfil.rol === 'gerente';

  return (
    <>
      <div className="grid grid-cols-5 gap-3 mb-6">
        {SEMAFORO_FLUJO.map((st) => {
          const m = SEMAFORO[st];
          return (
            <div key={st} className="card p-4">
              <div className="flex items-center justify-between">
                <span className={`chip ${m.bg} ${m.fg}`}>
                  <span className={`dot ${m.dot}`} />
                  {m.label}
                </span>
                <span className="text-2xl font-bold">{buckets[st] ?? 0}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">
            Bandeja de autorización{' '}
            {!esGerente ? (
              <span className="text-xs text-slate-500 font-normal">
                (sólo lectura — tu rol no autoriza)
              </span>
            ) : null}
          </h3>
        </div>

        {!pendientes || pendientes.length === 0 ? (
          <EmptyState title="No hay solicitudes pendientes" icon="✅" />
        ) : (
          <div className="space-y-3">
            {pendientes.map((s: any) => (
              <div key={s.id} className="p-4 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold">{s.clientes?.nombre ?? '—'}</div>
                    <div className="text-xs text-slate-500">
                      {s.folio} · {s.tipo} · {s.usuarios?.nombre ?? '—'} ·{' '}
                      {s.clientes?.giro ?? '—'}
                    </div>
                  </div>
                  <SemaforoChip estado={s.semaforo} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-3">
                  <Field label="Monto solicitado" value={centavos.toMXN(s.monto_solicitado_centavos)} bold />
                  <Field
                    label="Ventas diarias"
                    value={centavos.toMXN(s.evaluaciones?.[0]?.ventas_diarias_centavos ?? null)}
                  />
                  <Field
                    label="Flujo disponible"
                    value={centavos.toMXN(s.evaluaciones?.[0]?.flujo_disponible_centavos ?? null)}
                    tone="emerald"
                  />
                  <Field
                    label="Capacidad est."
                    value={
                      s.evaluaciones?.[0]?.capacidad_estimada_pct != null
                        ? `${s.evaluaciones[0].capacidad_estimada_pct}%`
                        : '—'
                    }
                  />
                  <Field
                    label="Evaluación"
                    value={s.evaluaciones?.length ? 'Capturada' : 'Pendiente'}
                    tone={s.evaluaciones?.length ? 'emerald' : 'amber'}
                  />
                </div>

                {esGerente ? (
                  <AutorizarForm
                    solicitudId={s.id}
                    montoSolicitadoCentavos={Number(s.monto_solicitado_centavos)}
                  />
                ) : (
                  <div className="text-xs text-slate-500">Esperando decisión del gerente.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Field({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: 'emerald' | 'amber' }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-300' : tone === 'amber' ? 'text-amber-300' : '';
  return (
    <div>
      <label>{label}</label>
      <div className={`${bold ? 'font-semibold' : ''} ${toneClass}`}>{value}</div>
    </div>
  );
}
