import { SemaforoChip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty';
import { PendienteBtn } from '@/components/ui/pendiente';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createServerSupabase } from '@/lib/supabase/server';
import { centavos, fechaMX } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function SolicitudesPage() {
  const u = await getCurrentUser();
  if (!u) return null;
  const supabase = createServerSupabase();

  const [{ data: solicitudes }, { data: config }] = await Promise.all([
    supabase
      .from('solicitudes')
      .select(
        'id, folio, tipo, monto_solicitado_centavos, semaforo, created_at, cliente_id, asesor_id, clientes(nombre), usuarios:asesor_id(nombre)',
      )
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('configuracion').select('*').eq('id', 'singleton').single(),
  ]);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-400">
          Captura la prevaluación y envía al gerente para autorización.
        </div>
        <PendienteBtn
          label="+ Nueva solicitud"
          variant="primary"
          motivo="Formulario de prevaluación (11 campos: ventas diarias, costos, flujo, destino, etc.) pendiente de construir. Ya existen la tabla, la validación y las políticas RLS."
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 card p-5">
          <h3 className="font-semibold mb-4">Solicitudes en curso</h3>
          {!solicitudes || solicitudes.length === 0 ? (
            <EmptyState title="Sin solicitudes todavía" icon="📝" />
          ) : (
            <div className="space-y-2">
              {solicitudes.map((s: any) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-border hover:border-brand-cyan/40 transition flex items-center gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{s.folio}</span>
                      <span className="font-medium">{s.clientes?.nombre ?? '—'}</span>
                      <span className="chip bg-slate-800 border border-border text-slate-300 capitalize">
                        {s.tipo}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Asesor: {s.usuarios?.nombre ?? '—'} · {fechaMX(s.created_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{centavos.toMXN(s.monto_solicitado_centavos)}</div>
                    <div className="text-xs text-slate-500">solicitado</div>
                  </div>
                  <SemaforoChip estado={s.semaforo} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-3">Reglas comerciales actuales</h3>
          <div className="space-y-2 text-sm">
            <Row k="Monto mínimo nuevo" v={centavos.toMXN(config?.monto_minimo_nuevo_centavos ?? 0)} />
            <Row k="Monto máximo nuevo" v={centavos.toMXN(config?.monto_maximo_nuevo_centavos ?? 0)} />
            <Row k="Incremento renovación" v={`+${centavos.toMXN(config?.incremento_renovacion_centavos ?? 0)}`} />
            <Row
              k="Tarifa renovación"
              v={config?.tarifa_renovacion_centavos ? centavos.toMXN(config.tarifa_renovacion_centavos) : 'Pendiente'}
              amber={!config?.tarifa_renovacion_centavos}
            />
            <Row
              k="Límite máximo renov."
              v={config?.limite_renovacion_centavos ? centavos.toMXN(config.limite_renovacion_centavos) : 'Pendiente'}
              amber={!config?.limite_renovacion_centavos}
            />
          </div>
          <div className="h-px bg-border my-4" />
          <div className="text-xs text-slate-500">
            🔒 Un asesor jamás pone solicitudes en{' '}
            <b className="text-emerald-300">VERDE</b> por su cuenta. La autorización final es del
            gerente.
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ k, v, amber }: { k: string; v: string; amber?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{k}</span>
      <span className={`font-semibold ${amber ? 'text-amber-300' : ''}`}>{v}</span>
    </div>
  );
}
