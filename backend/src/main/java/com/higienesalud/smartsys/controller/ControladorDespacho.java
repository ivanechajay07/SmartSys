package com.higienesalud.smartsys.controller;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.security.UsuarioActual;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class ControladorDespacho {

    private final ServicioDespacho service;
    private final UsuarioActual UsuarioActual;

    public ControladorDespacho(ServicioDespacho service, UsuarioActual UsuarioActual) {
        this.service = service;
        this.UsuarioActual = UsuarioActual;
    }

    @GetMapping("/dispatches")
    @PreAuthorize("@permisos.puede('DESPACHOS','VER')")
    public List<Despacho> list() {
        return service.list();
    }

    @GetMapping("/dispatches/{id}")
    @PreAuthorize("@permisos.puede('DESPACHOS','VER')")
    public Despacho get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping("/dispatches")
    @PreAuthorize("@permisos.puede('DESPACHOS','CREAR')")
    public Despacho create(@Valid @RequestBody CreateRequest request) {
        return service.create(request.programacionId(), request.responsableId(),
                request.solicitudId(), request.cantidad());
    }

    @PostMapping("/dispatches/{id}/prepare")
    @PreAuthorize("@permisos.puede('DESPACHOS','EDITAR')")
    public Despacho prepare(@PathVariable Long id, @Valid @RequestBody PrepareRequest request) {
        return service.prepare(id, request.items(), UsuarioActual.get());
    }

    @PostMapping("/dispatches/{id}/assign")
    @PreAuthorize("@permisos.puede('DESPACHOS','EDITAR')")
    public Despacho assign(@PathVariable Long id, @Valid @RequestBody AssignRequest request) {
        return service.assign(id, request.transportistaId(), request.acompananteId(),
                request.vehiculoId(), UsuarioActual.get());
    }

    @PostMapping("/dispatches/{id}/transport-receipt")
    @PreAuthorize("@permisos.puede('DESPACHOS','EDITAR')")
    public Despacho transportReceipt(@PathVariable Long id,
                                     @RequestBody(required = false) LocationRequest location) {
        return service.confirmTransportReceipt(id, lat(location), lon(location), UsuarioActual.get());
    }

    @PostMapping("/dispatches/{id}/depart")
    @PreAuthorize("@permisos.puede('DESPACHOS','EDITAR')")
    public Despacho depart(@PathVariable Long id,
                           @RequestBody(required = false) LocationRequest location) {
        return service.depart(id, lat(location), lon(location), UsuarioActual.get());
    }

    @PostMapping("/dispatches/{id}/arrive")
    @PreAuthorize("@permisos.puede('DESPACHOS','EDITAR')")
    public Despacho arrive(@PathVariable Long id,
                           @RequestBody(required = false) LocationRequest location) {
        return service.arrive(id, lat(location), lon(location), UsuarioActual.get());
    }

    @PostMapping("/dispatches/{id}/deliver")
    @PreAuthorize("@permisos.puede('DESPACHOS','EDITAR')")
    public Despacho deliver(@PathVariable Long id, @Valid @RequestBody DeliverRequest request) {
        return service.deliver(id, request.items(), request.observaciones(), UsuarioActual.get());
    }

    @PostMapping("/dispatches/{id}/cancel")
    @PreAuthorize("@permisos.puede('DESPACHOS','EDITAR') and hasAnyRole('ADMINISTRADOR','JEFE_LOGISTICA')")
    public Despacho cancel(@PathVariable Long id, @Valid @RequestBody CancelRequest request) {
        return service.cancel(id, request.motivo(), UsuarioActual.get());
    }

    @GetMapping("/dispatches/{id}/route-sheet")
    @PreAuthorize("@permisos.puede('DESPACHOS','VER')")
    public RouteSheet routeSheet(@PathVariable Long id) {
        Despacho d = service.get(id);
        return new RouteSheet(d.getCodigo(), d.getNumeroHojaRuta(),
                "Almacén central", d.getPuntoEntrega().getNombre() + " - " + d.getPuntoEntrega().getDireccion(),
                d.getFecha(), d.getFechaHoraSalida(), d.getTransportista() == null ? null : d.getTransportista().getNombres() + " " + d.getTransportista().getApellidos(),
                d.getAcompanante() == null ? null : d.getAcompanante().getNombres() + " " + d.getAcompanante().getApellidos(),
                d.getVehiculo() == null ? null : d.getVehiculo().getPlaca(),
                d.getPuntoEntrega().getResponsable(), d.getPuntoEntrega().getTelefono(),
                d.getDetalles().stream().map(x -> new RouteItem(x.getProducto().getNombre(),
                        x.getCantidadComprometida(), x.getProducto().getUnidadMedida())).toList());
    }

    @GetMapping("/dispatches/{id}/events")
    @PreAuthorize("@permisos.puede('DESPACHOS','VER')")
    public List<EventoSeguimiento> events(@PathVariable Long id) {
        return service.events(id);
    }

    @PostMapping("/dispatches/{id}/events")
    @PreAuthorize("@permisos.puede('DESPACHOS','EDITAR')")
    public EventoSeguimiento addEvent(@PathVariable Long id, @Valid @RequestBody EventRequest request) {
        return service.addEvent(id, request.tipo(), request.observaciones(), request.latitud(),
                request.longitud(), request.evidenciaUrl(), UsuarioActual.get());
    }

    @GetMapping("/dispatches/{id}/incidents")
    @PreAuthorize("@permisos.puede('DESPACHOS','VER')")
    public List<IncidenciaDespacho> incidents(@PathVariable Long id) {
        return service.incidents(id);
    }

    @PostMapping("/dispatches/{id}/incidents")
    @PreAuthorize("@permisos.puede('DESPACHOS','EDITAR')")
    public IncidenciaDespacho addIncident(@PathVariable Long id, @Valid @RequestBody IncidentRequest request) {
        return service.addIncident(id, request.tipo(), request.descripcion(), UsuarioActual.get());
    }

    @GetMapping("/dispatches/{id}/evidence")
    @PreAuthorize("@permisos.puede('DESPACHOS','VER')")
    public List<Evidencia> evidence(@PathVariable Long id) {
        return service.evidence(id);
    }

    @PostMapping("/dispatches/{id}/evidence")
    @PreAuthorize("@permisos.puede('DESPACHOS','EDITAR')")
    public Evidencia addEvidence(@PathVariable Long id, @Valid @RequestBody EvidenceRequest request) {
        return service.addEvidence(id, request.tipo(), request.url(), request.nombreArchivo(),
                request.observaciones(), UsuarioActual.get());
    }

    @PostMapping(value = "/dispatches/{id}/evidence/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@permisos.puede('DESPACHOS','EDITAR')")
    public Evidencia uploadEvidence(@PathVariable Long id,
                                    @RequestPart("file") MultipartFile file,
                                    @RequestParam(required = false, defaultValue = "FOTO") String tipo,
                                    @RequestParam(required = false) String observaciones) {
        return service.addEvidenceFile(id, file, tipo, observaciones, UsuarioActual.get());
    }

    @GetMapping("/dispatches/{id}/evidence/{evidenceId}/file")
    @PreAuthorize("@permisos.puede('DESPACHOS','VER')")
    public ResponseEntity<byte[]> evidenceFile(@PathVariable Long id, @PathVariable Long evidenceId) {
        ServicioDespacho.ArchivoEvidencia archivo = service.evidenceFile(id, evidenceId);
        String nombre = archivo.nombre() == null ? "evidencia" : archivo.nombre().replace("\"", "");
        return ResponseEntity.ok()
                .contentType(archivo.tipoMime() == null
                        ? MediaType.APPLICATION_OCTET_STREAM
                        : MediaType.parseMediaType(archivo.tipoMime()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombre + "\"")
                .body(archivo.contenido());
    }

    @GetMapping("/mobile/assignments")
    @PreAuthorize("@permisos.puede('RUTA_MOVIL','VER')")
    public List<Despacho> myAssignments(
            @RequestParam(defaultValue = "false") boolean incluirFinalizadas) {
        return service.assignmentsFor(UsuarioActual.get().getId(), incluirFinalizadas);
    }

    private BigDecimal lat(LocationRequest location) {
        return location == null ? null : location.latitud();
    }

    private BigDecimal lon(LocationRequest location) {
        return location == null ? null : location.longitud();
    }

    public record LocationRequest(BigDecimal latitud, BigDecimal longitud) {}

    public record CreateRequest(@NotNull Long programacionId, @NotNull Long responsableId,
                                Long solicitudId, BigDecimal cantidad) {}
    public record PrepareRequest(@NotEmpty List<ServicioDespacho.PrepareItem> items) {}
    public record AssignRequest(@NotNull Long transportistaId, Long acompananteId, Long vehiculoId) {}
    public record DeliverRequest(@NotEmpty List<ServicioDespacho.DeliverItem> items, String observaciones) {}
    public record CancelRequest(String motivo) {}
    public record EventRequest(@NotNull String tipo, String observaciones, BigDecimal latitud,
                               BigDecimal longitud,
                               @Pattern(regexp = "^https?://.+", message = "La evidencia debe ser una URL http o https") String evidenciaUrl) {}
    public record IncidentRequest(@NotNull String tipo, @NotNull String descripcion) {}
    public record EvidenceRequest(@NotNull String tipo, @NotNull
                                  @Pattern(regexp = "^https?://.+", message = "La evidencia debe ser una URL http o https") String url,
                                  String nombreArchivo, String observaciones) {}
    public record RouteItem(String producto, BigDecimal cantidad, String unidad) {}
    public record RouteSheet(String despacho, String hojaRuta, String origen, String destino,
                             LocalDate fecha, java.time.LocalDateTime salida, String transportista,
                             String acompanante, String vehiculo, String contactoLlegada,
                             String telefonoLlegada, List<RouteItem> productos) {}
}
