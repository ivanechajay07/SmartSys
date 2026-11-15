package com.higienesalud.smartsys.controller;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.security.UsuarioActual;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/requests")
public class ControladorSolicitud {

    private final ServicioSolicitud service;
    private final UsuarioActual UsuarioActual;

    public ControladorSolicitud(ServicioSolicitud service, UsuarioActual UsuarioActual) {
        this.service = service;
        this.UsuarioActual = UsuarioActual;
    }

    @GetMapping
    @PreAuthorize("@permisos.puede('SOLICITUDES','VER')")
    public List<SolicitudMaterial> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permisos.puede('SOLICITUDES','VER')")
    public SolicitudMaterial get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("@permisos.puede('SOLICITUDES','CREAR')")
    public SolicitudMaterial create(@Valid @RequestBody CreateRequest request) {
        return service.create(request.entidadId(), request.puntoEntregaId(), request.justificacion(),
                request.items().stream().map(i -> new ServicioSolicitud.Item(i.productoId(), i.cantidad())).toList(),
                UsuarioActual.get());
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("@permisos.puede('SOLICITUDES','EDITAR')")
    public SolicitudMaterial submit(@PathVariable Long id) {
        return service.submit(id);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("@permisos.puede('SOLICITUDES','EDITAR')")
    public SolicitudMaterial approve(@PathVariable Long id) {
        return service.approve(id, UsuarioActual.get());
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("@permisos.puede('SOLICITUDES','EDITAR')")
    public SolicitudMaterial reject(@PathVariable Long id, @Valid @RequestBody RejectRequest request) {
        return service.reject(id, request.motivo(), UsuarioActual.get());
    }

    public record CreateRequest(@NotNull Long entidadId, @NotNull Long puntoEntregaId,
                                @NotBlank String justificacion,
                                @NotEmpty List<ItemRequest> items) {}
    public record ItemRequest(@NotNull Long productoId, @NotNull java.math.BigDecimal cantidad) {}
    public record RejectRequest(@NotBlank String motivo) {}
}
