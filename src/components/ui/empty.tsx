export function EmptyState({
  title,
  description,
  icon = '📭',
}: {
  title: string;
  description?: string;
  icon?: string;
}) {
  return (
    <div className="card p-10 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="font-semibold text-white">{title}</div>
      {description ? <div className="text-xs text-slate-500 mt-1">{description}</div> : null}
    </div>
  );
}
