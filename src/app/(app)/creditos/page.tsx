import { SimuladorRenovacion } from '@/components/creditos/simulador-renovacion';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty';
import { KPI } from '@/components/ui/kpi';
import { createServerSupabase } from '@/lib/supabase/server';
import { centavos, fechaMX } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function CreditosPage() {
  const supabase = createServerSupabase();

  const [{ data: creditos }, { data: config }] = await Promise.all([
    supabase
      .from('creditos')
      .select('*, clientes(nombre)')
      .order('fecha_desembolso', { ascending: false })
      .limit(100),
    supabase.from('configuracion').select('*').eq('id', 'singleton').single(),
  ]);

  const activos = (creditos ?? []).filter((c: any) => c.estado === 'activo').length;
  const total = (creditos ?? []).reduce((s: number, c: any) => s + Number(c.monto_bruto_centavos), 0);
  const elegibles = (creditos ?? []).filter((c: any) => Number(c.saldo_centavos) === 0).length;

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <KPI title="Créditos activos" value={activos} />
        <KPI title="Monto colocado total" value={centavos.toMXN(total)} />
        <KPI
          title="Renovaciones elegibles"
          value={elegibles}
          subtitle="crédito anterior liquidado"
        />
      </div>

      <SimuladorRenovacion
        incrementoDefaultCentavos={config?.incremento_renovacion_centavos ?? 300_000}
        tarifaConfiguradaCentavos={config?.tarifa_renovacion_centavos ?? null}
      />

      {!creditos || creditos.length === 0 ? (
        <EmptyState title="Sin créditos registrados" icon="💳" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head bg-slate-900/60">
                <th className="text-left px-4 py-3">Folio</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-right px-4 py-3">Monto bruto</th>
                <th className="text-right px-4 py-3">Tarifa</th>
                <th className="text-right px-4 py-3">Neto</th>
                <th className="text-right px-4 py-3">Saldo</th>
                <th className="text-left px-4 py-3">Desembolso</th>
                <th className="text-left px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {creditos.map((c: any) => (
                <tr key={c.id} className="border-t border-border/60 hover:bg-cyan-500/5">
                  <td className="px-4 py-3 font-mono text-xs">{c.folio}</td>
                  <td className="px-4 py-3 font-medium">{c.clientes?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{centavos.toMXN(c.monto_bruto_centavos)}</td>
                  <td className="px-4 py-3 text-right text-slate-400">
                    {Number(c.tarifa_renovacion_centavos) > 0
                      ? centavos.toMXN(c.tarifa_renovacion_centavos)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">{centavos.toMXN(c.monto_neto_centavos)}</td>
                  <td
                    className={`px-4 py-3 text-right ${
                      Number(c.saldo_centavos) > 0 ? 'text-amber-300' : 'text-emerald-300'
                    }`}
                  >
                    {centavos.toMXN(c.saldo_centavos)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fechaMX(c.fecha_desembolso)}</td>
                  <td className="px-4 py-3 capitalize">{c.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
