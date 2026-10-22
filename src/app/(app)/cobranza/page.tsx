import { ConciliarBtn } from '@/components/cobranza/conciliar-btn';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty';
import { KPI } from '@/components/ui/kpi';
import { PendienteBtn } from '@/components/ui/pendiente';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createServerSupabase } from '@/lib/supabase/server';
import { centavos, fechaMX, pct } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function CobranzaPage() {
  const u = await getCurrentUser();
  if (!u) return null;
  const supabase = createServerSupabase();

  const { data: pagos } = await supabase
    .from('pagos')
    .select('*, clientes(nombre), usuarios:asesor_id(nombre)')
    .order('fecha_pago', { ascending: false })
    .limit(100);

  const total = (pagos ?? []).reduce((s: number, p: any) => s + Number(p.monto_centavos), 0);
  const conc = (pagos ?? [])
    .filter((p: any) => p.conciliado)
    .reduce((s: number, p: any) => s + Number(p.monto_centavos), 0);

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <KPI title="Registrado (reciente)" value={centavos.toMXN(total)} />
        <KPI
          title="Conciliado por gerente"
          value={centavos.toMXN(conc)}
          subtitle={`${pct(conc, total)}% del registrado`}
        />
        <KPI title="Pendiente de conciliar" value={centavos.toMXN(total - conc)} />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">Movimientos de cobranza</h3>
          <PendienteBtn
            label="+ Registrar pago"
            variant="primary"
            motivo="Formulario de registro de pago pendiente. Para el MVP, los pagos entran por seed/importación y la conciliación (gerente) sí es funcional."
          />
        </div>

        {!pagos || pagos.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Sin pagos registrados" icon="💰" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head bg-slate-900/40">
                <th className="text-left px-4 py-3">Folio</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Asesor</th>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-right px-4 py-3">Monto</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pagos.map((p: any) => (
                <tr key={p.id} className="border-t border-border/60 hover:bg-cyan-500/5">
                  <td className="px-4 py-3 font-mono text-xs">{p.folio}</td>
                  <td className="px-4 py-3">{p.clientes?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{p.usuarios?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fechaMX(p.fecha_pago)}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {centavos.toMXN(p.monto_centavos)}
                  </td>
                  <td className="px-4 py-3">
                    {p.conciliado ? (
                      <Chip className="bg-emerald-500/15 text-emerald-200">Conciliado</Chip>
                    ) : (
                      <Chip className="bg-amber-500/15 text-amber-200">Pendiente</Chip>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!p.conciliado && u.perfil.rol === 'gerente' ? (
                      <ConciliarBtn pagoId={p.id} />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="text-xs text-slate-500 mt-3">
        Un pago REPORTADO por el asesor no cuenta como oficial hasta que el gerente lo CONCILIA.
        Las cifras del tablero separan ambos conceptos.
      </div>
    </>
  );
}
