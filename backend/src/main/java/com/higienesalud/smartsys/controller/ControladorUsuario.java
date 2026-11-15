package com.higienesalud.smartsys.controller;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Administracion de usuarios y asignacion de roles.
 * Los datos expuestos no incluyen hash de contrasena ni contadores de bloqueo.
 */
@RestController
@RequestMapping("/api/v1/users")
public class ControladorUsuario {

    private final ServicioAdministracionUsuarios service;
    private final UsuarioActual UsuarioActual;

    public ControladorUsuario(ServicioAdministracionUsuarios service, UsuarioActual UsuarioActual) {
        this.service = service;
        this.UsuarioActual = UsuarioActual;
    }

    @GetMapping
    @PreAuthorize("@permisos.puede('USUARIOS','VER')")
    public List<ServicioAdministracionUsuarios.UserDetail> list(
            @RequestParam(required = false) Rol rol,
            @RequestParam(defaultValue = "false") boolean incluirInactivos) {
        return service.list(rol, incluirInactivos);
    }

    @GetMapping("/presence")
    @PreAuthorize("@permisos.puede('USUARIOS','VER')")
    public List<ServicioPresencia.Presence> presence() {
        return service.presence();
    }

    @GetMapping("/options")
    @PreAuthorize("@permisos.puede('DESPACHOS','VER')")
    public List<ServicioAdministracionUsuarios.UserDetail> options(
            @RequestParam(required = false) Rol rol) {
        return service.list(rol, false);
    }

    @PostMapping
    @PreAuthorize("@permisos.puede('USUARIOS','CREAR')")
    public ServicioAdministracionUsuarios.UserDetail create(@Valid @RequestBody CreateRequest request) {
        return service.create(request.nombres(), request.apellidos(), request.email(),
                request.telefono(), request.rol(), request.password(),
                request.activo() == null || request.activo());
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permisos.puede('USUARIOS','EDITAR')")
    public ServicioAdministracionUsuarios.UserDetail update(@PathVariable Long id,
                                                 @Valid @RequestBody UpdateRequest request) {
        return service.update(id, request.nombres(), request.apellidos(), request.telefono(),
                request.rol(), request.activo(), UsuarioActual.get());
    }

    @PostMapping("/{id}/status")
    @PreAuthorize("@permisos.puede('USUARIOS','EDITAR')")
    public ServicioAdministracionUsuarios.UserDetail changeStatus(@PathVariable Long id,
                                                       @Valid @RequestBody StatusRequest request) {
        return service.changeStatus(id, request.activo(), UsuarioActual.get());
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("@permisos.puede('USUARIOS','EDITAR')")
    public void resetPassword(@PathVariable Long id,
                              @Valid @RequestBody ResetPasswordRequest request) {
        service.resetPassword(id, request.newPassword());
    }

    @PostMapping("/{id}/avatar")
    @PreAuthorize("@permisos.puede('USUARIOS','EDITAR')")
    public ServicioAdministracionUsuarios.UserDetail updateAvatar(@PathVariable Long id,
                                                       @Valid @RequestBody AvatarRequest request) {
        return service.updateAvatar(id, request.avatarUrl());
    }

    public record CreateRequest(
            @NotBlank String nombres,
            @NotBlank String apellidos,
            @Email @NotBlank String email,
            String telefono,
            @NotNull Rol rol,
            @NotBlank @Size(min = 10, message = "La contraseña debe tener al menos 10 caracteres") String password,
            Boolean activo) {
    }

    public record UpdateRequest(
            @NotBlank String nombres,
            @NotBlank String apellidos,
            String telefono,
            @NotNull Rol rol,
            @NotNull Boolean activo) {
    }

    public record StatusRequest(@NotNull Boolean activo) {
    }

    public record ResetPasswordRequest(
            @NotBlank @Size(min = 10, message = "La contraseña debe tener al menos 10 caracteres") String newPassword) {
    }

    public record AvatarRequest(
            @Size(max = 400_000) String avatarUrl) {
    }
}
