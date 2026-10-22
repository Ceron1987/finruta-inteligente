import { Chip } from '@/components/ui/chip';
import { PendienteBtn } from '@/components/ui/pendiente';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  if (u.perfil.rol !== 'gerente') redirect('/dashboard');

  const supabase = createServerSupabase();
  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('*')
    .order('rol', { ascending: true })
    .order('nombre', { ascending: true });

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-400">
          Los roles controlan permisos tanto en la interfaz como en las políticas RLS de Supabase.
        </div>
        <PendienteBtn
          label="+ Invitar usuario"
          variant="primary"
          motivo="Flujo de invitación por correo pendiente. Mientras tanto, crea el usuario desde el panel de Supabase Auth (los nuevos siempre entran como ASESOR; para promover a GERENTE, UPDATE directo en public.usuarios desde el SQL Editor)."
        />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head bg-slate-900/60">
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-left px-4 py-3">Correo</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-left px-4 py-3">Zona</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(usuarios ?? []).map((x: any) => (
              <tr key={x.id} className="border-t border-border/60 hover:bg-cyan-500/5">
                <td className="px-4 py-3 font-medium">{x.nombre}</td>
                <td className="px-4 py-3 text-slate-400">{x.correo}</td>
                <td className="px-4 py-3">
                  <Chip
                    className={
                      x.rol === 'gerente'
                        ? 'bg-cyan-500/15 text-cyan-200'
                        : 'bg-violet-500/15 text-violet-200'
                    }
                  >
                    {x.rol === 'gerente' ? 'Gerente' : 'Asesor'}
                  </Chip>
                </td>
                <td className="px-4 py-3">{x.zona ?? '—'}</td>
                <td className="px-4 py-3">
                  {x.activo ? (
                    <Chip className="bg-emerald-500/15 text-emerald-200">Activo</Chip>
                  ) : (
                    <Chip className="bg-slate-500/15 text-slate-300">Inactivo</Chip>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <PendienteBtn
                    label="Editar"
                    motivo="Edición de usuarios desde la UI pendiente. Usa SQL Editor de Supabase por ahora."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 mt-3">
        🔒 Los permisos se aplican en el servidor y en la base de datos (RLS de Supabase), no sólo
        ocultando botones.
      </p>
    </>
  );
}
