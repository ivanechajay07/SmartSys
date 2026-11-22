package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.exception.ExcepcionNoEncontrada;
import com.higienesalud.smartsys.service.ServicioInventario;
import com.higienesalud.smartsys.model.Vehiculo;
import com.higienesalud.smartsys.dao.VehiculoDao;
import com.higienesalud.smartsys.service.ServicioNotificacion;
import com.higienesalud.smartsys.model.ProgramacionAbastecimiento;
import com.higienesalud.smartsys.dao.ProgramacionDao;
import com.higienesalud.smartsys.service.ServicioProgramacion;
import com.higienesalud.smartsys.model.Rol;
import com.higienesalud.smartsys.model.Usuario;
import com.higienesalud.smartsys.dao.UsuarioDao;
import com.higienesalud.smartsys.service.ServicioSolicitud;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Set;

@Service
public class ServicioDespacho {

    private final DespachoDao Dao;
    private final ProgramacionDao programacionDao;
    private final ServicioProgramacion ServicioProgramacion;
    private final UsuarioDao usuarioDao;
    private final VehiculoDao vehiculoDao;
    private final ServicioInventario ServicioInventario;
    private final ServicioSolicitud ServicioSolicitud;
    private final EventoSeguimientoDao eventoDao;
    private final IncidenciaDespachoDao incidenciaDao;
    private final EvidenciaDao evidenciaDao;
    private final ServicioNotificacion ServicioNotificacion;
    private final SalidaAlmacenDao salidaAlmacenDao;
    private final DetalleSalidaDao detalleSalidaDao;

    public ServicioDespacho(DespachoDao Dao,
                           ProgramacionDao programacionDao,
                           ServicioProgramacion ServicioProgramacion,
                           UsuarioDao usuarioDao,
                           VehiculoDao vehiculoDao,
                           ServicioInventario ServicioInventario,
                           ServicioSolicitud ServicioSolicitud,
                           EventoSeguimientoDao eventoDao,
                           IncidenciaDespachoDao incidenciaDao,
                           EvidenciaDao evidenciaDao,
                           ServicioNotificacion ServicioNotificacion,
                           SalidaAlmacenDao salidaAlmacenDao,
                           DetalleSalidaDao detalleSalidaDao) {
        this.Dao = Dao;
        this.programacionDao = programacionDao;
        this.ServicioProgramacion = ServicioProgramacion;
        this.usuarioDao = usuarioDao;
        this.vehiculoDao = vehiculoDao;
        this.ServicioInventario = ServicioInventario;
        this.ServicioSolicitud = ServicioSolicitud;
        this.eventoDao = eventoDao;
        this.incidenciaDao = incidenciaDao;
        this.evidenciaDao = evidenciaDao;
        this.ServicioNotificacion = ServicioNotificacion;
        this.salidaAlmacenDao = salidaAlmacenDao;
        this.detalleSalidaDao = detalleSalidaDao;
    }

    @Transactional(readOnly = true)
    public List<Despacho> list() {
        return Dao.findAllByOrderByFechaDesc();
    }

    @Transactional(readOnly = true)
    public Despacho get(Long id) {
        return Dao.findById(id).orElseThrow(() -> new ExcepcionNoEncontrada("Despacho no encontrado"));
    }

