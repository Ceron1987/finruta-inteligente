import { SemaforoChip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty';
import { PendienteBtn } from '@/components/ui/pendiente';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createServerSupabase } from '@/lib/supabase/server';
import { centavos } from '@/lib/utils/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const u = await getCurrentUser();
  if (!u) return null;
  const supabase = createServerSupabase();

  // RLS filtra por rol; no hace falta aplicar WHERE del lado del cliente.
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id, folio, nombre, telefono, giro, direccion, asesor_id, estado, usuarios:asesor_id(nombre)')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: creditosActivos } = await supabase
    .from('creditos')
    .select('cliente_id, saldo_centavos')
    .eq('estado', 'activo');

  const saldoPorCliente = new Map<string, number>();
  (creditosActivos ?? []).forEach((c) => {
    saldoPorCliente.set(c.cliente_id, (saldoPorCliente.get(c.cliente_id) ?? 0) + Number(c.saldo_centavos));
  });

  if (error) {
    return (
      <EmptyState
        title="No se pudieron cargar los clientes"
        description={error.message}
        icon="⚠️"
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <input placeholder="Buscar — pendiente" className="w-80 opacity-60" disabled />
          <select disabled className="opacity-60">
            <option>Filtros — pendientes</option>
          </select>
        </div>
        <div className="flex gap-2">
          {u.perfil.rol === 'gerente' ? (
            <Link href="/importaciones" className="btn btn-ghost">
              📥 Importar cartera
            </Link>
          ) : null}
          <PendienteBtn
            label="+ Nuevo cliente"
            variant="primary"
            motivo="Formulario de alta de cliente aún no implementado. Mientras tanto, usa 'Importar cartera' para crear clientes."
          />
        </div>
      </div>

      {!clientes || clientes.length === 0 ? (
        <EmptyState
          title="Aún no hay clientes"
          description={u.perfil.rol === 'gerente' ? 'Importa tu cartera desde el botón de arriba.' : 'Tu gerente aún no te ha asignado clientes.'}
          icon="👥"
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head bg-slate-900/60">
                  <th className="text-left px-4 py-3">Folio</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Giro</th>
                  <th className="text-left px-4 py-3">Dirección</th>
                  <th className="text-left px-4 py-3">Asesor</th>
                  <th className="text-right px-4 py-3">Saldo</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {clientes.map((c: any) => {
                  const saldo = saldoPorCliente.get(c.id) ?? 0;
                  return (
                    <tr key={c.id} className="border-t border-border/60 hover:bg-cyan-500/5">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{c.folio}</td>
                      <td className="px-4 py-3 font-medium">
                        {c.nombre}
                        <div className="text-xs text-slate-500">{c.telefono || '—'}</div>
                      </td>
                      <td className="px-4 py-3">{c.giro || '—'}</td>
                      <td
                        className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate"
                        title={c.direccion ?? undefined}
                      >
                        {c.direccion || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs">{c.usuarios?.nombre ?? '—'}</td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          saldo > 0 ? 'text-amber-300' : 'text-emerald-300'
                        }`}
                      >
                        {centavos.toMXN(saldo)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="chip bg-slate-500/15 text-slate-300 capitalize">
                          {c.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/expedientes/${c.id}`} className="btn btn-ghost text-xs">
                          Ver expediente
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-xs text-slate-500 border-t border-border">
            Mostrando {clientes.length} registro{clientes.length === 1 ? '' : 's'}.
          </div>
        </div>
      )}
    </>
  );
}
