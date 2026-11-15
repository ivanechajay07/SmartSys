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
import jakarta.validation.constraints.Pattern;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class ControladorRecepcion {

    private final ServicioRecepcion service;
    private final UsuarioActual UsuarioActual;

    public ControladorRecepcion(ServicioRecepcion service, UsuarioActual UsuarioActual) {
        this.service = service;
        this.UsuarioActual = UsuarioActual;
    }

    @GetMapping("/receptions")
    @PreAuthorize("@permisos.puede('RECEPCIONES','VER')")
    public List<Recepcion> list() {
        return service.list();
    }

    @GetMapping("/receptions/{id}")
    @PreAuthorize("@permisos.puede('RECEPCIONES','VER')")
    public Recepcion get(@PathVariable Long id) {
        return service.get(id);
    }

    @GetMapping("/dispatches/{id}/receptions")
    @PreAuthorize("@permisos.puede('RECEPCIONES','VER')")
    public List<Recepcion> byDispatch(@PathVariable Long id) {
        return service.byDispatch(id);
    }

    @PostMapping("/dispatches/{id}/receptions")
    @PreAuthorize("@permisos.puede('RECEPCIONES','CREAR')")
    public Recepcion register(@PathVariable Long id, @Valid @RequestBody RecepcionRequest request) {
        return service.register(id, request.recibidoPor(), request.documentoIdentidad(),
                request.items().stream().map(i -> new ServicioRecepcion.Item(i.productoId(),
                        i.cantidadRecibida(), i.cantidadRechazada(), i.observaciones())).toList(),
                request.observaciones(), request.evidenciaUrl(), UsuarioActual.get());
    }

    public record RecepcionRequest(@NotBlank String recibidoPor, String documentoIdentidad,
                                   @NotEmpty List<ItemRequest> items, String observaciones,
                                   @Pattern(regexp = "^https?://.+", message = "La evidencia debe ser una URL http o https") String evidenciaUrl) {}
    public record ItemRequest(@NotNull Long productoId, BigDecimal cantidadRecibida,
                              BigDecimal cantidadRechazada, String observaciones) {}
}