    @Transactional
    public Despacho create(Long programacionId, Long responsableId, Long solicitudId, BigDecimal cantidad) {
        ProgramacionAbastecimiento programacion = programacionDao.findById(programacionId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Programación no encontrada"));
        if (programacion.getEstado().name().equals("CANCELADA")
                || programacion.getEstado().name().equals("CUMPLIDA")) {
            throw new ExcepcionNegocio("La programación esta cerrada");
        }
        BigDecimal comprometida = cantidad == null ? programacion.getSaldoPendiente() : cantidad;
        if (comprometida == null || comprometida.signum() <= 0) {
            throw new ExcepcionNegocio("La cantidad del despacho debe ser mayor a cero");
        }
        if (comprometida.compareTo(programacion.getSaldoPendiente()) > 0) {
            throw new ExcepcionNegocio("La cantidad supera el saldo pendiente de la programación");
        }
        Usuario responsable = usuarioDao.findById(responsableId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Responsable no encontrado"));

        SalidaAlmacen salida = salidaAlmacenDao.save(SalidaAlmacen.builder()
                .usuario(responsable)
                .fechaSalida(LocalDate.now())
                .tipoEntrega("DESPACHO")
                .estado(true)
                .build());

        Despacho despacho = Dao.save(Despacho.builder()
                .codigo("DES-" + System.currentTimeMillis())
                .salidaId(salida.getId())
                .entidad(programacion.getEntidad())
                .puntoEntrega(programacion.getPuntoEntrega())
                .contrato(programacion.getContrato())
                .tdr(programacion.getTdrItem().getTdr())
                .programacion(programacion)
                .fecha(LocalDate.now())
                .responsable(responsable)
                .estado(EstadoDespacho.BORRADOR)
                .build());

        DetalleDespacho detalle = DetalleDespacho.builder()
                .despacho(despacho)
                .producto(programacion.getProducto())
                .cantidadComprometida(comprometida)
                .build();
        despacho.getDetalles().add(detalle);
        despacho = Dao.save(despacho);

        DetalleDespacho managed = despacho.getDetalles().stream()
                .filter(d -> d.getProducto().getId().equals(programacion.getProducto().getId()))
                .findFirst().orElse(detalle);
        managed.setReservaId(ServicioInventario.reserve(programacion.getProducto().getId(), comprometida,
                "DESPACHO", despacho.getId()).getId());
        despacho.setNumeroGuia("GUI-" + despacho.getId());
        despacho.setNumeroSalida("SAL-" + despacho.getId());
        despacho.setNumeroHojaRuta("HR-" + despacho.getId());

        salida.setNroGuiaInterna("SAL-" + despacho.getId());
        salidaAlmacenDao.save(salida);
        detalleSalidaDao.save(DetalleSalida.builder()
                .salida(salida)
                .producto(programacion.getProducto())
                .cantidadEntregada(comprometida)
                .build());
        return Dao.save(despacho);
    }

    @Transactional
    public Despacho prepare(Long id, List<PrepareItem> items, Usuario usuario) {
        Despacho despacho = get(id);
        if (despacho.getEstado() != EstadoDespacho.BORRADOR
                && despacho.getEstado() != EstadoDespacho.EN_PREPARACION) {
            throw new ExcepcionNegocio("El despacho no está en preparación");
        }
        for (PrepareItem item : items) {
            DetalleDespacho detalle = despacho.getDetalles().stream()
                    .filter(d -> d.getProducto().getId().equals(item.productoId()))
                    .findFirst().orElseThrow(() -> new ExcepcionNegocio("Producto no pertenece al despacho"));
            if (item.cantidad() == null || item.cantidad().signum() < 0) {
                throw new ExcepcionNegocio("Cantidad preparada inválida");
            }
            if (item.cantidad().compareTo(detalle.getCantidadComprometida()) > 0) {
                throw new ExcepcionNegocio("La cantidad preparada supera la comprometida");
            }
            detalle.setCantidadPreparada(item.cantidad());
        }
        despacho.setEstado(EstadoDespacho.PREPARADO);
        event(despacho, "PREPARACION", usuario, "Materiales preparados", null, null, null);
        return Dao.save(despacho);
    }

    @Transactional
    public Despacho assign(Long id, Long transportistaId, Long acompananteId, Long vehiculoId,
                           Usuario usuario) {
        Despacho despacho = get(id);
        if (despacho.getEstado() == EstadoDespacho.CANCELADO
                || despacho.getEstado() == EstadoDespacho.ENTREGADO) {
            throw new ExcepcionNegocio("El despacho no admite asignación");
        }
        Usuario transportista = usuarioDao.findById(transportistaId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Transportista no encontrado"));
        if (transportista.getRol() != Rol.TRANSPORTISTA && transportista.getRol() != Rol.RESPONSABLE_DISTRIBUCION) {
            throw new ExcepcionNegocio("El usuario no tiene rol de transportista");
        }
        Usuario acompanante = acompananteId == null ? null : usuarioDao.findById(acompananteId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Acompanante no encontrado"));
        Vehiculo vehiculo = vehiculoId == null ? null : vehiculoDao.findById(vehiculoId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Vehículo no encontrado"));
        despacho.setTransportista(transportista);
        despacho.setAcompanante(acompanante);
        despacho.setVehiculo(vehiculo);
        despacho.setFechaHoraAsignacion(LocalDateTime.now());
        event(despacho, "ASIGNACION", usuario, "Asignación de transporte", null, null, null);
        ServicioNotificacion.toUser(transportista, "Nuevo despacho asignado " + despacho.getCodigo(),
                "Destino: " + despacho.getPuntoEntrega().getNombre(), "DESPACHO");
        return Dao.save(despacho);
    }

    @Transactional
    public Despacho confirmTransportReceipt(Long id, Usuario usuario) {
        return confirmTransportReceipt(id, null, null, usuario);
    }

    @Transactional
    public Despacho confirmTransportReceipt(Long id, BigDecimal latitud, BigDecimal longitud, Usuario usuario) {
        Despacho despacho = get(id);
        ensureAssigned(despacho, usuario);
        event(despacho, "RECEPCION_MATERIAL", usuario, "Materiales recibidos para transporte", latitud, longitud, null);
        return despacho;
    }

    @Transactional
    public Despacho depart(Long id, Usuario usuario) {
        return depart(id, null, null, usuario);
    }

    @Transactional
    public Despacho depart(Long id, BigDecimal latitud, BigDecimal longitud, Usuario usuario) {
        Despacho despacho = get(id);
        ensureAssigned(despacho, usuario);
        if (despacho.getEstado() != EstadoDespacho.PREPARADO
                && despacho.getEstado() != EstadoDespacho.EN_PREPARACION) {
            throw new ExcepcionNegocio("El despacho no está listo para salir");
        }
        despacho.setEstado(EstadoDespacho.EN_RUTA);
        despacho.setFechaHoraSalida(LocalDateTime.now());
        event(despacho, "SALIDA_ALMACEN", usuario, "Salida del almacén", latitud, longitud, null);
        return Dao.save(despacho);
    }

    @Transactional
    public Despacho arrive(Long id, Usuario usuario) {
        return arrive(id, null, null, usuario);
    }

    @Transactional
    public Despacho arrive(Long id, BigDecimal latitud, BigDecimal longitud, Usuario usuario) {
        Despacho despacho = get(id);
        ensureAssigned(despacho, usuario);
        despacho.setFechaHoraLlegada(LocalDateTime.now());
        event(despacho, "LLEGADA", usuario, "Llegada al punto de entrega", latitud, longitud, null);
        return Dao.save(despacho);
    }

    @Transactional
    public Despacho deliver(Long id, List<DeliverItem> items, String observaciones, Usuario usuario) {
        Despacho despacho = get(id);
        ensureAssigned(despacho, usuario);
        if (despacho.getEstado() != EstadoDespacho.EN_RUTA
                && despacho.getEstado() != EstadoDespacho.PREPARADO) {
            throw new ExcepcionNegocio("El despacho no está en ruta");
        }
        boolean partial = false;
        for (DeliverItem item : items) {
            DetalleDespacho detalle = despacho.getDetalles().stream()
                    .filter(d -> d.getProducto().getId().equals(item.productoId()))
                    .findFirst().orElseThrow(() -> new ExcepcionNegocio("Producto no pertenece al despacho"));
            BigDecimal qty = item.cantidad();
            if (qty == null || qty.signum() <= 0) {
                throw new ExcepcionNegocio("Cantidad entregada inválida");
            }
            BigDecimal max = detalle.getCantidadPreparada().signum() > 0
                    ? detalle.getCantidadPreparada() : detalle.getCantidadComprometida();
            if (qty.compareTo(max) > 0) {
                throw new ExcepcionNegocio("La cantidad entregada supera la preparada");
            }
            ServicioInventario.consumeReservation(detalle.getReservaId(), qty,
                    despacho.getCodigo(), "Salida por despacho", usuario);
            detalle.setCantidadDespachada(detalle.getCantidadDespachada().add(qty));
            ServicioProgramacion.registerDelivery(despacho.getProgramacion().getId(), qty);
            if (despacho.getSolicitud() != null) {
                ServicioSolicitud.registerDispatch(despacho.getSolicitud().getId(),
                        detalle.getProducto().getId(), qty);
            }
            if (detalle.getCantidadDespachada().compareTo(detalle.getCantidadComprometida()) < 0) {
                partial = true;
                ServicioInventario.releaseReservation(detalle.getReservaId());
            }
        }
        despacho.setEstado(partial ? EstadoDespacho.ENTREGADO_PARCIAL : EstadoDespacho.ENTREGADO);
        despacho.setObservaciones(observaciones);
        event(despacho, partial ? "ENTREGA_PARCIAL" : "ENTREGA", usuario,
                observaciones == null ? "Entrega registrada" : observaciones, null, null, null);
        ServicioNotificacion.toRole(Rol.JEFE_LOGISTICA, "Despacho " + (partial ? "parcial" : "entregado") + " " + despacho.getCodigo(),
                "Entrega registrada en " + despacho.getPuntoEntrega().getNombre(), partial ? "ALERTA" : "DESPACHO");
        return Dao.save(despacho);
    }

    @Transactional
    public Despacho cancel(Long id, String motivo, Usuario usuario) {
        Despacho despacho = get(id);
        if (despacho.getEstado() == EstadoDespacho.ENTREGADO) {
            throw new ExcepcionNegocio("No se puede cancelar un despacho entregado");
        }
        for (DetalleDespacho detalle : despacho.getDetalles()) {
            if (detalle.getReservaId() != null) {
                ServicioInventario.releaseReservation(detalle.getReservaId());
            }
        }
        despacho.setEstado(EstadoDespacho.CANCELADO);
        despacho.setObservaciones(motivo);
        event(despacho, "CANCELACION", usuario, motivo, null, null, null);
        return Dao.save(despacho);
    }

    @Transactional
    public EventoSeguimiento addEvent(Long id, String tipo, String observaciones,
                                      BigDecimal latitud, BigDecimal longitud, String evidenciaUrl,
                                      Usuario usuario) {
        Despacho despacho = get(id);
        ensureAssigned(despacho, usuario);
        return event(despacho, tipo, usuario, observaciones, latitud, longitud, evidenciaUrl);
    }

    @Transactional
    public IncidenciaDespacho addIncident(Long id, String tipo, String descripcion, Usuario usuario) {
        Despacho despacho = get(id);
        ensureAssigned(despacho, usuario);
        event(despacho, "INCIDENCIA", usuario, descripcion, null, null, null);
        ServicioNotificacion.toRole(Rol.JEFE_LOGISTICA, "Incidencia en despacho " + despacho.getCodigo(),
                tipo + ": " + descripcion, "INCIDENCIA");
        return incidenciaDao.save(IncidenciaDespacho.builder()
                .despacho(despacho).tipo(tipo).descripcion(descripcion)
                .usuario(usuario).fecha(LocalDateTime.now()).build());
    }

    @Transactional
    public Evidencia addEvidence(Long id, String tipo, String url, String nombre, String observaciones,
                                 Usuario usuario) {
        Despacho despacho = get(id);
        ensureAssigned(despacho, usuario);
        return evidenciaDao.save(Evidencia.builder()
                .despacho(despacho).tipo(tipo).url(url).nombreArchivo(nombre)
                .observaciones(observaciones).usuario(usuario).fecha(LocalDateTime.now()).build());
    }

    @Transactional
    public Evidencia addEvidenceFile(Long id, MultipartFile file, String tipo, String observaciones,
                                     Usuario usuario) {
        if (file == null || file.isEmpty()) {
            throw new ExcepcionNegocio("Debe adjuntar un archivo");
        }
        if (file.getSize() > 8L * 1024 * 1024) {
            throw new ExcepcionNegocio("El archivo supera el límite de 8 MB");
        }
        String mime = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        Set<String> permitidos = Set.of("image/jpeg", "image/png", "image/webp", "application/pdf");
        if (!permitidos.contains(mime)) {
            throw new ExcepcionNegocio("Formato no permitido. Use JPG, PNG, WEBP o PDF");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw new ExcepcionNegocio("No se pudo leer el archivo adjunto");
        }
        if (!firmaValida(bytes, mime)) {
            throw new ExcepcionNegocio("El contenido del archivo no coincide con el formato declarado");
        }
        Despacho despacho = get(id);
        ensureAssigned(despacho, usuario);
        String nombre = file.getOriginalFilename() == null ? "evidencia"
                : file.getOriginalFilename().replaceAll(".*[\\\\/]", "").trim();
        if (nombre.length() > 255) {
            nombre = nombre.substring(0, 255);
        }
        Evidencia evidencia = evidenciaDao.save(Evidencia.builder()
                .despacho(despacho)
                .tipo(tipo == null || tipo.isBlank() ? "FOTO" : tipo)
                .url("")
                .nombreArchivo(nombre)
                .observaciones(observaciones)
                .usuario(usuario)
                .fecha(LocalDateTime.now())
                .contenido(Base64.getEncoder().encodeToString(bytes))
                .tipoMime(mime)
                .build());
        evidencia.setUrl("/dispatches/" + id + "/evidence/" + evidencia.getId() + "/file");
        return evidenciaDao.save(evidencia);
    }

    @Transactional(readOnly = true)
    public ArchivoEvidencia evidenceFile(Long despachoId, Long evidenciaId) {
        Evidencia evidencia = evidenciaDao.findById(evidenciaId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Evidencia no encontrada"));
        if (!evidencia.getDespacho().getId().equals(despachoId)) {
            throw new ExcepcionNoEncontrada("Evidencia no encontrada");
        }
        if (evidencia.getContenido() == null || evidencia.getContenido().isBlank()) {
            throw new ExcepcionNoEncontrada("La evidencia no tiene archivo adjunto");
        }
        byte[] data;
        try {
            data = Base64.getDecoder().decode(evidencia.getContenido());
        } catch (IllegalArgumentException ex) {
            throw new ExcepcionNegocio("El archivo de evidencia está dañado");
        }
        return new ArchivoEvidencia(evidencia.getNombreArchivo(), evidencia.getTipoMime(), data);
    }

    /**
     * Valida la firma binaria mínima para evitar que un archivo con extensión
     * o Content-Type falsificado se almacene como imagen/PDF.
     */
    private boolean firmaValida(byte[] data, String mime) {
        if (data == null || data.length < 4) {
            return false;
        }
        return switch (mime) {
            case "image/jpeg" -> (data[0] & 0xFF) == 0xFF && (data[1] & 0xFF) == 0xD8
                    && (data[2] & 0xFF) == 0xFF;
            case "image/png" -> data.length >= 8
                    && (data[0] & 0xFF) == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47
                    && data[4] == 0x0D && data[5] == 0x0A && data[6] == 0x1A && data[7] == 0x0A;
            case "image/webp" -> data.length >= 12
                    && data[0] == 'R' && data[1] == 'I' && data[2] == 'F' && data[3] == 'F'
                    && data[8] == 'W' && data[9] == 'E' && data[10] == 'B' && data[11] == 'P';
            case "application/pdf" -> data.length >= 5
                    && data[0] == '%' && data[1] == 'P' && data[2] == 'D' && data[3] == 'F'
                    && data[4] == '-';
            default -> false;
        };
    }

    @Transactional(readOnly = true)
    public List<EventoSeguimiento> events(Long id) {
        return eventoDao.findByDespachoIdOrderByFechaHoraAsc(id);
    }

    @Transactional(readOnly = true)
    public List<IncidenciaDespacho> incidents(Long id) {
        return incidenciaDao.findByDespachoIdOrderByFechaDesc(id);
    }

    @Transactional(readOnly = true)
    public List<Evidencia> evidence(Long id) {
        return evidenciaDao.findByDespachoIdOrderByFechaDesc(id);
    }

    @Transactional(readOnly = true)
    public List<Despacho> assignmentsFor(Long userId) {
        return assignmentsFor(userId, false);
    }

    @Transactional(readOnly = true)
    public List<Despacho> assignmentsFor(Long userId, boolean incluirFinalizadas) {
        List<Despacho> asignados = Dao.findByTransportistaIdOrAcompananteIdOrderByFechaAsc(userId, userId);
        if (incluirFinalizadas) {
            return asignados;
        }
        return asignados.stream()
                .filter(d -> d.getEstado() != EstadoDespacho.ENTREGADO
                        && d.getEstado() != EstadoDespacho.ENTREGADO_PARCIAL
                        && d.getEstado() != EstadoDespacho.CANCELADO)
                .toList();
    }

    private void ensureAssigned(Despacho despacho, Usuario usuario) {
        boolean admin = usuario.getRol() == Rol.ADMINISTRADOR || usuario.getRol() == Rol.JEFE_LOGISTICA;
        boolean assigned = (despacho.getTransportista() != null
                && despacho.getTransportista().getId().equals(usuario.getId()))
                || (despacho.getAcompanante() != null
                && despacho.getAcompanante().getId().equals(usuario.getId()));
        if (!admin && !assigned) {
            throw new ExcepcionNegocio("No tiene asignado este despacho");
        }
    }

    private EventoSeguimiento event(Despacho despacho, String tipo, Usuario usuario, String obs,
                                    BigDecimal lat, BigDecimal lon, String url) {
        return eventoDao.save(EventoSeguimiento.builder()
                .despacho(despacho).tipo(tipo).usuario(usuario)
                .fechaHora(LocalDateTime.now()).observaciones(obs)
                .latitud(lat).longitud(lon).evidenciaUrl(url).build());
    }

    public record PrepareItem(Long productoId, BigDecimal cantidad) {}
    public record DeliverItem(Long productoId, BigDecimal cantidad) {}
    public record ArchivoEvidencia(String nombre, String tipoMime, byte[] contenido) {}
}
