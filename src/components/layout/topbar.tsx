'use client';
import { createClient } from '@/lib/supabase/client';
import type { Usuario } from '@/types/database';
import { useRouter } from 'next/navigation';

export function Topbar({ perfil, title }: { perfil: Usuario; title: string }) {
  const router = useRouter();
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 glass border-b border-border px-6 py-3 flex items-center gap-4">
      <div className="flex-1 flex items-center gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="chip bg-cyan-500/10 text-cyan-300">
          <span className="dot bg-brand-cyan" /> {perfil.rol === 'gerente' ? 'Gerente' : 'Asesor'}
        </span>
      </div>
      <input
        placeholder="Buscar cliente, folio, dirección…"
        className="w-80 hidden md:block"
      />
      <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-border">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-brand-cyan flex items-center justify-center text-slate-950 font-bold text-sm">
          {perfil.nombre[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="hidden sm:block">
          <div className="text-sm font-semibold leading-none">{perfil.nombre}</div>
          <div className="text-[11px] text-slate-500">{perfil.correo}</div>
        </div>
        <button
          onClick={logout}
          className="text-slate-500 hover:text-rose-400 ml-1"
          title="Salir"
          aria-label="Cerrar sesión"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </div>
    </header>
  );
}
