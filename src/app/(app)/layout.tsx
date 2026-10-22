import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { getSessionStatus } from '@/lib/auth/current-user';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSessionStatus();
  if (s.kind === 'anon') redirect('/login');
  if (s.kind === 'inactivo') redirect('/login?motivo=inactivo');

  return (
    <div className="min-h-screen flex">
      <Sidebar role={s.perfil.rol} />
      <main className="flex-1 overflow-y-auto scrollbar">
        <Topbar perfil={s.perfil} title="FinRuta" />
        <section className="p-6">{children}</section>
      </main>
    </div>
  );
}
