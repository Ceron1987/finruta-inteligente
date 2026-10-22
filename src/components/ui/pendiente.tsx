'use client';
import { cn } from '@/lib/utils/cn';

/**
 * Botón visualmente deshabilitado para funcionalidades que todavía NO
 * están implementadas. Muestra el motivo en un alert simple al hacer clic
 * (en vez de parecer que "no hace nada", que es peor UX).
 *
 * NUNCA uses esto para esconder una función que SÍ existe; su propósito
 * es ser honesto con el usuario sobre lo que falta construir.
 */
export function PendienteBtn({
  label,
  motivo,
  className,
  variant = 'ghost',
}: {
  label: string;
  motivo: string;
  className?: string;
  variant?: 'ghost' | 'primary';
}) {
  return (
    <button
      type="button"
      title={`Pendiente — ${motivo}`}
      aria-disabled="true"
      onClick={() => alert(`⏳ Pendiente de implementar\n\n${motivo}`)}
      className={cn(
        variant === 'primary' ? 'btn btn-primary' : 'btn btn-ghost',
        'opacity-60 cursor-not-allowed relative',
        className,
      )}
    >
      {label}
      <span className="chip bg-slate-700/60 text-slate-300 border border-border text-[10px] ml-1">
        pendiente
      </span>
    </button>
  );
}

export function PendienteBadge({ children = 'pendiente' }: { children?: React.ReactNode }) {
  return (
    <span className="chip bg-slate-700/60 text-slate-300 border border-border text-[10px]">
      {children}
    </span>
  );
}
