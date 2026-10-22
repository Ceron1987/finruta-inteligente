import { createServerSupabase } from '@/lib/supabase/server';
import { fechaHoraMX } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function ReportesPage() {
  const supabase = createServerSupabase();
  const { data: auditoria } = await supabase
    .from('auditoria')
    .select('*, usuarios:usuario_id(nombre)')
    .order('created_at', { ascending: false })
    .limit(50);

  const tiles = [
    ['Colocación diaria', 'Última semana', '#22d3ee'],
    ['Cobranza por asesor', 'Semana en curso', '#34d399'],
    ['Vencimientos', 'Próximos 7 días', '#fb923c'],
    ['Autorizaciones', 'Mes en curso', '#a78bfa'],
    ['Renovaciones', 'Mes en curso', '#22d3ee'],
    ['Importaciones', 'Historial', '#64748b'],
  ] as const;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {tiles.map(([t, s, c]) => (
          <div
            key={t}
            className="card p-5 hover:border-cyan-500/40 transition cursor-pointer"
            title={`${t} — reporte en construcción`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{t}</h3>
              <span className="dot" style={{ background: c }} />
            </div>
            <div className="text-xs text-slate-500">{s}</div>
            <div className="h-px bg-border my-3" />
            <div className="text-xs text-cyan-300">Reporte detallado — pendiente de construcción</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-3">Historial de auditoría</h3>
        {!auditoria || auditoria.length === 0 ? (
          <div className="text-xs text-slate-500">
            Sin eventos todavía — autorizar, conciliar o importar genera historial.
          </div>
        ) : (
          <div className="space-y-1 text-sm max-h-[400px] overflow-y-auto scrollbar">
            {auditoria.map((a: any) => (
              <div key={a.id} className="flex gap-3 py-2 border-b border-border/60">
                <span className="text-xs font-mono text-slate-500 w-40">{fechaHoraMX(a.created_at)}</span>
                <span className="text-xs text-brand-cyan w-32 truncate">{a.usuarios?.nombre ?? '—'}</span>
                <span className="text-xs text-slate-400 w-32">{a.entidad}</span>
                <span className="text-xs text-slate-300 w-32">{a.evento}</span>
                <span className="text-xs flex-1 text-slate-400 truncate">
                  {a.detalle ? JSON.stringify(a.detalle) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
