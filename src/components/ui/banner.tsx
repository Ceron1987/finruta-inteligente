import { cn } from '@/lib/utils/cn';

type Tone = 'cyan' | 'amber' | 'rose' | 'slate';

const TONE: Record<Tone, string> = {
  cyan: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-100',
  amber: 'border-amber-500/30 bg-amber-500/5 text-amber-100',
  rose: 'border-rose-500/30 bg-rose-500/5 text-rose-100',
  slate: 'border-slate-700 bg-slate-900/50 text-slate-200',
};

export function Banner({
  tone = 'cyan',
  title,
  children,
}: {
  tone?: Tone;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('p-3 rounded-xl border text-sm', TONE[tone])}>
      <div className="font-semibold">{title}</div>
      {children ? <div className="text-xs text-slate-400 mt-0.5">{children}</div> : null}
    </div>
  );
}
