export function KPI({
  title,
  value,
  subtitle,
  pct,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  pct?: number;
}) {
  return (
    <div className="kpi">
      <div className="text-xs text-slate-400 uppercase tracking-wider">{title}</div>
      <div className="text-3xl font-bold mt-2 text-white">{value}</div>
      {subtitle ? <div className="text-xs text-slate-500 mt-1">{subtitle}</div> : null}
      {typeof pct === 'number' ? (
        <>
          <div className="bar mt-3">
            <span style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <div className="text-[10px] text-slate-500 mt-1">{pct}% de la meta</div>
        </>
      ) : null}
    </div>
  );
}
