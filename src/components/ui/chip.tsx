import { cn } from '@/lib/utils/cn';
import { SEMAFORO } from '@/lib/utils/semaforo';
import type { SemaforoEstado } from '@/types/database';

export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn('chip', className)}>{children}</span>;
}

export function SemaforoChip({ estado }: { estado: SemaforoEstado }) {
  const m = SEMAFORO[estado];
  return (
    <span className={cn('chip', m.bg, m.fg)}>
      <span className={cn('dot', m.dot)} />
      {m.label}
    </span>
  );
}
