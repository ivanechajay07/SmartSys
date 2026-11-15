import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function PaginaNoEncontrada() {
  return (
    <div className="card mx-auto mt-10 max-w-lg p-10 text-center">
      <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
        <Compass className="h-7 w-7" />
      </span>
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Error 404</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Página no encontrada</h1>
      <p className="mt-2 text-sm text-slate-500">
        La seccion solicitada no existe o fue retirada. Regrese al panel general para continuar.
      </p>
      <Link to="/" className="btn-primary mt-6">
        Volver al panel general
      </Link>
    </div>
  );
}
