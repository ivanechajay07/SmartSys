package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.model.*;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Consulta de trazabilidad: órdenes de servicio, ingresos de almacén
 * y salidas de almacén con sus detalles y su registro de origen.
 * Es una vista de solo lectura; las escrituras ocurren en Solicitudes,
 * Inventario y Despachos.
 */
@Service
public class ServicioTrazabilidad {

    private final OrdenServicioDao ordenServicioDao;
    private final SolicitudMaterialDao solicitudMaterialDao;
    private final IngresoAlmacenDao ingresoAlmacenDao;
    private final DetalleIngresoDao detalleIngresoDao;
    private final SalidaAlmacenDao salidaAlmacenDao;
    private final DetalleSalidaDao detalleSalidaDao;
    private final DespachoDao despachoDao;

    public ServicioTrazabilidad(OrdenServicioDao ordenServicioDao,
                                SolicitudMaterialDao solicitudMaterialDao,
                                IngresoAlmacenDao ingresoAlmacenDao,
                                DetalleIngresoDao detalleIngresoDao,
                                SalidaAlmacenDao salidaAlmacenDao,
                                DetalleSalidaDao detalleSalidaDao,
                                DespachoDao despachoDao) {
        this.ordenServicioDao = ordenServicioDao;
        this.solicitudMaterialDao = solicitudMaterialDao;
        this.ingresoAlmacenDao = ingresoAlmacenDao;
        this.detalleIngresoDao = detalleIngresoDao;
        this.salidaAlmacenDao = salidaAlmacenDao;
        this.detalleSalidaDao = detalleSalidaDao;
        this.despachoDao = despachoDao;
    }

    @Transactional(readOnly = true)
    public List<OrdenVista> ordenes() {
        return ordenServicioDao.findAll(Sort.by(Sort.Direction.DESC, "id")).stream()
                .map(orden -> {
                    SolicitudMaterial solicitud = solicitudMaterialDao
                            .findFirstByOrdenId(orden.getId()).orElse(null);
                    return new OrdenVista(
                            orden.getId(),
                            orden.getClienteNombre(),
                            orden.getClienteRuc(),
                            orden.getDireccionServicio(),
                            orden.getTipoServicio(),
                            orden.getFechaServicio(),
                            orden.getEstado(),
                            solicitud == null ? null : solicitud.getId(),
                            solicitud == null ? null : solicitud.getCodigo());
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<IngresoVista> ingresos() {
        return ingresoAlmacenDao.findAll(Sort.by(Sort.Direction.DESC, "id")).stream()
                .map(ingreso -> new IngresoVista(
                        ingreso.getId(),
                        ingreso.getFechaIngreso(),
                        ingreso.getNroGuiaRemision(),
                        ingreso.getProveedor() == null ? null : ingreso.getProveedor().getId(),
                        ingreso.getProveedor() == null ? null : ingreso.getProveedor().getRazonSocial(),
                        nombreUsuario(ingreso.getUsuario()),
                        ingreso.getObservacion(),
                        ingreso.isEstado(),
                        detalleIngresoDao.findByIngresoIdOrderByIdAsc(ingreso.getId()).stream()
                                .map(detalle -> new DetalleIngresoVista(
                                        detalle.getId(),
                                        detalle.getProducto().getCodigo(),
                                        detalle.getProducto().getNombre(),
                                        detalle.getCantidad(),
                                        detalle.getLote(),
                                        detalle.getFechaVencimiento()))
                                .toList()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SalidaVista> salidas() {
        return salidaAlmacenDao.findAll(Sort.by(Sort.Direction.DESC, "id")).stream()
                .map(salida -> {
                    Despacho despacho = despachoDao.findFirstBySalidaId(salida.getId()).orElse(null);
                    return new SalidaVista(
                            salida.getId(),
                            salida.getFechaSalida(),
                            salida.getNroGuiaInterna(),
                            salida.getTipoEntrega(),
                            nombreUsuario(salida.getUsuario()),
                            salida.isEstado(),
                            despacho == null ? null : despacho.getId(),
                            despacho == null ? null : despacho.getCodigo(),
                            detalleSalidaDao.findBySalidaIdOrderByIdAsc(salida.getId()).stream()
                                    .map(detalle -> new DetalleSalidaVista(
                                            detalle.getId(),
                                            detalle.getProducto().getCodigo(),
                                            detalle.getProducto().getNombre(),
                                            detalle.getCantidadEntregada()))
                                    .toList());
                })
                .toList();
    }

    private String nombreUsuario(Usuario usuario) {
        return usuario == null ? "" : usuario.getNombres() + " " + usuario.getApellidos();
    }

    public record OrdenVista(Long id, String clienteNombre, String clienteRuc,
                             String direccionServicio, String tipoServicio,
                             LocalDate fechaServicio, String estado,
                             Long solicitudId, String solicitudCodigo) {}

    public record DetalleIngresoVista(Long id, String codigoProducto, String producto,
                                      BigDecimal cantidad, String lote, LocalDate fechaVencimiento) {}

    public record IngresoVista(Long id, LocalDate fecha, String guia, Long proveedorId,
                               String proveedor, String usuario, String observacion,
                               boolean estado, List<DetalleIngresoVista> detalles) {}

    public record DetalleSalidaVista(Long id, String codigoProducto, String producto,
                                     BigDecimal cantidad) {}

    public record SalidaVista(Long id, LocalDate fecha, String guia, String tipoEntrega,
                              String usuario, boolean estado, Long despachoId, String despachoCodigo,
                              List<DetalleSalidaVista> detalles) {}
}
