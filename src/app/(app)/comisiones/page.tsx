import { Banner } from '@/components/ui/banner';
import { createServerSupabase } from '@/lib/supabase/server';
import { centavos, pct } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function ComisionesPage() {
  const supabase = createServerSupabase();
  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(0, 0, 0, 0);
  const mondayStr = monday.toISOString().slice(0, 10);

  const [{ data: asesores }, { data: creditos }, { data: pagos }, { data: config }] =
    await Promise.all([
      supabase
        .from('usuarios')
        .select('id, nombre, color_hex, meta_semanal_centavos, zona')
        .eq('rol', 'asesor')
        .eq('activo', true),
      supabase.from('creditos').select('asesor_id, monto_bruto_centavos, fecha_desembolso').gte('fecha_desembolso', mondayStr),
      supabase.from('pagos').select('asesor_id, monto_centavos, conciliado, fecha_pago').gte('fecha_pago', mondayStr),
      supabase.from('configuracion').select('regla_comision_json').eq('id', 'singleton').single(),
    ]);

  const filas = (asesores ?? []).map((a: any) => {
    const col = (creditos ?? [])
      .filter((c: any) => c.asesor_id === a.id)
      .reduce((s: number, c: any) => s + Number(c.monto_bruto_centavos), 0);
    const cob = (pagos ?? [])
      .filter((p: any) => p.asesor_id === a.id && p.conciliado)
      .reduce((s: number, p: any) => s + Number(p.monto_centavos), 0);
    return { ...a, col, cob };
  });

  return (
    <>
      {!config?.regla_comision_json ? (
        <div className="mb-4">
          <Banner tone="amber" title="⚠ Reglas de comisión pendientes">
            No se asignan porcentajes por el sistema. El gerente / la financiera deben capturarlas
            en Configuración.
          </Banner>
        </div>
      ) : null}

      <div className="card overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head bg-slate-900/60">
              <th className="text-left px-4 py-3">Asesor</th>
              <th className="text-right px-4 py-3">Colocación (sem)</th>
              <th className="text-right px-4 py-3">Cobranza conciliada</th>
              <th className="text-right px-4 py-3">Meta</th>
              <th className="text-right px-4 py-3">% Meta</th>
              <th className="text-right px-4 py-3">Comisión estimada</th>
              <th className="text-right px-4 py-3">Comisión confirmada</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((a: any) => {
              const p = pct(a.col, Number(a.meta_semanal_centavos || 1));
              return (
                <tr key={a.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">
                    <span className="dot mr-2" style={{ background: a.color_hex ?? '#22d3ee' }} />
                    {a.nombre}
                    {a.zona ? <span className="text-xs text-slate-500 ml-1">· {a.zona}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right">{centavos.toMXN(a.col)}</td>
                  <td className="px-4 py-3 text-right">{centavos.toMXN(a.cob)}</td>
                  <td className="px-4 py-3 text-right text-slate-400">
                    {centavos.toMXN(a.meta_semanal_centavos)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      p >= 100 ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {p}%
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">—</td>
                  <td className="px-4 py-3 text-right text-slate-500">—</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-slate-500">
        Cada indicador explica su origen: <b>colocación</b> = créditos con fecha de desembolso en
        la semana en curso; <b>cobranza</b> = pagos CONCILIADOS por el gerente;{' '}
        <b>comisiones</b> = pendientes de política.
      </div>
    </>
  );
}
