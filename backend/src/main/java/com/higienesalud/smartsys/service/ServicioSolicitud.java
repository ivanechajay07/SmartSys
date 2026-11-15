package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.exception.ExcepcionNoEncontrada;
import com.higienesalud.smartsys.service.ServicioInventario;
import com.higienesalud.smartsys.model.ReservaStock;
import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.service.ServicioNotificacion;
import com.higienesalud.smartsys.model.Rol;
import com.higienesalud.smartsys.model.Usuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ServicioSolicitud {

    private final SolicitudMaterialDao Dao;
    private final EntidadPublicaDao entidadDao;
    private final PuntoEntregaDao puntoDao;
    private final ProductoDao productoDao;
    private final InventarioDao inventarioDao;
    private final ServicioInventario ServicioInventario;
    private final ServicioNotificacion ServicioNotificacion;
    private final OrdenServicioDao ordenServicioDao;

    public ServicioSolicitud(SolicitudMaterialDao Dao,
                            EntidadPublicaDao entidadDao,
                            PuntoEntregaDao puntoDao,
                            ProductoDao productoDao,
                            InventarioDao inventarioDao,
                            ServicioInventario ServicioInventario,
                            ServicioNotificacion ServicioNotificacion,
                            OrdenServicioDao ordenServicioDao) {
        this.Dao = Dao;
        this.entidadDao = entidadDao;
        this.puntoDao = puntoDao;
        this.productoDao = productoDao;
        this.inventarioDao = inventarioDao;
        this.ServicioInventario = ServicioInventario;
        this.ServicioNotificacion = ServicioNotificacion;
        this.ordenServicioDao = ordenServicioDao;
    }

    @Transactional(readOnly = true)
    public List<SolicitudMaterial> list() {
        return Dao.findAllByOrderByFechaSolicitudDesc();
    }

    @Transactional(readOnly = true)
    public SolicitudMaterial get(Long id) {
        return Dao.findById(id).orElseThrow(() -> new ExcepcionNoEncontrada("Solicitud no encontrada"));
    }

    @Transactional
    public SolicitudMaterial create(Long entidadId, Long puntoId, String justificacion,
                                    List<Item> items, Usuario solicitante) {
        if (items == null || items.isEmpty()) {
            throw new ExcepcionNegocio("La solicitud debe incluir al menos un producto");
        }
        EntidadPublica entidad = entidadDao.findById(entidadId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Entidad no encontrada"));
        PuntoEntrega punto = puntoDao.findById(puntoId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Punto de entrega no encontrado"));
        if (!punto.getEntidad().getId().equals(entidadId)) {
            throw new ExcepcionNegocio("El punto de entrega no pertenece a la entidad");
        }
        String codigo = "SOL-" + System.currentTimeMillis();
        OrdenServicio orden = ordenServicioDao.save(OrdenServicio.builder()
                .clienteNombre(entidad.getRazonSocial())
                .clienteRuc(entidad.getRuc())
                .direccionServicio(punto.getDireccion())
                .tipoServicio("SUMINISTRO")
                .fechaServicio(LocalDate.now())
                .estado("ACTIVO")
                .build());
        SolicitudMaterial solicitud = SolicitudMaterial.builder()
                .codigo(codigo)
                .ordenId(orden.getId())
                .nroTicket(codigo)
                .entidad(entidad).puntoEntrega(punto).solicitante(solicitante)
                .fechaSolicitud(LocalDateTime.now()).justificacion(justificacion)
                .estado(EstadoSolicitud.PENDIENTE).build();
        for (Item item : items) {
            if (item.cantidad() == null || item.cantidad().signum() <= 0) {
                throw new ExcepcionNegocio("Las cantidades deben ser mayores a cero");
            }
            Producto producto = productoDao.findById(item.productoId())
                    .orElseThrow(() -> new ExcepcionNoEncontrada("Producto no encontrado"));
            solicitud.getDetalles().add(DetalleSolicitud.builder()
                    .solicitud(solicitud).producto(producto)
                    .cantidadSolicitada(item.cantidad()).build());
        }
        return Dao.save(solicitud);
    }

    @Transactional
    public SolicitudMaterial submit(Long id) {
        SolicitudMaterial solicitud = get(id);
        if (solicitud.getEstado() != EstadoSolicitud.PENDIENTE) {
            throw new ExcepcionNegocio("Solo se puede enviar una solicitud pendiente");
        }
        validateStock(solicitud);
        solicitud.setEstado(EstadoSolicitud.EN_REVISION);
        SolicitudMaterial saved = Dao.save(solicitud);
        ServicioNotificacion.toRole(Rol.JEFE_LOGISTICA, "Solicitud en revisión " + saved.getCodigo(),
                "Solicitud enviada por " + solicitud.getSolicitante().getNombres()
                        + " para " + solicitud.getEntidad().getRazonSocial(), "SOLICITUD");
        return saved;
    }

    @Transactional
    public SolicitudMaterial approve(Long id, Usuario aprobador) {
        SolicitudMaterial solicitud = get(id);
        if (solicitud.getEstado() != EstadoSolicitud.EN_REVISION
                && solicitud.getEstado() != EstadoSolicitud.PENDIENTE) {
            throw new ExcepcionNegocio("La solicitud no está en revisión");
        }
        if (solicitud.getSolicitante().getId().equals(aprobador.getId())) {
            throw new ExcepcionNegocio("El solicitante no puede aprobar su propia solicitud");
        }
        validateStock(solicitud);
        for (DetalleSolicitud detalle : solicitud.getDetalles()) {
            ReservaStock reserva = ServicioInventario.reserve(detalle.getProducto().getId(),
                    detalle.getCantidadSolicitada(), "SOLICITUD", solicitud.getId());
            detalle.setCantidadAprobada(detalle.getCantidadSolicitada());
            detalle.setReservaId(reserva.getId());
        }
        solicitud.setEstado(EstadoSolicitud.PENDIENTE_DESPACHO);
        solicitud.setAprobadoPor(aprobador);
        solicitud.setFechaAprobacion(LocalDateTime.now());
        SolicitudMaterial saved = Dao.save(solicitud);
        ServicioNotificacion.toUser(solicitud.getSolicitante(), "Solicitud aprobada " + saved.getCodigo(),
                "Su solicitud fue aprobada y el stock fue reservado.", "SOLICITUD");
        return saved;
    }

    @Transactional
    public SolicitudMaterial reject(Long id, String motivo, Usuario aprobador) {
        SolicitudMaterial solicitud = get(id);
        if (solicitud.getEstado() == EstadoSolicitud.DESPACHADA
                || solicitud.getEstado() == EstadoSolicitud.RECHAZADA) {
            throw new ExcepcionNegocio("La solicitud ya fue cerrada");
        }
        if (motivo == null || motivo.isBlank()) {
            throw new ExcepcionNegocio("El motivo de rechazo es obligatorio");
        }
        solicitud.setEstado(EstadoSolicitud.RECHAZADA);
        solicitud.setMotivoRechazo(motivo);
        solicitud.setAprobadoPor(aprobador);
        solicitud.setFechaAprobacion(LocalDateTime.now());
        SolicitudMaterial saved = Dao.save(solicitud);
        ServicioNotificacion.toUser(solicitud.getSolicitante(), "Solicitud rechazada " + saved.getCodigo(),
                "Motivo: " + motivo, "SOLICITUD");
        return saved;
    }

    @Transactional
    public void registerDispatch(Long solicitudId, Long productoId, BigDecimal cantidad) {
        SolicitudMaterial solicitud = get(solicitudId);
        DetalleSolicitud detalle = solicitud.getDetalles().stream()
                .filter(d -> d.getProducto().getId().equals(productoId))
                .findFirst()
                .orElseThrow(() -> new ExcepcionNegocio("El producto no pertenece a la solicitud"));
        detalle.setCantidadDespachada(detalle.getCantidadDespachada().add(cantidad));
        boolean complete = solicitud.getDetalles().stream()
                .allMatch(d -> d.getCantidadDespachada().compareTo(d.getCantidadAprobada()) >= 0);
        solicitud.setEstado(complete ? EstadoSolicitud.DESPACHADA : EstadoSolicitud.PARCIALMENTE_ATENDIDA);
        Dao.save(solicitud);
    }

    private void validateStock(SolicitudMaterial solicitud) {
        for (DetalleSolicitud detalle : solicitud.getDetalles()) {
            Inventario inventario = inventarioDao.findByProductoId(detalle.getProducto().getId())
                    .orElseThrow(() -> new ExcepcionNoEncontrada("Inventario no encontrado"));
            if (inventario.getStockDisponible().compareTo(detalle.getCantidadSolicitada()) < 0) {
                throw new ExcepcionNegocio("Stock insuficiente para " + detalle.getProducto().getNombre()
                        + ". Disponible: " + inventario.getStockDisponible());
            }
        }
    }

    public record Item(Long productoId, BigDecimal cantidad) {}
}
