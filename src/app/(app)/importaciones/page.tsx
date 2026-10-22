import { ImportarUI } from '@/components/importaciones/importar-ui';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createServerSupabase } from '@/lib/supabase/server';
import { fechaHoraMX } from '@/lib/utils/format';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ImportacionesPage() {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  if (u.perfil.rol !== 'gerente') redirect('/dashboard');

  const supabase = createServerSupabase();
  const { data: historial } = await supabase
    .from('importaciones')
    .select('*, usuarios:importado_por(nombre)')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <>
      <ImportarUI />

      <div className="card p-5 mt-6">
        <h3 className="font-semibold mb-3">Historial de importaciones</h3>
        {!historial || historial.length === 0 ? (
          <div className="text-xs text-slate-500">Sin importaciones registradas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="text-left py-2">Archivo</th>
                <th className="text-left py-2">Por</th>
                <th className="text-left py-2">Fecha</th>
                <th className="text-right py-2">Filas</th>
                <th className="text-right py-2">OK</th>
                <th className="text-right py-2">Errores</th>
                <th className="text-right py-2">Duplicadas</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((h: any) => (
                <tr key={h.id} className="border-t border-border/60">
                  <td className="py-2 text-xs">{h.archivo_nombre}</td>
                  <td className="py-2 text-xs">{h.usuarios?.nombre ?? '—'}</td>
                  <td className="py-2 text-xs text-slate-400">{fechaHoraMX(h.created_at)}</td>
                  <td className="py-2 text-right">{h.filas_total}</td>
                  <td className="py-2 text-right text-emerald-300">{h.filas_ok}</td>
                  <td className="py-2 text-right text-amber-300">{h.filas_error}</td>
                  <td className="py-2 text-right text-rose-300">{h.filas_duplicadas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
