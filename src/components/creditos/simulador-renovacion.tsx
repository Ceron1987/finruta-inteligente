'use client';
import { calcularRenovacion } from '@/lib/config/reglas-credito';
import { centavos } from '@/lib/utils/format';
import { useMemo, useState } from 'react';

export function SimuladorRenovacion({
  incrementoDefaultCentavos,
  tarifaConfiguradaCentavos,
}: {
  incrementoDefaultCentavos: number;
  tarifaConfiguradaCentavos: number | null;
}) {
  const [antPesos, setAntPesos] = useState(10000);
  const [incPesos, setIncPesos] = useState(incrementoDefaultCentavos / 100);
  const [tarPesos, setTarPesos] = useState<number | ''>(
    tarifaConfiguradaCentavos ? tarifaConfiguradaCentavos / 100 : '',
  );

  const r = useMemo(
    () =>
      calcularRenovacion(
        Math.round(antPesos * 100),
        Math.round(incPesos * 100),
        tarPesos === '' ? null : Math.round(Number(tarPesos) * 100),
      ),
    [antPesos, incPesos, tarPesos],
  );

  return (
    <div className="card p-5 mb-4">
      <h3 className="font-semibold mb-3">Simulador de renovación</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div>
          <label>Monto anterior</label>
          <input type="number" value={antPesos} onChange={(e) => setAntPesos(+e.target.value)} />
        </div>
        <div>
          <label>Incremento propuesto</label>
          <input type="number" value={incPesos} onChange={(e) => setIncPesos(+e.target.value)} />
        </div>
        <div>
          <label>Monto bruto</label>
          <div className="font-bold text-lg mt-1">{centavos.toMXN(r.bruto)}</div>
        </div>
        <div>
          <label>
            Tarifa{' '}
            {!r.tarifa_definida ? <span className="text-amber-300">(pendiente)</span> : null}
          </label>
          <input
            type="number"
            placeholder={r.tarifa_definida ? undefined : '— pendiente —'}
            value={tarPesos}
            onChange={(e) => setTarPesos(e.target.value === '' ? '' : +e.target.value)}
          />
        </div>
        <div>
          <label>Neto al cliente</label>
          <div className="font-bold text-lg mt-1 text-emerald-300">{centavos.toMXN(r.neto)}</div>
        </div>
      </div>
      <div className="text-xs text-slate-500 mt-3">
        Si tarifa = $400, de $13,000 el cliente recibe $12,600. El sistema no fija tarifa por su
        cuenta: se toma de la configuración autorizada por la financiera.
      </div>
    </div>
  );
}
