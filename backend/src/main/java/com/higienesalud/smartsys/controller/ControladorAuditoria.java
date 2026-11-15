package com.higienesalud.smartsys.controller;

import com.higienesalud.smartsys.model.Auditoria;
import com.higienesalud.smartsys.service.ServicioAuditoria;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/audit")
public class ControladorAuditoria {

    private final ServicioAuditoria service;

    public ControladorAuditoria(ServicioAuditoria service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("@permisos.puede('AUDITORIA','VER')")
    public List<Auditoria> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return service.list(desde, hasta);
    }
}
