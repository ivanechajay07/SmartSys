package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.UsuarioDao;
import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.model.Rol;
import com.higienesalud.smartsys.model.Usuario;
import com.higienesalud.smartsys.security.ServicioJwt;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Casos de uso de autenticacion: login, rotacion de refresh token,
 * cierre de sesion y cambio de contrasena.
 */
@Service
public class ServicioAutenticacion {

    private final AuthenticationManager authenticationManager;
    private final UsuarioDao usuarioDao;
    private final ServicioJwt ServicioJwt;
    private final ServicioTokenRefresco ServicioTokenRefresco;
    private final PasswordEncoder passwordEncoder;
    private final ServicioAccesoUsuario ServicioAccesoUsuario;
    private final ServicioNotificacion servicioNotificacion;

    public ServicioAutenticacion(AuthenticationManager authenticationManager,
                       UsuarioDao usuarioDao,
                       ServicioJwt ServicioJwt,
                       ServicioTokenRefresco ServicioTokenRefresco,
                       PasswordEncoder passwordEncoder,
                       ServicioAccesoUsuario ServicioAccesoUsuario,
                       ServicioNotificacion servicioNotificacion) {
        this.authenticationManager = authenticationManager;
        this.usuarioDao = usuarioDao;
        this.ServicioJwt = ServicioJwt;
        this.ServicioTokenRefresco = ServicioTokenRefresco;
        this.passwordEncoder = passwordEncoder;
        this.ServicioAccesoUsuario = ServicioAccesoUsuario;
        this.servicioNotificacion = servicioNotificacion;
    }

    public TokenResponse login(String email, String password) {
        Usuario usuario = usuarioDao.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ExcepcionNegocio("Credenciales invalidas"));

        if (!usuario.isActivo()) {
            throw new ExcepcionNegocio("Usuario inactivo");
        }
        if (usuario.getBloqueadoHasta() != null && usuario.getBloqueadoHasta().isAfter(LocalDateTime.now())) {
            throw new ExcepcionNegocio("Usuario bloqueado temporalmente");
        }

        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password));
            SecurityContextHolder.getContext().setAuthentication(auth);
            String refreshToken = ServicioTokenRefresco.issue(usuario);
            try {
                ServicioAccesoUsuario.registerSuccessfulLogin(usuario.getId());
            } catch (RuntimeException ignored) {
                // El acceso ya fue autenticado; la marca de último acceso es best-effort.
            }
            return response(usuario, refreshToken);
        } catch (ExcepcionNegocio ex) {
            throw ex;
        } catch (Exception ex) {
            int attempts = usuario.getIntentosFallidos() + 1;
            usuario.setIntentosFallidos(attempts);
            if (attempts >= 5) {
                usuario.setBloqueadoHasta(LocalDateTime.now().plusMinutes(15));
            }
            usuarioDao.save(usuario);
            throw new ExcepcionNegocio("Credenciales invalidas");
        }
    }

    @Transactional
    public TokenResponse refresh(String refreshToken) {
        Usuario usuario = ServicioTokenRefresco.rotate(refreshToken);
        return response(usuario, ServicioTokenRefresco.issue(usuario));
    }

    @Transactional
    public void logout(String refreshToken) {
        ServicioTokenRefresco.revoke(refreshToken);
    }

    /**
     * Registra una solicitud de recuperación para que el administrador verifique
     * la identidad y restablezca la contraseña. Nunca revela si el correo existe.
     */
    @Transactional
    public void forgotPassword(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        usuarioDao.findByEmailIgnoreCase(email.trim().toLowerCase())
                .filter(Usuario::isActivo)
                .ifPresent(usuario -> servicioNotificacion.toRole(
                        Rol.ADMINISTRADOR,
                        "Solicitud de recuperación de contraseña",
                        "El usuario " + usuario.getNombres() + " " + usuario.getApellidos()
                                + " (" + usuario.getEmail() + ") solicitó restablecer su contraseña. "
                                + "Verifica su identidad y actualiza la clave desde Usuarios y roles.",
                        "SEGURIDAD"));
    }

    @Transactional(readOnly = true)
    public MeResponse me() {
        return profile(current());
    }

    @Transactional
    public MeResponse updateProfile(String nombres, String apellidos, String telefono, String avatarUrl) {
        Usuario usuario = current();
        String cleanNombres = cleanRequired(nombres, "Los nombres son obligatorios");
        String cleanApellidos = cleanRequired(apellidos, "Los apellidos son obligatorios");
        usuario.setNombres(cleanNombres);
        usuario.setApellidos(cleanApellidos);
        usuario.setTelefono(telefono == null || telefono.isBlank() ? null : telefono.trim());
        usuario.setAvatarUrl(ValidadorAvatar.normalize(avatarUrl));
        return profile(usuarioDao.save(usuario));
    }

    @Transactional
    public MeResponse updateAvatar(String avatarUrl) {
        Usuario usuario = current();
        usuario.setAvatarUrl(ValidadorAvatar.normalize(avatarUrl));
        return profile(usuarioDao.save(usuario));
    }

    @Transactional
    public void changePassword(String currentPassword, String newPassword) {
        Usuario usuario = current();
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(usuario.getEmail(), currentPassword));
        if (newPassword.length() < 10) {
            throw new ExcepcionNegocio("La nueva contraseña debe tener al menos 10 caracteres");
        }
        if (newPassword.equalsIgnoreCase(currentPassword)) {
            throw new ExcepcionNegocio("La nueva contraseña debe ser diferente a la actual");
        }
        usuario.setPasswordHash(passwordEncoder.encode(newPassword));
        usuarioDao.save(usuario);
        ServicioTokenRefresco.revokeAllFor(usuario.getId());
    }

    private Usuario current() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioDao.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ExcepcionNegocio("Usuario no encontrado"));
    }

    private TokenResponse response(Usuario usuario, String refreshToken) {
        return new TokenResponse(ServicioJwt.generate(usuario), refreshToken, "Bearer",
                1800L, usuario.getId(), usuario.getEmail(),
                usuario.getNombres() + " " + usuario.getApellidos(), usuario.getRol().name(),
                usuario.getTelefono(), usuario.getAvatarUrl());
    }

    private MeResponse profile(Usuario usuario) {
        return new MeResponse(usuario.getId(), usuario.getEmail(),
                usuario.getNombres() + " " + usuario.getApellidos(), usuario.getRol().name(),
                usuario.getNombres(), usuario.getApellidos(), usuario.getTelefono(),
                usuario.getAvatarUrl(), usuario.getUltimoAcceso(), usuario.getCreatedAt());
    }

    private String cleanRequired(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ExcepcionNegocio(message);
        }
        String clean = value.trim();
        if (clean.length() > 120) {
            throw new ExcepcionNegocio("El nombre no puede superar 120 caracteres");
        }
        return clean;
    }

    public record TokenResponse(String token, String refreshToken, String type, long expiresIn,
                                Long id, String email, String nombre, String rol,
                                String telefono, String avatarUrl) {
    }

    public record MeResponse(Long id, String email, String nombre, String rol,
                             String nombres, String apellidos, String telefono, String avatarUrl,
                             LocalDateTime ultimoAcceso, LocalDateTime createdAt) {
    }
}
