import type { SemaforoEstado } from '@/types/database';

export const SEMAFORO: Record<
  SemaforoEstado,
  { label: string; bg: string; fg: string; dot: string }
> = {
  gris: {
    label: 'Prospecto',
    bg: 'bg-slate-500/15',
    fg: 'text-slate-300',
    dot: 'bg-slate-400',
  },
  amarillo: {
    label: 'En captura',
    bg: 'bg-amber-500/15',
    fg: 'text-amber-200',
    dot: 'bg-amber-400',
  },
  naranja: {
    label: 'Pend. autorización',
    bg: 'bg-orange-500/15',
    fg: 'text-orange-200',
    dot: 'bg-orange-400',
  },
  verde: {
    label: 'Autorizado',
    bg: 'bg-emerald-500/15',
    fg: 'text-emerald-200',
    dot: 'bg-emerald-400',
  },
  rojo: {
    label: 'Rechazado',
    bg: 'bg-rose-500/15',
    fg: 'text-rose-200',
    dot: 'bg-rose-500',
  },
};

export const SEMAFORO_FLUJO: SemaforoEstado[] = ['gris', 'amarillo', 'naranja', 'verde', 'rojo'];
