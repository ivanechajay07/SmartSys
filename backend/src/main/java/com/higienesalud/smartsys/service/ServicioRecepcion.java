package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.exception.ExcepcionNoEncontrada;
import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.service.ServicioNotificacion;
import com.higienesalud.smartsys.model.Rol;
import com.higienesalud.smartsys.model.Usuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ServicioRecepcion {

    private final RecepcionDao Dao;
    private final DespachoDao despachoDao;
    private final EvidenciaDao evidenciaDao;
    private final IncidenciaDespachoDao incidenciaDao;
    private final ServicioNotificacion ServicioNotificacion;

    public ServicioRecepcion(RecepcionDao Dao,
                            DespachoDao despachoDao,
                            EvidenciaDao evidenciaDao,
                            IncidenciaDespachoDao incidenciaDao,
                            ServicioNotificacion ServicioNotificacion) {
        this.Dao = Dao;
        this.despachoDao = despachoDao;
        this.evidenciaDao = evidenciaDao;
        this.incidenciaDao = incidenciaDao;
        this.ServicioNotificacion = ServicioNotificacion;
    }

    @Transactional(readOnly = true)
    public List<Recepcion> list() {
        return Dao.findAllByOrderByFechaHoraDesc();
    }

    @Transactional(readOnly = true)
    public Recepcion get(Long id) {
        return Dao.findById(id).orElseThrow(() -> new ExcepcionNoEncontrada("Recepción no encontrada"));
    }

    @Transactional
    public Recepcion register(Long despachoId, String recibidoPor, String documento,
                              List<Item> items, String observaciones, String evidenciaUrl,
                              Usuario usuario) {
        Despacho despacho = despachoDao.findById(despachoId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Despacho no encontrado"));
        if (despacho.getEstado() == EstadoDespacho.CANCELADO || despacho.getEstado() == EstadoDespacho.BORRADOR) {
            throw new ExcepcionNegocio("El despacho no puede recibirse en su estado actual");
        }
        if (items == null || items.isEmpty()) {
            throw new ExcepcionNegocio("Debe registrar al menos un producto recibido");
        }
        Recepcion recepcion = Recepcion.builder()
                .despacho(despacho).fechaHora(LocalDateTime.now())
                .recibidoPor(recibidoPor).documentoIdentidad(documento)
                .observaciones(observaciones).usuario(usuario).build();

        BigDecimal totalRecibido = BigDecimal.ZERO;
        BigDecimal totalComprometido = BigDecimal.ZERO;
        for (Item item : items) {
            DetalleDespacho detalle = despacho.getDetalles().stream()
                    .filter(d -> d.getProducto().getId().equals(item.productoId()))
                    .findFirst()
                    .orElseThrow(() -> new ExcepcionNegocio("Producto no pertenece al despacho"));
            BigDecimal recibida = item.cantidadRecibida() == null ? BigDecimal.ZERO : item.cantidadRecibida();
            BigDecimal rechazada = item.cantidadRechazada() == null ? BigDecimal.ZERO : item.cantidadRechazada();
            if (recibida.signum() < 0 || rechazada.signum() < 0) {
                throw new ExcepcionNegocio("Las cantidades no pueden ser negativas");
            }
            BigDecimal esperada = detalle.getCantidadDespachada().signum() > 0
                    ? detalle.getCantidadDespachada() : detalle.getCantidadComprometida();
            if (recibida.add(rechazada).compareTo(esperada) > 0) {
                throw new ExcepcionNegocio("La cantidad recibida y rechazada supera la despachada");
            }
            recepcion.getDetalles().add(DetalleRecepcion.builder()
                    .recepcion(recepcion).producto(detalle.getProducto())
                    .cantidadRecibida(recibida).cantidadRechazada(rechazada)
                    .observaciones(item.observaciones()).build());
            totalRecibido = totalRecibido.add(recibida);
            totalComprometido = totalComprometido.add(esperada);
            if (rechazada.signum() > 0) {
                incidenciaDao.save(IncidenciaDespacho.builder()
                        .despacho(despacho).tipo("RECEPCION_RECHAZO")
                        .descripcion("Recepción con " + rechazada + " unidades rechazadas de "
                                + detalle.getProducto().getNombre())
                        .usuario(usuario).fecha(LocalDateTime.now()).build());
            }
        }
        boolean conforme = totalRecibido.compareTo(totalComprometido) >= 0;
        recepcion.setConforme(conforme);
        if (conforme) {
            recepcion.setEstado("CONFORME");
        } else if (totalRecibido.signum() == 0) {
            recepcion.setEstado("RECHAZADA");
        } else {
            recepcion.setEstado("PARCIAL");
        }
        Recepcion saved = Dao.save(recepcion);
        if (evidenciaUrl != null && !evidenciaUrl.isBlank()) {
            evidenciaDao.save(Evidencia.builder()
                    .despacho(despacho).recepcionId(saved.getId()).tipo("RECEPCION")
                    .url(evidenciaUrl).usuario(usuario).fecha(LocalDateTime.now()).build());
        }
        ServicioNotificacion.toRole(Rol.JEFE_LOGISTICA,
                "Recepción " + saved.getEstado() + " - " + despacho.getCodigo(),
                "Recepción registrada por " + recibidoPor + " en "
                        + despacho.getPuntoEntrega().getNombre(), conforme ? "INFO" : "ALERTA");
        if (despacho.getTransportista() != null) {
            ServicioNotificacion.toUser(despacho.getTransportista(),
                    "Recepción registrada - " + despacho.getCodigo(),
                    "Estado de recepción: " + saved.getEstado(), conforme ? "INFO" : "ALERTA");
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Recepcion> byDispatch(Long despachoId) {
        return Dao.findByDespachoId(despachoId);
    }

    public record Item(Long productoId, BigDecimal cantidadRecibida, BigDecimal cantidadRechazada,
                       String observaciones) {}
}
