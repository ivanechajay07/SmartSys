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

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/replenishments")
public class ControladorReposicion {

    private final ServicioReposicion service;
    private final UsuarioActual UsuarioActual;

    public ControladorReposicion(ServicioReposicion service, UsuarioActual UsuarioActual) {
        this.service = service;
        this.UsuarioActual = UsuarioActual;
    }

    @GetMapping
    @PreAuthorize("@permisos.puede('REPOSICIONES','VER')")
    public List<SolicitudReposicion> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permisos.puede('REPOSICIONES','VER')")
    public SolicitudReposicion get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("@permisos.puede('REPOSICIONES','CREAR')")
    public SolicitudReposicion create(@Valid @RequestBody CreateRequest request) {
        return service.create(request.justificacion(), request.montoEstimado(),
                request.referenciaPresupuesto(), request.proveedorSugerido(),
                request.items().stream().map(i -> new ServicioReposicion.Item(i.productoId(), i.cantidad(), i.observacion())).toList(),
                UsuarioActual.get());
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("@permisos.puede('REPOSICIONES','EDITAR')")
    public SolicitudReposicion submit(@PathVariable Long id) {
        return service.submit(id);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("@permisos.puede('REPOSICIONES','EDITAR')")
    public SolicitudReposicion approve(@PathVariable Long id) {
        return service.approve(id, UsuarioActual.get());
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("@permisos.puede('REPOSICIONES','EDITAR')")
    public SolicitudReposicion reject(@PathVariable Long id, @Valid @RequestBody RejectRequest request) {
        return service.reject(id, request.motivo(), UsuarioActual.get());
    }

    public record CreateRequest(@NotBlank String justificacion, BigDecimal montoEstimado,
                                String referenciaPresupuesto, String proveedorSugerido,
                                @NotEmpty List<ItemRequest> items) {}
    public record ItemRequest(@NotNull Long productoId, @NotNull BigDecimal cantidad, String observacion) {}
    public record RejectRequest(@NotBlank String motivo) {}
}
