import { Banner } from '@/components/ui/banner';
import { SemaforoChip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty';
import { KPI } from '@/components/ui/kpi';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createServerSupabase } from '@/lib/supabase/server';
import { centavos, pct } from '@/lib/utils/format';
import { SEMAFORO, SEMAFORO_FLUJO } from '@/lib/utils/semaforo';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const u = await getCurrentUser();
  if (!u) return null;
  const supabase = createServerSupabase();
  const esGerente = u.perfil.rol === 'gerente';

  // Rango: semana actual (lunes 00:00 → hoy)
  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay(); // 0=Sun .. 1=Mon
  const diff = (day === 0 ? -6 : 1 - day);
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const semanaISO = monday.toISOString();

  // Filtros según rol (RLS lo refuerza en DB, aquí es sólo para contar)
  const filtroAsesor = esGerente ? {} : { asesor_id: u.perfil.id };

  // --- Consultas en paralelo ---
  const [
    asesoresQ,
    solicitudesQ,
    creditosQ,
    pagosQ,
    visitasQ,
    configQ,
  ] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, nombre, color_hex, meta_semanal_centavos, zona')
      .eq('rol', 'asesor')
      .eq('activo', true),
    supabase
      .from('solicitudes')
      .select('id, semaforo, asesor_id, created_at')
      .match(filtroAsesor),
    supabase
      .from('creditos')
      .select('id, asesor_id, estado, monto_bruto_centavos, saldo_centavos, fecha_desembolso')
      .match(filtroAsesor),
    supabase
      .from('pagos')
      .select('id, asesor_id, monto_centavos, conciliado, fecha_pago')
      .gte('fecha_pago', monday.toISOString().slice(0, 10))
      .match(filtroAsesor),
    supabase
      .from('visitas')
      .select('id, asesor_id, estado, fecha')
      .gte('fecha', monday.toISOString().slice(0, 10))
      .match(filtroAsesor),
    supabase.from('configuracion').select('*').eq('id', 'singleton').single(),
  ]);

  const asesores = asesoresQ.data ?? [];
  const solicitudes = solicitudesQ.data ?? [];
  const creditos = creditosQ.data ?? [];
  const pagos = pagosQ.data ?? [];
  const visitas = visitasQ.data ?? [];
  const config = configQ.data;

  // --- Métricas ---
  const colocadoSemana = creditos
    .filter((c) => c.fecha_desembolso >= monday.toISOString().slice(0, 10))
    .reduce((s, c) => s + Number(c.monto_bruto_centavos), 0);
  const metaSemana = asesores.reduce((s, a) => s + Number(a.meta_semanal_centavos || 0), 0) ||
    (config?.meta_semanal_default_centavos ?? 0) * (esGerente ? asesores.length : 1);

  const cobradoSemana = pagos.reduce((s, p) => s + Number(p.monto_centavos), 0);
  const conciliadoSemana = pagos.filter((p) => p.conciliado).reduce((s, p) => s + Number(p.monto_centavos), 0);

  const creditosActivos = creditos.filter((c) => c.estado === 'activo').length;
  const creditosLiquidados = creditos.filter((c) => c.saldo_centavos === 0).length;

  const semBuckets: Record<string, number> = {};
  SEMAFORO_FLUJO.forEach((s) => (semBuckets[s] = 0));
  solicitudes.forEach((s) => (semBuckets[s.semaforo] = (semBuckets[s.semaforo] ?? 0) + 1));

  // Por asesor (sólo gerente): colocación y cobranza de la semana
  const porAsesor = asesores.map((a) => {
    const col = creditos
      .filter((c) => c.asesor_id === a.id && c.fecha_desembolso >= monday.toISOString().slice(0, 10))
      .reduce((s, c) => s + Number(c.monto_bruto_centavos), 0);
    const cob = pagos
      .filter((p) => p.asesor_id === a.id)
      .reduce((s, p) => s + Number(p.monto_centavos), 0);
    return { ...a, colocado: col, cobrado: cob };
  });

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPI
          title="Colocación semana"
          value={centavos.toMXN(colocadoSemana)}
          subtitle={`Meta ${centavos.toMXN(metaSemana)}`}
          pct={pct(colocadoSemana, metaSemana)}
        />
        <KPI
          title="Cobranza registrada"
          value={centavos.toMXN(cobradoSemana)}
          subtitle={`Conciliada ${centavos.toMXN(conciliadoSemana)}`}
        />
        <KPI
          title="Solicitudes activas"
          value={solicitudes.length}
          subtitle={`${semBuckets.naranja} pend. autorizar`}
        />
        <KPI
          title="Créditos activos"
          value={creditosActivos}
          subtitle={`${creditosLiquidados} liquidados`}
        />
      </div>

      {esGerente ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
          <div className="card p-5 xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Desempeño por asesor</h3>
              <span className="text-xs text-slate-500">semana en curso</span>
            </div>
            {porAsesor.length === 0 ? (
              <EmptyState title="Sin asesores activos" description="Agrega asesores en Usuarios y roles." />
            ) : (
              <div className="space-y-4">
                {porAsesor.map((a) => {
                  const p = pct(a.colocado, Number(a.meta_semanal_centavos || 1));
                  return (
                    <div key={a.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="dot" style={{ background: a.color_hex ?? '#22d3ee' }} />
                          <span className="font-medium">{a.nombre}</span>
                          {a.zona ? (
                            <span className="text-slate-500 text-xs">· {a.zona}</span>
                          ) : null}
                        </div>
                        <div className="text-slate-400 text-xs">
                          Colocó{' '}
                          <span className="text-white font-semibold">
                            {centavos.toMXN(a.colocado)}
                          </span>{' '}
                          · Cobró{' '}
                          <span className="text-emerald-300 font-semibold">
                            {centavos.toMXN(a.cobrado)}
                          </span>
                        </div>
                      </div>
                      <div className="bar">
                        <span style={{ width: `${Math.min(p, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold mb-4">Semáforo de solicitudes</h3>
            <div className="space-y-3">
              {SEMAFORO_FLUJO.map((s) => (
                <div key={s} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`dot ${SEMAFORO[s].dot}`} />
                    <span className="text-sm">{SEMAFORO[s].label}</span>
                  </div>
                  <span className="font-semibold">{semBuckets[s]}</span>
                </div>
              ))}
            </div>
            <div className="h-px bg-border my-4" />
            <div className="text-xs text-slate-500">
              La autorización final siempre la realiza el{' '}
              <span className="text-brand-cyan font-semibold">Gerente</span>.
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Visitas de hoy</h3>
            <span className="text-xs text-slate-500">
              {visitas.filter((v) => v.estado === 'completada').length} completadas /{' '}
              {visitas.length} programadas
            </span>
          </div>
          {visitas.length === 0 ? (
            <EmptyState title="Sin visitas registradas" icon="🗺️" description="Programa visitas desde Rutas y visitas." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {visitas.slice(0, 8).map((v) => (
                <li key={v.id} className="py-2 flex items-center justify-between">
                  <span className="text-slate-300">Visita {v.id.slice(0, 8)}</span>
                  <span className="text-xs text-slate-500 capitalize">{v.estado}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-3">Avisos del sistema</h3>
          <div className="space-y-2 text-sm">
            {!config?.tarifa_renovacion_centavos ? (
              <Banner tone="amber" title="Tarifa de renovación pendiente">
                La financiera no ha confirmado el importe. El sistema no la aplica automáticamente.
              </Banner>
            ) : null}
            <Banner tone="cyan" title="Rutas en modo demo">
              Para rutas reales se requiere API key de mapas (Mapbox o Google), configurada como
              variable de entorno en el servidor.
            </Banner>
            {!config?.regla_comision_json ? (
              <Banner tone="slate" title="Reglas de comisión pendientes">
                No hay porcentajes capturados. Las comisiones se muestran como estimadas sin monto.
              </Banner>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
