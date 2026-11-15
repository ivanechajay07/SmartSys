package com.higienesalud.smartsys.controller;

import com.higienesalud.smartsys.service.ServicioTrazabilidad;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class ControladorTrazabilidad {

    private final ServicioTrazabilidad service;

    public ControladorTrazabilidad(ServicioTrazabilidad service) {
        this.service = service;
    }

    @GetMapping("/service-orders")
    @PreAuthorize("@permisos.puede('TRAZABILIDAD','VER')")
    public List<ServicioTrazabilidad.OrdenVista> orders() {
        return service.ordenes();
    }

    @GetMapping("/warehouse/entries")
    @PreAuthorize("@permisos.puede('TRAZABILIDAD','VER')")
    public List<ServicioTrazabilidad.IngresoVista> entries() {
        return service.ingresos();
    }

    @GetMapping("/warehouse/exits")
    @PreAuthorize("@permisos.puede('TRAZABILIDAD','VER')")
    public List<ServicioTrazabilidad.SalidaVista> exits() {
        return service.salidas();
    }
}
