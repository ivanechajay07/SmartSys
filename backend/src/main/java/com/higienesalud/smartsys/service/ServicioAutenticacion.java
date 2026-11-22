package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.UsuarioDao;
import com.higienesalud.smartsys.exception.ExcepcionCredenciales;
import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.model.Rol;
import com.higienesalud.smartsys.model.Usuario;
import com.higienesalud.smartsys.security.ServicioJwt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Casos de uso de autenticacion: login, rotacion de refresh token,
 * cierre de sesion y cambio de contrasena.
 */
@Service
public class ServicioAutenticacion {

    private static final int MAX_INTENTOS = 5;
    private static final long BLOQUEO_MINUTOS = 15;

    private final AuthenticationManager authenticationManager;
    private final UsuarioDao usuarioDao;
    private final ServicioJwt ServicioJwt;
    private final ServicioTokenRefresco ServicioTokenRefresco;
    private final PasswordEncoder passwordEncoder;
    private final ServicioAccesoUsuario ServicioAccesoUsuario;
    private final ServicioNotificacion servicioNotificacion;
    private final com.higienesalud.smartsys.security.ServicioMfa servicioMfa;
    private final long expirationMinutes;

    public ServicioAutenticacion(AuthenticationManager authenticationManager,
                       UsuarioDao usuarioDao,
                       ServicioJwt ServicioJwt,
                       ServicioTokenRefresco ServicioTokenRefresco,
                       PasswordEncoder passwordEncoder,
                       ServicioAccesoUsuario ServicioAccesoUsuario,
                       ServicioNotificacion servicioNotificacion,
                       com.higienesalud.smartsys.security.ServicioMfa servicioMfa,
                       @Value("${app.jwt.expiration-minutes:30}") long expirationMinutes) {
        this.authenticationManager = authenticationManager;
        this.usuarioDao = usuarioDao;
        this.ServicioJwt = ServicioJwt;
        this.ServicioTokenRefresco = ServicioTokenRefresco;
        this.passwordEncoder = passwordEncoder;
        this.ServicioAccesoUsuario = ServicioAccesoUsuario;
        this.servicioNotificacion = servicioNotificacion;
        this.servicioMfa = servicioMfa;
        this.expirationMinutes = expirationMinutes;
    }

