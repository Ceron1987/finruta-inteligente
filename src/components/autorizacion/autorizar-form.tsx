'use client';
import { centavos } from '@/lib/utils/format';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function AutorizarForm({
  solicitudId,
  montoSolicitadoCentavos,
}: {
  solicitudId: string;
  montoSolicitadoCentavos: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [montoPesos, setMontoPesos] = useState(montoSolicitadoCentavos / 100);
  const [comentarios, setComentarios] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function decidir(estado: 'verde' | 'rojo') {
    setError(null);
    const monto_autorizado_centavos = estado === 'verde' ? Math.round(montoPesos * 100) : null;
    startTransition(async () => {
      const res = await fetch('/api/autorizacion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          solicitud_id: solicitudId,
          estado_nuevo: estado,
          monto_autorizado_centavos,
          comentarios,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? 'Error al autorizar');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        disabled={pending}
        onClick={() => decidir('verde')}
        className="btn btn-primary"
      >
        ✓ Autorizar
      </button>
      <button
        disabled={pending}
        onClick={() => decidir('rojo')}
        className="btn btn-danger"
      >
        ✗ Rechazar
      </button>
      <input
        type="number"
        className="w-40"
        value={montoPesos}
        onChange={(e) => setMontoPesos(Number(e.target.value))}
        placeholder="Monto autorizado (MXN)"
      />
      <input
        className="flex-1 min-w-[200px]"
        value={comentarios}
        onChange={(e) => setComentarios(e.target.value)}
        placeholder="Comentarios…"
      />
      {error ? <div className="w-full text-xs text-rose-300">{error}</div> : null}
      <div className="w-full text-[11px] text-slate-500">
        Al autorizar en VERDE se registrará con tu nombre, fecha y hora. Monto propuesto:{' '}
        {centavos.toMXN(montoSolicitadoCentavos)}.
      </div>
    </div>
  );
}
