import { Banner } from '@/components/ui/banner';
import { PendienteBtn } from '@/components/ui/pendiente';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function RutasPage() {
  const supabase = createServerSupabase();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data: visitas } = await supabase
    .from('visitas')
    .select('*, clientes(nombre, direccion, lat, lng), usuarios:asesor_id(nombre)')
    .eq('fecha', hoy)
    .order('orden', { ascending: true });

  // IMPORTANTE: Mientras la geocodificación, el cálculo de ruta y la
  // persistencia del orden optimizado NO estén implementados ni cubiertos
  // por pruebas, este módulo se mantiene marcado como DEMO sin importar
  // la configuración. El banner desaparece recién cuando exista código
  // real que: (1) geocodifique direcciones a lat/lng,
  // (2) calcule la ruta óptima con un proveedor (Mapbox/Google),
  // (3) persista el orden en visitas.orden,
  // y existan pruebas que lo validen.
  const demoPermanente = true;

  return (
    <>
      <div className="mb-4">
        <Banner tone="amber" title="⚠ MODO DEMO · rutas no están optimizadas con datos reales">
          El mapa de abajo es ilustrativo. La geocodificación de direcciones, el cálculo de ruta
          optimizada y la persistencia del orden están PENDIENTES de implementar y probar
          (requiere Mapbox o Google Maps + código y pruebas que lo exploten). No tomes decisiones
          logísticas basadas en esta vista.
        </Banner>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 card overflow-hidden min-h-[460px] grid-bg relative">
          <svg viewBox="0 0 600 460" className="w-full h-full">
            <defs>
              <linearGradient id="g1" x1="0" x2="1">
                <stop offset="0" stopColor="#06b6d4" stopOpacity=".4" />
                <stop offset="1" stopColor="#10b981" stopOpacity=".4" />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke="url(#g1)"
              strokeWidth="3"
              strokeDasharray="6 4"
              points="80,80 180,140 280,110 360,220 440,180 520,300 360,360 220,320 120,380"
            />
            {[
              [80, 80, '1'],
              [180, 140, '2'],
              [280, 110, '3'],
              [360, 220, '4'],
              [440, 180, '5'],
              [520, 300, '6'],
              [360, 360, '7'],
              [220, 320, '8'],
              [120, 380, '9'],
            ].map(([x, y, n]) => (
              <g key={n as string}>
                <circle cx={x as number} cy={y as number} r="14" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
                <text
                  x={x as number}
                  y={(y as number) + 4}
                  textAnchor="middle"
                  fill="#22d3ee"
                  fontSize="11"
                  fontWeight="700"
                >
                  {n}
                </text>
              </g>
            ))}
          </svg>
          <div className="absolute top-3 left-3 flex gap-2">
            <PendienteBtn label="Hoy ▾" motivo="Filtros de fecha pendientes de implementar." />
            <PendienteBtn label="Asesor ▾" motivo="Filtros por asesor pendientes de implementar." />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="chip bg-slate-900/80 text-amber-200 border border-amber-500/40 px-3 py-1 text-[11px]">
              DEMO · ruta no calculada
            </span>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-3">Visitas de hoy</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar text-sm">
            {!visitas || visitas.length === 0 ? (
              <div className="text-xs text-slate-500">Sin visitas programadas para hoy.</div>
            ) : (
              visitas.map((v: any, i: number) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-900/60"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-border flex items-center justify-center text-xs font-bold text-cyan-300">
                    {v.orden ?? i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{v.clientes?.nombre ?? '—'}</div>
                    <div className="text-xs text-slate-500">
                      {v.hora_programada ?? '—'} · {v.usuarios?.nombre ?? '—'}
                    </div>
                  </div>
                  <span className="chip bg-slate-700/40 text-slate-300 capitalize">{v.estado}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* reservado: cuando demoPermanente sea false y haya geocoding real */}
      {demoPermanente ? null : null}
    </>
  );
}