    public LoginResult login(String email, String password) {
        Usuario usuario = usuarioDao.findByEmailIgnoreCase(email)
                .orElseThrow(ExcepcionCredenciales::generica);

        // Para correos inexistentes o inactivos se mantiene una respuesta uniforme.
        if (!usuario.isActivo()) {
            throw ExcepcionCredenciales.generica();
        }

        LocalDateTime ahora = LocalDateTime.now();
        if (usuario.getBloqueadoHasta() != null) {
            if (usuario.getBloqueadoHasta().isAfter(ahora)) {
                long segundos = Math.max(1,
                        Duration.between(ahora, usuario.getBloqueadoHasta()).getSeconds());
                throw ExcepcionCredenciales.bloqueada(
                        usuario.getIntentosFallidos(), usuario.getBloqueadoHasta(), segundos);
            }
            // El bloqueo ya expiró: el siguiente intento vuelve a contar desde cero.
            usuario.setBloqueadoHasta(null);
            usuario.setIntentosFallidos(0);
        }

        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password));
            SecurityContextHolder.getContext().setAuthentication(auth);
            if (usuario.isMfaEnabled()) {
                return new LoginResult(null, null, new MfaChallenge(
                        true,
                        ServicioJwt.generateMfaChallenge(usuario),
                        usuario.getEmail(),
                        usuario.getNombres() + " " + usuario.getApellidos()));
            }
            String refreshToken = ServicioTokenRefresco.issue(usuario);
            try {
                ServicioAccesoUsuario.registerSuccessfulLogin(usuario.getId());
            } catch (RuntimeException ignored) {
                // El acceso ya fue autenticado; la marca de último acceso es best-effort.
            }
            return new LoginResult(response(usuario), refreshToken, null);
        } catch (ExcepcionNegocio ex) {
            throw ex;
        } catch (Exception ex) {
            int attempts = usuario.getIntentosFallidos() + 1;
            usuario.setIntentosFallidos(attempts);
            if (attempts >= MAX_INTENTOS) {
                LocalDateTime bloqueadoHasta = LocalDateTime.now().plusMinutes(BLOQUEO_MINUTOS);
                usuario.setBloqueadoHasta(bloqueadoHasta);
                usuarioDao.save(usuario);
                throw ExcepcionCredenciales.bloqueada(
                        attempts, bloqueadoHasta, BLOQUEO_MINUTOS * 60);
            }
            usuarioDao.save(usuario);
            throw ExcepcionCredenciales.intento(attempts, MAX_INTENTOS - attempts);
        }
    }

    @Transactional
    public LoginResult refresh(String refreshToken) {
        Usuario usuario = ServicioTokenRefresco.rotate(refreshToken);
        return new LoginResult(response(usuario), ServicioTokenRefresco.issue(usuario), null);
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
    public LoginResult verifyMfa(String mfaToken, String code) {
        String email;
        try {
            email = ServicioJwt.mfaSubject(mfaToken);
        } catch (RuntimeException ex) {
            throw new ExcepcionNegocio("Verificación MFA expirada. Inicia sesión nuevamente.");
        }
        Usuario usuario = usuarioDao.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ExcepcionNegocio("Credenciales invalidas"));
        if (!usuario.isMfaEnabled() || !servicioMfa.verify(usuario.getMfaSecret(), code)) {
            throw new ExcepcionNegocio("Código MFA inválido");
        }
        try {
            ServicioAccesoUsuario.registerSuccessfulLogin(usuario.getId());
        } catch (RuntimeException ignored) {
            // Marca de último acceso best-effort.
        }
        return new LoginResult(response(usuario), ServicioTokenRefresco.issue(usuario), null);
    }

    @Transactional
    public MfaSetupResponse setupMfa() {
        Usuario usuario = current();
        if (usuario.isMfaEnabled()) {
            throw new ExcepcionNegocio("MFA ya está activo para esta cuenta");
        }
        String secret = servicioMfa.generateSecret();
        usuario.setMfaSecret(secret);
        usuarioDao.save(usuario);
        return new MfaSetupResponse(secret, servicioMfa.otpauthUri(usuario.getEmail(), secret));
    }

    @Transactional
    public void enableMfa(String code) {
        Usuario usuario = current();
        if (usuario.getMfaSecret() == null || !servicioMfa.verify(usuario.getMfaSecret(), code)) {
            throw new ExcepcionNegocio("Código MFA inválido");
        }
        usuario.setMfaEnabled(true);
        usuarioDao.save(usuario);
    }

    @Transactional
    public void disableMfa(String code) {
        Usuario usuario = current();
        if (usuario.isMfaEnabled()) {
            if (!servicioMfa.verify(usuario.getMfaSecret(), code)) {
                throw new ExcepcionNegocio("Código MFA inválido");
            }
        }
        usuario.setMfaEnabled(false);
        usuario.setMfaSecret(null);
        usuarioDao.save(usuario);
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

    private TokenResponse response(Usuario usuario) {
        return new TokenResponse(ServicioJwt.generate(usuario), "Bearer",
                expirationMinutes * 60, usuario.getId(), usuario.getEmail(),
                usuario.getNombres() + " " + usuario.getApellidos(), usuario.getRol().name(),
                usuario.getTelefono(), usuario.getAvatarUrl());
    }

    private MeResponse profile(Usuario usuario) {
        return new MeResponse(usuario.getId(), usuario.getEmail(),
                usuario.getNombres() + " " + usuario.getApellidos(), usuario.getRol().name(),
                usuario.getNombres(), usuario.getApellidos(), usuario.getTelefono(),
                usuario.getAvatarUrl(), usuario.isMfaEnabled(),
                usuario.getUltimoAcceso(), usuario.getCreatedAt());
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

    public record LoginResult(TokenResponse response, String refreshToken, MfaChallenge mfa) {
    }

    public record MfaChallenge(boolean mfaRequired, String mfaToken, String email, String nombre) {
    }

    public record MfaSetupResponse(String secret, String otpauthUri) {
    }

    public record TokenResponse(String token, String type, long expiresIn,
                                Long id, String email, String nombre, String rol,
                                String telefono, String avatarUrl) {
    }

    public record MeResponse(Long id, String email, String nombre, String rol,
                             String nombres, String apellidos, String telefono, String avatarUrl,
                             boolean mfaEnabled, LocalDateTime ultimoAcceso, LocalDateTime createdAt) {
    }
}
