package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.Inventario;
import com.higienesalud.smartsys.dao.InventarioDao;
import com.higienesalud.smartsys.model.EstadoProgramacion;
import com.higienesalud.smartsys.model.ProgramacionAbastecimiento;
import com.higienesalud.smartsys.dao.ProgramacionDao;
import com.higienesalud.smartsys.model.Recepcion;
import com.higienesalud.smartsys.dao.RecepcionDao;
import com.higienesalud.smartsys.model.Rol;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Component
public class ProgramadorAlertas {

    private final InventarioDao inventarioDao;
    private final ProgramacionDao programacionDao;
    private final RecepcionDao recepcionDao;
    private final NotificacionDao notificacionDao;
    private final ServicioNotificacion ServicioNotificacion;

    public ProgramadorAlertas(InventarioDao inventarioDao,
                           ProgramacionDao programacionDao,
                           RecepcionDao recepcionDao,
                           NotificacionDao notificacionDao,
                           ServicioNotificacion ServicioNotificacion) {
        this.inventarioDao = inventarioDao;
        this.programacionDao = programacionDao;
        this.recepcionDao = recepcionDao;
        this.notificacionDao = notificacionDao;
        this.ServicioNotificacion = ServicioNotificacion;
    }

    @Scheduled(cron = "${app.alerts.cron:0 0 */6 * * *}")
    public void run() {
        LocalDateTime since = LocalDate.now().atStartOfDay();

        for (Inventario inventario : inventarioDao.findAll()) {
            if (inventario.getStockMinimo().signum() > 0
                    && inventario.getStockDisponible().compareTo(inventario.getStockMinimo()) < 0) {
                String mensaje = "Stock bajo de " + inventario.getProducto().getNombre()
                        + ": disponible " + inventario.getStockDisponible()
                        + " (mínimo " + inventario.getStockMinimo() + ")";
                if (!notificacionDao.existsByTipoAndMensajeAndFechaAfter("ALERTA_STOCK", mensaje, since)) {
                    ServicioNotificacion.toRole(Rol.ENCARGADO_ALMACEN, "Alerta de stock", mensaje, "ALERTA_STOCK");
                    ServicioNotificacion.toRole(Rol.JEFE_LOGISTICA, "Alerta de stock", mensaje, "ALERTA_STOCK");
                }
            }
        }

        LocalDate limit = LocalDate.now().plusDays(3);
        for (ProgramacionAbastecimiento p : programacionDao.findAll()) {
            if (p.getEstado() != EstadoProgramacion.CUMPLIDA
                    && p.getEstado() != EstadoProgramacion.CANCELADA
                    && !p.getFechaProgramada().isAfter(limit)) {
                String mensaje = "Programación " + p.getId() + " de " + p.getProducto().getNombre()
                        + " vence el " + p.getFechaProgramada();
                if (!notificacionDao.existsByTipoAndMensajeAndFechaAfter("ALERTA_VENCIMIENTO", mensaje, since)) {
                    ServicioNotificacion.toRole(Rol.JEFE_LOGISTICA, "Entrega próxima a vencer", mensaje,
                            "ALERTA_VENCIMIENTO");
                }
            }
        }

        for (Recepcion r : recepcionDao.findAll()) {
            if (!r.isConforme() && r.getFechaHora().isAfter(LocalDateTime.now().minusDays(7))) {
                String mensaje = "Recepción no conforme del despacho " + r.getDespacho().getCodigo()
                        + " (" + r.getEstado() + ")";
                if (!notificacionDao.existsByTipoAndMensajeAndFechaAfter("ALERTA_RECEPCION", mensaje, since)) {
                    ServicioNotificacion.toRole(Rol.JEFE_LOGISTICA, "Recepción no conforme", mensaje,
                            "ALERTA_RECEPCION");
                }
            }
        }
    }
}
