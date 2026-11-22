import { lazy, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { ToastViewport } from '@/components/ToastViewport';
import { ProtectedRoute, RequirePermiso } from '@/components/guards';
import PaginaAcceso from '@/pages/PaginaAcceso';
import { bootstrapSession } from '@/lib/api';

const PaginaPanelGeneral = lazy(() => import('@/pages/PaginaPanelGeneral'));
const PaginaSolicitudes = lazy(() => import('@/pages/PaginaSolicitudes'));
const PaginaReposiciones = lazy(() => import('@/pages/PaginaReposiciones'));
const PaginaProgramacion = lazy(() => import('@/pages/PaginaProgramacion'));
const PaginaDespachos = lazy(() => import('@/pages/PaginaDespachos'));
const PaginaDetalleDespacho = lazy(() => import('@/pages/PaginaDetalleDespacho'));
const PaginaRutaMovil = lazy(() => import('@/pages/PaginaRutaMovil'));
const PaginaRecepciones = lazy(() => import('@/pages/PaginaRecepciones'));
const PaginaInventario = lazy(() => import('@/pages/PaginaInventario'));
const PaginaTrazabilidad = lazy(() => import('@/pages/PaginaTrazabilidad'));
const PaginaCumplimiento = lazy(() => import('@/pages/PaginaCumplimiento'));
const PaginaReportes = lazy(() => import('@/pages/PaginaReportes'));
const PaginaNotificaciones = lazy(() => import('@/pages/PaginaNotificaciones'));
const PaginaDatosMaestros = lazy(() => import('@/pages/PaginaDatosMaestros'));
const PaginaUsuarios = lazy(() => import('@/pages/PaginaUsuarios'));
const PaginaAuditoria = lazy(() => import('@/pages/PaginaAuditoria'));
const PaginaPerfil = lazy(() => import('@/pages/PaginaPerfil'));
const PaginaDesignSystem = lazy(() => import('@/pages/PaginaDesignSystem'));
const PaginaNoEncontrada = lazy(() => import('@/pages/PaginaNoEncontrada'));

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bootstrapSession().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600" role="status">
        Restaurando sesión segura…
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PaginaAcceso />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RequirePermiso module="PANEL"><PaginaPanelGeneral /></RequirePermiso>} />
          <Route path="/solicitudes" element={<RequirePermiso module="SOLICITUDES"><PaginaSolicitudes /></RequirePermiso>} />
          <Route path="/reposiciones" element={<RequirePermiso module="REPOSICIONES"><PaginaReposiciones /></RequirePermiso>} />
          <Route path="/programacion" element={<RequirePermiso module="PROGRAMACION"><PaginaProgramacion /></RequirePermiso>} />
          <Route path="/despachos" element={<RequirePermiso module="DESPACHOS"><PaginaDespachos /></RequirePermiso>} />
          <Route path="/despachos/:id" element={<RequirePermiso module="DESPACHOS"><PaginaDetalleDespacho /></RequirePermiso>} />
          <Route path="/ruta-movil" element={<RequirePermiso module="RUTA_MOVIL"><PaginaRutaMovil /></RequirePermiso>} />
          <Route path="/recepciones" element={<RequirePermiso module="RECEPCIONES"><PaginaRecepciones /></RequirePermiso>} />
          <Route path="/inventario" element={<RequirePermiso module="INVENTARIO"><PaginaInventario /></RequirePermiso>} />
          <Route
            path="/trazabilidad"
            element={
              <RequirePermiso module="TRAZABILIDAD">
                <PaginaTrazabilidad />
              </RequirePermiso>
            }
          />
          <Route path="/cumplimiento" element={<RequirePermiso module="CUMPLIMIENTO"><PaginaCumplimiento /></RequirePermiso>} />
          <Route path="/notificaciones" element={<RequirePermiso module="NOTIFICACIONES"><PaginaNotificaciones /></RequirePermiso>} />
          <Route
            path="/reportes"
            element={
              <RequirePermiso module="REPORTES">
                <PaginaReportes />
              </RequirePermiso>
            }
          />
          <Route
            path="/datos-maestros"
            element={
              <RequirePermiso module="DATOS_MAESTROS">
                <PaginaDatosMaestros />
              </RequirePermiso>
            }
          />
          <Route
            path="/usuarios"
            element={
              <RequirePermiso module="USUARIOS">
                <PaginaUsuarios />
              </RequirePermiso>
            }
          />
          <Route
            path="/auditoria"
            element={
              <RequirePermiso module="AUDITORIA">
                <PaginaAuditoria />
              </RequirePermiso>
            }
          />
          <Route path="/perfil" element={<RequirePermiso module="PERFIL"><PaginaPerfil /></RequirePermiso>} />
          <Route path="/design-system" element={<RequirePermiso module="PANEL"><PaginaDesignSystem /></RequirePermiso>} />
          <Route path="/no-encontrado" element={<PaginaNoEncontrada />} />

          {/* Alias en inglés para enlaces históricos */}
          <Route path="/requests" element={<Navigate to="/solicitudes" replace />} />
          <Route path="/replenishments" element={<Navigate to="/reposiciones" replace />} />
          <Route path="/schedules" element={<Navigate to="/programacion" replace />} />
          <Route path="/dispatches" element={<Navigate to="/despachos" replace />} />
          <Route path="/dispatches/:id" element={<PaginaDetalleDespacho />} />
          <Route path="/mobile" element={<Navigate to="/ruta-movil" replace />} />
          <Route path="/receptions" element={<Navigate to="/recepciones" replace />} />
          <Route path="/inventory" element={<Navigate to="/inventario" replace />} />
          <Route path="/traceability" element={<Navigate to="/trazabilidad" replace />} />
          <Route path="/compliance" element={<Navigate to="/cumplimiento" replace />} />
          <Route path="/reports" element={<Navigate to="/reportes" replace />} />
          <Route path="/notifications" element={<Navigate to="/notificaciones" replace />} />
          <Route path="/master-data" element={<Navigate to="/datos-maestros" replace />} />
          <Route path="/users" element={<Navigate to="/usuarios" replace />} />
          <Route path="/audit" element={<Navigate to="/auditoria" replace />} />
          <Route path="/profile" element={<Navigate to="/perfil" replace />} />
          <Route path="/not-found" element={<Navigate to="/no-encontrado" replace />} />
          <Route path="*" element={<Navigate to="/no-encontrado" replace />} />
        </Route>
      </Routes>
      <ToastViewport />
    </BrowserRouter>
  );
}
