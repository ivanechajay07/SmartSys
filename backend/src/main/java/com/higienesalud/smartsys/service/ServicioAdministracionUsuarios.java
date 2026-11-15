package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.exception.ExcepcionNoEncontrada;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

/**
 * Administracion de usuarios y roles.
 * No expone hashes de contrasena ni permite eliminar cuentas con historial:
 * las cuentas se desactivan para conservar la trazabilidad de auditoria.
 */
@Service
public class ServicioAdministracionUsuarios {

    private final UsuarioDao Dao;
    private final TokenRefrescoDao TokenRefrescoDao;
    private final PasswordEncoder passwordEncoder;
    private final ServicioPresencia ServicioPresencia;

    public ServicioAdministracionUsuarios(UsuarioDao Dao,
                               TokenRefrescoDao TokenRefrescoDao,
                               PasswordEncoder passwordEncoder,
                               ServicioPresencia ServicioPresencia) {
        this.Dao = Dao;
        this.TokenRefrescoDao = TokenRefrescoDao;
        this.passwordEncoder = passwordEncoder;
        this.ServicioPresencia = ServicioPresencia;
    }

    @Transactional(readOnly = true)
    public List<UserDetail> list(Rol rol, boolean incluirInactivos) {
        return Dao.findAll().stream()
                .filter(usuario -> incluirInactivos || usuario.isActivo())
                .filter(usuario -> rol == null || usuario.getRol() == rol)
                .sorted(Comparator.comparing(Usuario::getNombres).thenComparing(Usuario::getApellidos))
                .map(this::toDetail)
                .toList();
    }

    @Transactional
    public UserDetail create(String nombres, String apellidos, String email, String telefono,
                             Rol rol, String password, boolean activo) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
        if (Dao.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ExcepcionNegocio("El correo ya está registrado");
        }
        Usuario usuario = Usuario.builder()
                .nombres(nombres.trim())
                .apellidos(apellidos.trim())
                .email(normalizedEmail)
                .idRol(rolId(rol))
                .telefono(clean(telefono))
                .rol(rol)
                .passwordHash(passwordEncoder.encode(password))
                .activo(activo)
                .build();
        return toDetail(Dao.save(usuario));
    }

    @Transactional
    public UserDetail update(Long id, String nombres, String apellidos, String telefono,
                             Rol rol, boolean activo, Usuario actor) {
        Usuario usuario = get(id);
        ensureNotSelfLockout(usuario, rol, activo, actor);
        ensureAdminRemains(usuario, rol, activo);

        usuario.setNombres(nombres.trim());
        usuario.setApellidos(apellidos.trim());
        usuario.setTelefono(clean(telefono));
        usuario.setRol(rol);
        usuario.setIdRol(rolId(rol));
        usuario.setActivo(activo);
        Usuario saved = Dao.save(usuario);
        if (!activo) {
            TokenRefrescoDao.revokeAllByUsuarioId(id);
        }
        return toDetail(saved);
    }

    @Transactional
    public UserDetail changeStatus(Long id, boolean activo, Usuario actor) {
        Usuario usuario = get(id);
        ensureNotSelfLockout(usuario, usuario.getRol(), activo, actor);
        ensureAdminRemains(usuario, usuario.getRol(), activo);
        usuario.setActivo(activo);
        Usuario saved = Dao.save(usuario);
        if (!activo) {
            TokenRefrescoDao.revokeAllByUsuarioId(id);
        }
        return toDetail(saved);
    }

    @Transactional
    public void resetPassword(Long id, String newPassword) {
        if (newPassword == null || newPassword.length() < 10) {
            throw new ExcepcionNegocio("La contraseña debe tener al menos 10 caracteres");
        }
        Usuario usuario = get(id);
        usuario.setPasswordHash(passwordEncoder.encode(newPassword));
        usuario.setIntentosFallidos(0);
        usuario.setBloqueadoHasta(null);
        Dao.save(usuario);
        TokenRefrescoDao.revokeAllByUsuarioId(id);
    }

    @Transactional
    public UserDetail updateAvatar(Long id, String avatarUrl) {
        Usuario usuario = get(id);
        usuario.setAvatarUrl(ValidadorAvatar.normalize(avatarUrl));
        return toDetail(Dao.save(usuario));
    }

    @Transactional(readOnly = true)
    public List<ServicioPresencia.Presence> presence() {
        return Dao.findAll().stream()
                .map(usuario -> ServicioPresencia.snapshot(usuario.getId()))
                .toList();
    }

    private Usuario get(Long id) {
        return Dao.findById(id)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Usuario no encontrado"));
    }

    private void ensureNotSelfLockout(Usuario target, Rol nuevoRol, boolean activo, Usuario actor) {
        if (actor != null && actor.getId().equals(target.getId())
                && (!activo || nuevoRol != Rol.ADMINISTRADOR)) {
            throw new ExcepcionNegocio(
                    "No puede desactivar su propia cuenta ni retirar su rol de administrador");
        }
    }

    private void ensureAdminRemains(Usuario target, Rol nuevoRol, boolean activo) {
        boolean wasActiveAdmin = target.getRol() == Rol.ADMINISTRADOR && target.isActivo();
        boolean stopsBeingActiveAdmin = wasActiveAdmin
                && (nuevoRol != Rol.ADMINISTRADOR || !activo);
        if (stopsBeingActiveAdmin && Dao.countByRolAndActivoTrue(Rol.ADMINISTRADOR) <= 1) {
            throw new ExcepcionNegocio("Debe existir al menos un administrador activo");
        }
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Integer rolId(Rol rol) {
        return switch (rol) {
            case ADMINISTRADOR -> 1;
            case GERENTE_GENERAL -> 2;
            case JEFE_LOGISTICA -> 3;
            case ENCARGADO_ALMACEN -> 4;
            case PERSONAL_OPERATIVO -> 5;
            case PERSONAL_LOGISTICA -> 6;
            case RESPONSABLE_DISTRIBUCION -> 7;
            case TRANSPORTISTA -> 8;
        };
    }

    private UserDetail toDetail(Usuario usuario) {
        return new UserDetail(usuario.getId(), usuario.getNombres(), usuario.getApellidos(),
                usuario.getEmail(), usuario.getTelefono(), usuario.getRol(), usuario.isActivo(),
                usuario.getBloqueadoHasta(), usuario.getUltimoAcceso(), usuario.getCreatedAt(),
                usuario.getAvatarUrl());
    }

    public record UserDetail(Long id, String nombres, String apellidos, String email,
                             String telefono, Rol rol, boolean activo,
                             LocalDateTime bloqueadoHasta, LocalDateTime ultimoAcceso,
                             LocalDateTime createdAt, String avatarUrl) {
    }
}
