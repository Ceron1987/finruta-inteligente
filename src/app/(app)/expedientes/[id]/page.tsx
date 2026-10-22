import { EmptyState } from '@/components/ui/empty';
import { PendienteBtn } from '@/components/ui/pendiente';
import { createServerSupabase } from '@/lib/supabase/server';
import { centavos, fechaMX } from '@/lib/utils/format';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ExpedientePage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();

  const { data: cliente, error } = await supabase
    .from('clientes')
    .select('*, usuarios:asesor_id(nombre, correo)')
    .eq('id', params.id)
    .single();

  if (error || !cliente) return notFound();

  const [{ data: creditos }, { data: documentos }, { data: solicitudes }] = await Promise.all([
    supabase.from('creditos').select('*').eq('cliente_id', params.id).order('fecha_desembolso', { ascending: false }),
    supabase.from('documentos').select('*').eq('cliente_id', params.id),
    supabase.from('solicitudes').select('*').eq('cliente_id', params.id).order('created_at', { ascending: false }),
  ]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Expediente · {cliente.nombre}</h1>
        <p className="text-xs text-slate-500 font-mono">{cliente.folio}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-green flex items-center justify-center text-slate-950 font-bold text-xl">
              {cliente.nombre[0]}
            </div>
            <div>
              <div className="font-bold text-lg">{cliente.nombre}</div>
              <div className="text-xs text-slate-500 font-mono">{cliente.folio}</div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <Row k="Teléfono" v={cliente.telefono || '—'} />
            <Row k="Giro" v={cliente.giro || '—'} />
            <Row k="Antigüedad" v={cliente.antiguedad_negocio || '—'} />
            <Row k="Asesor" v={(cliente as any).usuarios?.nombre || '—'} />
            <Row k="Estado" v={cliente.estado} />
          </div>
          <div className="h-px bg-border my-4" />
          <div className="text-xs text-slate-500 mb-1">Dirección</div>
          <div className="text-sm">{cliente.direccion || '—'}</div>
          {cliente.colonia ? <div className="text-xs text-slate-500">Col. {cliente.colonia}</div> : null}
        </div>

        <div className="xl:col-span-2 space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Documentos privados</h3>
              <PendienteBtn
                label="+ Subir documento"
                motivo="Carga a Supabase Storage (bucket privado) y firma de URL pendiente de implementar. La tabla public.documentos y las políticas ya existen."
              />
            </div>
            {!documentos || documentos.length === 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['INE frente', 'INE reverso', 'Comprobante domicilio', 'Foto del negocio'].map((d) => (
                  <div key={d} className="p-3 rounded-xl border border-border text-center">
                    <div className="text-3xl mb-1">📎</div>
                    <div className="text-xs">{d}</div>
                    <div className="text-[10px] text-slate-500 mt-1">Pendiente</div>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="text-sm space-y-2">
                {documentos.map((d: any) => (
                  <li key={d.id} className="flex items-center justify-between py-1 border-b border-border/60">
                    <span>{d.tipo}</span>
                    <span className="text-xs text-slate-500">{fechaMX(d.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="text-xs text-slate-500 mt-3">
              🔒 Archivos en bucket privado de Supabase Storage con acceso autorizado. Sin enlaces
              públicos permanentes.
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold mb-3">Historial de créditos</h3>
            {!creditos || creditos.length === 0 ? (
              <div className="text-xs text-slate-500">Aún no hay créditos para este cliente.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-head">
                    <th className="text-left py-2">Folio</th>
                    <th className="text-right py-2">Monto</th>
                    <th className="text-left py-2">Desembolso</th>
                    <th className="text-left py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {creditos.map((c: any) => (
                    <tr key={c.id} className="border-t border-border/60">
                      <td className="py-2 font-mono text-xs">{c.folio}</td>
                      <td className="py-2 text-right">{centavos.toMXN(c.monto_bruto_centavos)}</td>
                      <td className="py-2 text-xs text-slate-400">{fechaMX(c.fecha_desembolso)}</td>
                      <td className="py-2 capitalize">{c.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold mb-3">Solicitudes</h3>
            {!solicitudes || solicitudes.length === 0 ? (
              <div className="text-xs text-slate-500">Sin solicitudes registradas.</div>
            ) : (
              <ul className="text-sm space-y-2">
                {solicitudes.map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between py-1 border-b border-border/60">
                    <span className="font-mono text-xs">{s.folio}</span>
                    <span>{centavos.toMXN(s.monto_solicitado_centavos)}</span>
                    <span className="text-xs capitalize text-slate-400">{s.semaforo}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{k}</span>
      <span className="capitalize">{v}</span>
    </div>
  );
}
