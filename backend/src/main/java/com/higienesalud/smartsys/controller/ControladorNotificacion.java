package com.higienesalud.smartsys.controller;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.security.UsuarioActual;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@PreAuthorize("@permisos.puede('NOTIFICACIONES','VER')")
public class ControladorNotificacion {

    private final ServicioNotificacion service;
    private final UsuarioActual UsuarioActual;

    public ControladorNotificacion(ServicioNotificacion service, UsuarioActual UsuarioActual) {
        this.service = service;
        this.UsuarioActual = UsuarioActual;
    }

    @GetMapping
    public List<Notificacion> list() {
        return service.listFor(UsuarioActual.get());
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unread() {
        return Map.of("count", service.unreadFor(UsuarioActual.get()));
    }

    @PostMapping("/{id}/read")
    @PreAuthorize("@permisos.puede('NOTIFICACIONES','EDITAR')")
    public Notificacion read(@PathVariable Long id) {
        return service.markRead(id, UsuarioActual.get());
    }

    @PostMapping("/read-all")
    @PreAuthorize("@permisos.puede('NOTIFICACIONES','EDITAR')")
    public void readAll() {
        service.markAllRead(UsuarioActual.get());
    }
}
