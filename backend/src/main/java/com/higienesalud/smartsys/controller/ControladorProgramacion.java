package com.higienesalud.smartsys.controller;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/schedules")
public class ControladorProgramacion {

    private final ServicioProgramacion service;

    public ControladorProgramacion(ServicioProgramacion service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("@permisos.puede('PROGRAMACION','VER')")
    public List<ProgramacionAbastecimiento> list(
            @RequestParam(required = false) Long entidadId,
            @RequestParam(required = false) Long contratoId,
            @RequestParam(required = false) Long productoId,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return service.list(entidadId, contratoId, productoId, estado, desde, hasta);
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permisos.puede('PROGRAMACION','VER')")
    public ProgramacionAbastecimiento get(@PathVariable Long id) {
        return service.get(id);
    }

    @GetMapping("/preview")
    @PreAuthorize("@permisos.puede('PROGRAMACION','VER')")
    public List<ServicioProgramacion.PreviewItem> preview(@RequestParam Long tdrItemId,
                                                         @RequestParam Long puntoId) {
        return service.preview(tdrItemId, puntoId);
    }

    @PostMapping("/confirm")
    @PreAuthorize("@permisos.puede('PROGRAMACION','CREAR')")
    public List<ProgramacionAbastecimiento> confirm(@Valid @RequestBody ConfirmRequest request) {
        return service.confirm(request.tdrItemId(), request.puntoId(), request.items());
    }

    @PostMapping
    @PreAuthorize("@permisos.puede('PROGRAMACION','CREAR')")
    public ProgramacionAbastecimiento create(@Valid @RequestBody CreateRequest request) {
        return service.create(request.tdrItemId(), request.puntoId(), request.fecha(), request.cantidad());
    }

    @PostMapping("/{id}/reschedule")
    @PreAuthorize("@permisos.puede('PROGRAMACION','EDITAR')")
    public ProgramacionAbastecimiento reschedule(@PathVariable Long id,
                                                 @Valid @RequestBody RescheduleRequest request) {
        return service.reschedule(id, request.fecha(), request.motivo());
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("@permisos.puede('PROGRAMACION','EDITAR')")
    public ProgramacionAbastecimiento cancel(@PathVariable Long id, @Valid @RequestBody CancelRequest request) {
        return service.cancel(id, request.motivo());
    }

    public record ConfirmRequest(@NotNull Long tdrItemId, @NotNull Long puntoId,
                                 @NotEmpty List<ServicioProgramacion.PreviewItem> items) {}
    public record CreateRequest(@NotNull Long tdrItemId, @NotNull Long puntoId,
                                @NotNull LocalDate fecha, @NotNull BigDecimal cantidad) {}
    public record RescheduleRequest(@NotNull LocalDate fecha, String motivo) {}
    public record CancelRequest(String motivo) {}
}
