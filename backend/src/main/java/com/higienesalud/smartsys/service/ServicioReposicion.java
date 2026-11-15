package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.exception.ExcepcionNoEncontrada;
import com.higienesalud.smartsys.model.Producto;
import com.higienesalud.smartsys.dao.ProductoDao;
import com.higienesalud.smartsys.service.ServicioNotificacion;
import com.higienesalud.smartsys.model.Rol;
import com.higienesalud.smartsys.model.Usuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ServicioReposicion {

    private final SolicitudReposicionDao Dao;
    private final ProductoDao productoDao;
    private final InventarioDao inventarioDao;
    private final AlertaStockDao alertaStockDao;
    private final ServicioNotificacion ServicioNotificacion;

    public ServicioReposicion(SolicitudReposicionDao Dao, ProductoDao productoDao,
                             InventarioDao inventarioDao, AlertaStockDao alertaStockDao,
                             ServicioNotificacion ServicioNotificacion) {
        this.Dao = Dao;
        this.productoDao = productoDao;
        this.inventarioDao = inventarioDao;
        this.alertaStockDao = alertaStockDao;
        this.ServicioNotificacion = ServicioNotificacion;
    }

    @Transactional(readOnly = true)
    public List<SolicitudReposicion> list() {
        return Dao.findAllByOrderByFechaSolicitudDesc();
    }

    @Transactional(readOnly = true)
    public SolicitudReposicion get(Long id) {
        return Dao.findById(id).orElseThrow(() -> new ExcepcionNoEncontrada("Reposición no encontrada"));
    }

    @Transactional
    public SolicitudReposicion create(String justificacion, BigDecimal monto, String referencia,
                                       String proveedor, List<Item> items, Usuario solicitante) {
        if (items == null || items.isEmpty()) {
            throw new ExcepcionNegocio("La reposición debe incluir al menos un producto");
        }
        SolicitudReposicion reposicion = SolicitudReposicion.builder()
                .codigo("REP-" + System.currentTimeMillis())
                .justificacion(justificacion).montoEstimado(monto)
                .referenciaPresupuesto(referencia).proveedorSugerido(proveedor)
                .estado(EstadoReposicion.BORRADOR).solicitante(solicitante)
                .fechaSolicitud(LocalDateTime.now()).build();
        for (Item item : items) {
            Producto producto = productoDao.findById(item.productoId())
                    .orElseThrow(() -> new ExcepcionNoEncontrada("Producto no encontrado"));
            reposicion.getDetalles().add(DetalleReposicion.builder()
                    .reposicion(reposicion).producto(producto).cantidad(item.cantidad())
                    .observacion(item.observacion()).build());
        }
        reposicion.setProductoId(items.get(0).productoId());
        reposicion.setCantidadSolicitada(items.stream()
                .map(Item::cantidad)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        inventarioDao.findByProductoId(items.get(0).productoId())
                .flatMap(inventario -> alertaStockDao
                        .findFirstByInventarioIdAndEstadoTrueOrderByFechaAlertaDesc(inventario.getId()))
                .ifPresent(alerta -> reposicion.setAlertaId(alerta.getId()));
        return Dao.save(reposicion);
    }

    @Transactional
    public SolicitudReposicion submit(Long id) {
        SolicitudReposicion reposicion = get(id);
        if (reposicion.getEstado() != EstadoReposicion.BORRADOR) {
            throw new ExcepcionNegocio("Solo se puede enviar un borrador");
        }
        reposicion.setEstado(EstadoReposicion.PENDIENTE_APROBACION);
        SolicitudReposicion saved = Dao.save(reposicion);
        ServicioNotificacion.toRole(Rol.JEFE_LOGISTICA, "Reposición pendiente " + saved.getCodigo(),
                "Reposición enviada por " + solicitanteNombre(reposicion), "REPOSICION");
        return saved;
    }

    @Transactional
    public SolicitudReposicion approve(Long id, Usuario aprobador) {
        SolicitudReposicion reposicion = get(id);
        if (reposicion.getEstado() != EstadoReposicion.PENDIENTE_APROBACION) {
            throw new ExcepcionNegocio("La reposición no está pendiente de aprobación");
        }
        if (reposicion.getSolicitante().getId().equals(aprobador.getId())) {
            throw new ExcepcionNegocio("El solicitante no puede aprobar su propia reposición");
        }
        reposicion.setEstado(EstadoReposicion.APROBADA);
        reposicion.setAprobador(aprobador);
        reposicion.setFechaResolucion(LocalDateTime.now());
        SolicitudReposicion saved = Dao.save(reposicion);
        ServicioNotificacion.toUser(reposicion.getSolicitante(), "Reposición aprobada " + saved.getCodigo(),
                "La reposición fue aprobada.", "REPOSICION");
        return saved;
    }

    @Transactional
    public SolicitudReposicion reject(Long id, String motivo, Usuario aprobador) {
        SolicitudReposicion reposicion = get(id);
        if (reposicion.getEstado() != EstadoReposicion.PENDIENTE_APROBACION) {
            throw new ExcepcionNegocio("La reposición no está pendiente de aprobación");
        }
        if (motivo == null || motivo.isBlank()) {
            throw new ExcepcionNegocio("El motivo de rechazo es obligatorio");
        }
        reposicion.setEstado(EstadoReposicion.RECHAZADA);
        reposicion.setMotivoRechazo(motivo);
        reposicion.setAprobador(aprobador);
        reposicion.setFechaResolucion(LocalDateTime.now());
        SolicitudReposicion saved = Dao.save(reposicion);
        ServicioNotificacion.toUser(reposicion.getSolicitante(), "Reposición rechazada " + saved.getCodigo(),
                "Motivo: " + motivo, "REPOSICION");
        return saved;
    }

    private String solicitanteNombre(SolicitudReposicion reposicion) {
        return reposicion.getSolicitante().getNombres() + " " + reposicion.getSolicitante().getApellidos();
    }

    public record Item(Long productoId, BigDecimal cantidad, String observacion) {}
}
