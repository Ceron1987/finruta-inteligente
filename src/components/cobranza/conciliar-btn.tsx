'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function ConciliarBtn({ pagoId }: { pagoId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  async function go() {
    start(async () => {
      const res = await fetch('/api/pagos/conciliar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pago_id: pagoId }),
      });
      if (res.ok) router.refresh();
    });
  }
  return (
    <button onClick={go} disabled={pending} className="btn btn-ghost text-xs">
      {pending ? 'Conciliando…' : 'Conciliar'}
    </button>
  );
}
