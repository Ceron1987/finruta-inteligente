'use client';
import { cn } from '@/lib/utils/cn';
import type { RoleTipo } from '@/types/database';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = { href: string; label: string; icon: string; onlyGerente?: boolean };

const SECTIONS: { title: string; items: Item[]; onlyGerente?: boolean }[] = [
  {
    title: 'General',
    items: [{ href: '/dashboard', label: 'Tablero', icon: '📊' }],
  },
  {
    title: 'Operación',
    items: [
      { href: '/clientes', label: 'Clientes y cartera', icon: '👥' },
      { href: '/expedientes', label: 'Expedientes', icon: '📁' },
      { href: '/solicitudes', label: 'Solicitudes', icon: '📝' },
      { href: '/autorizacion', label: 'Evaluación y autorización', icon: '🚦' },
      { href: '/creditos', label: 'Créditos y renovaciones', icon: '💳' },
      { href: '/cobranza', label: 'Cobranza', icon: '💰' },
      { href: '/rutas', label: 'Rutas y visitas', icon: '🗺️' },
    ],
  },
  {
    title: 'Resultados',
    items: [
      { href: '/comisiones', label: 'Metas y comisiones', icon: '🎯' },
      { href: '/reportes', label: 'Reportes', icon: '📈' },
    ],
  },
  {
    title: 'Administración',
    onlyGerente: true,
    items: [
      { href: '/importaciones', label: 'Importar cartera', icon: '📥', onlyGerente: true },
      { href: '/usuarios', label: 'Usuarios y roles', icon: '🛡️', onlyGerente: true },
      { href: '/configuracion', label: 'Configuración', icon: '⚙️', onlyGerente: true },
    ],
  },
];

export function Sidebar({ role }: { role: RoleTipo }) {
  const pathname = usePathname();
  return (
    <aside className="w-64 shrink-0 border-r border-border bg-[#070b12] flex flex-col">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-cyan to-brand-green flex items-center justify-center text-slate-950 font-black text-sm">
          FR
        </div>
        <div>
          <div className="font-bold leading-tight">FinRuta</div>
          <div className="text-[10px] text-slate-500 tracking-wider">INTELIGENTE</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar px-2 pb-4">
        {SECTIONS.filter((s) => !s.onlyGerente || role === 'gerente').map((s) => (
          <div key={s.title}>
            <div className="text-[10.5px] tracking-widest uppercase text-slate-600 px-3 pt-4 pb-1.5">
              {s.title}
            </div>
            {s.items
              .filter((it) => !it.onlyGerente || role === 'gerente')
              .map((it) => {
                const active = pathname === it.href || pathname.startsWith(it.href + '/');
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] transition',
                      active
                        ? 'bg-gradient-to-r from-cyan-500/15 to-transparent text-white border-l-2 border-brand-cyan pl-[10px]'
                        : 'text-txt-dim hover:bg-panel-2 hover:text-white',
                    )}
                  >
                    <span>{it.icon}</span>
                    {it.label}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
