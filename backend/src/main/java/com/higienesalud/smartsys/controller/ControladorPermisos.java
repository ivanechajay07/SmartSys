package com.higienesalud.smartsys.controller;

import com.higienesalud.smartsys.service.ServicioPermisos;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class ControladorPermisos {

    private final ServicioPermisos service;

    public ControladorPermisos(ServicioPermisos service) {
        this.service = service;
    }

    @GetMapping("/permissions/modules")
    public List<ServicioPermisos.ModuloDef> modules() {
        return service.modulos();
    }

    @GetMapping("/auth/permissions")
    public List<ServicioPermisos.PermisoVista> mine() {
        return service.actuales();
    }

    @GetMapping("/roles/{id}/permissions")
    @PreAuthorize("@permisos.puede('USUARIOS','VER')")
    public List<ServicioPermisos.PermisoVista> byRole(@PathVariable Integer id) {
        return service.porRol(id);
    }

    @PutMapping("/roles/{id}/permissions")
    @PreAuthorize("@permisos.puede('USUARIOS','EDITAR')")
    public List<ServicioPermisos.PermisoVista> update(@PathVariable Integer id,
                                                      @RequestBody List<ServicioPermisos.PermisoItem> items) {
        return service.actualizar(id, items);
    }
}
