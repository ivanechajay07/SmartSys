import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { ToastViewport } from '@/components/ToastViewport';
import { ProtectedRoute, RequirePermiso } from '@/components/guards';
import PaginaAcceso from '@/pages/PaginaAcceso';
import PaginaPanelGeneral from '@/pages/PaginaPanelGeneral';
import PaginaSolicitudes from '@/pages/PaginaSolicitudes';
import PaginaReposiciones from '@/pages/PaginaReposiciones';
import PaginaProgramacion from '@/pages/PaginaProgramacion';
import PaginaDespachos from '@/pages/PaginaDespachos';
import PaginaDetalleDespacho from '@/pages/PaginaDetalleDespacho';
import PaginaRutaMovil from '@/pages/PaginaRutaMovil';
import PaginaRecepciones from '@/pages/PaginaRecepciones';
import PaginaInventario from '@/pages/PaginaInventario';
import PaginaTrazabilidad from '@/pages/PaginaTrazabilidad';
import PaginaCumplimiento from '@/pages/PaginaCumplimiento';
import PaginaReportes from '@/pages/PaginaReportes';
import PaginaNotificaciones from '@/pages/PaginaNotificaciones';
import PaginaDatosMaestros from '@/pages/PaginaDatosMaestros';
import PaginaUsuarios from '@/pages/PaginaUsuarios';
import PaginaAuditoria from '@/pages/PaginaAuditoria';
import PaginaPerfil from '@/pages/PaginaPerfil';
import PaginaNoEncontrada from '@/pages/PaginaNoEncontrada';

export default function App() {
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
