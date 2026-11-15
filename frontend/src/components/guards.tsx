import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import type { Rol } from '@/types';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuth((state) => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

export function RequirePermiso({ module, children }: { module: string; children: ReactNode }) {
  const permisos = useAuth((state) => state.permisos);
  const can = useAuth((state) => state.can);

  if (!permisos) {
    return (
      <div className="card mx-auto mt-10 max-w-xl p-8 text-center">
        <p className="text-sm font-semibold text-slate-600">Validando permisos de acceso...</p>
      </div>
    );
  }
  if (!can(module, 'ver')) {
    return (
      <div className="card mx-auto mt-10 max-w-xl p-8 text-center">
        <p className="text-lg font-bold text-slate-900">Acceso restringido</p>
        <p className="mt-2 text-sm text-slate-500">
          Su rol no tiene permiso para consultar este módulo. Contacte al administrador del sistema.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
