'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import * as XLSX from 'xlsx';

type Fila = Record<string, any>;

export function ImportarUI() {
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState<string>('');
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{
    ok: number;
    errores: number;
    duplicadas: number;
    total: number;
    resultados: Array<{ fila: number; estado: 'ok' | 'error' | 'duplicada'; motivo?: string; folio?: string; nombre?: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNombreArchivo(file.name);
    setResult(null);
    setError(null);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json: Fila[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    setFilas(json.slice(0, 500)); // tope por preview
  }

  function descargarPlantilla() {
    const csv =
      'folio,nombre,telefono,giro,direccion,colonia,antiguedad_negocio,asesor_correo\n' +
      'C-9001,Ejemplo López,4421234567,Abarrotes,"Av. Hidalgo 123",Centro,5 años,ana@finruta.mx';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'plantilla-cartera-finruta.csv';
    a.click();
  }

  function cancelar() {
    setFilas([]);
    setNombreArchivo('');
    setResult(null);
    setError(null);
  }

  async function confirmar() {
    setError(null);
    start(async () => {
      const res = await fetch('/api/importar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ archivo_nombre: nombreArchivo, filas }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? 'Error al importar');
        return;
      }
      setResult(j);
      setFilas([]);
      router.refresh();
    });
  }

  const columnas = filas[0] ? Object.keys(filas[0]) : [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 card p-5">
        <h3 className="font-semibold mb-3">Importar cartera (.xlsx, .xls, .csv)</h3>
        <label
          htmlFor="file"
          className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-cyan-500/60 transition cursor-pointer block"
        >
          <div className="text-5xl mb-3">📄</div>
          <div className="font-semibold">
            {nombreArchivo || 'Haz clic para seleccionar un archivo'}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Columnas esperadas: folio, nombre, telefono, giro, direccion, colonia,
            antiguedad_negocio, asesor_correo
          </div>
          <input
            id="file"
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={onFile}
          />
        </label>

        {filas.length > 0 ? (
          <>
            <div className="my-5 h-px bg-border" />
            <h4 className="font-semibold mb-2 text-sm">
              Vista previa — {filas.length} fila{filas.length === 1 ? '' : 's'}
            </h4>
            <div className="overflow-x-auto max-h-[320px] scrollbar">
              <table className="w-full text-xs">
                <thead>
                  <tr className="table-head bg-slate-900/60">
                    {columnas.map((c) => (
                      <th key={c} className="text-left px-3 py-2">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.slice(0, 20).map((f, i) => (
                    <tr key={i} className="border-t border-border/60">
                      {columnas.map((c) => (
                        <td key={c} className="px-3 py-2">
                          {String(f[c] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filas.length > 20 ? (
              <div className="text-xs text-slate-500 mt-2">
                Se muestran 20 de {filas.length}. Todas se enviarán al confirmar.
              </div>
            ) : null}

            <div className="flex items-center gap-2 mt-5">
              <button className="btn btn-ghost" onClick={cancelar}>
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={pending} onClick={confirmar}>
                {pending ? 'Importando…' : 'Confirmar importación'}
              </button>
            </div>
          </>
        ) : null}

        {error ? (
          <div className="mt-4 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
            {error}
          </div>
        ) : null}
        {result ? (
          <div className="mt-4 space-y-3">
            <div className="text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              Resumen: <b>{result.ok}</b> OK · <b>{result.errores}</b> con error ·{' '}
              <b>{result.duplicadas}</b> duplicadas · total <b>{result.total}</b>.
            </div>
            {result.resultados.some((r) => r.estado !== 'ok') ? (
              <div className="card p-3">
                <div className="text-xs font-semibold mb-2">
                  Filas que NO se importaron ({result.errores + result.duplicadas})
                </div>
                <div className="max-h-56 overflow-y-auto scrollbar text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="table-head">
                        <th className="text-left py-1">Fila</th>
                        <th className="text-left py-1">Nombre</th>
                        <th className="text-left py-1">Estado</th>
                        <th className="text-left py-1">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.resultados
                        .filter((r) => r.estado !== 'ok')
                        .map((r) => (
                          <tr key={r.fila} className="border-t border-border/60">
                            <td className="py-1 font-mono">{r.fila}</td>
                            <td className="py-1">{r.nombre ?? '—'}</td>
                            <td
                              className={`py-1 capitalize ${
                                r.estado === 'duplicada' ? 'text-amber-300' : 'text-rose-300'
                              }`}
                            >
                              {r.estado}
                            </td>
                            <td className="py-1 text-slate-400">{r.motivo ?? '—'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-3">Plantilla y reglas</h3>
        <button className="btn btn-ghost w-full justify-center mb-3" onClick={descargarPlantilla}>
          ⬇ Descargar plantilla .csv
        </button>
        <ul className="text-xs text-slate-400 space-y-2">
          <li>• No se duplican clientes: coincidencia por teléfono + nombre.</li>
          <li>• Si falta el teléfono, la fila se marca como advertencia.</li>
          <li>• Se puede cancelar antes de confirmar.</li>
          <li>• Al confirmar, se registra quién importó y cuándo.</li>
          <li>• La asignación a asesores se hace por el correo (<code>asesor_correo</code>) o manual.</li>
          <li>• Los montos nunca se cargan en el nombre del archivo; se cargan en pesos.</li>
        </ul>
      </div>
    </div>
  );
}
