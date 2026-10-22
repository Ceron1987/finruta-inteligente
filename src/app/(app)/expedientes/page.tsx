import { redirect } from 'next/navigation';

export default function ExpedientesIndex() {
  // No tiene vista propia; redirige a Clientes (desde ahí se abre expediente).
  redirect('/clientes');
}
