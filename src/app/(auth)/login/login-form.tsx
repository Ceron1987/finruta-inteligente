'use client';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/dashboard';
  const motivo = sp.get('motivo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    motivo === 'inactivo'
      ? 'Tu cuenta está marcada como inactiva. Contacta a tu gerente para reactivarla.'
      : null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-green flex items-center justify-center text-slate-950 font-black text-xl shadow-cyan">
              FR
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold tracking-tight">
                FinRuta <span className="text-brand-cyan">Inteligente</span>
              </h1>
              <p className="text-xs text-slate-400">Créditos · Cobranza · Rutas</p>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="card p-6 glass">
          <h2 className="text-lg font-semibold mb-1">Iniciar sesión</h2>
          <p className="text-xs text-slate-400 mb-5">Accede con tu correo autorizado.</p>

          <div className="space-y-3">
            <div>
              <label htmlFor="email">Correo</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1"
                placeholder="tu@finruta.mx"
              />
            </div>
            <div>
              <label htmlFor="pw">Contraseña</label>
              <input
                id="pw"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1"
              />
            </div>
          </div>

          {error ? (
            <div className="mt-4 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
              {error}
            </div>
          ) : null}

          <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center mt-5">
            {loading ? 'Entrando…' : 'Iniciar sesión'}
          </button>

          <p className="text-[11px] text-slate-500 mt-5 text-center">
            Al iniciar sesión aceptas el{' '}
            <Link href="/configuracion" className="underline">
              aviso de privacidad
            </Link>{' '}
            (pendiente de validar).
          </p>
        </form>

        <p className="text-[11px] text-slate-500 text-center mt-6">
          FinRuta v0.2 · MVP · Fix-Ya Tech
        </p>
      </div>
    </div>
  );
}
