package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.TokenRefrescoDao;
import com.higienesalud.smartsys.dao.UsuarioDao;
import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.model.Rol;
import com.higienesalud.smartsys.model.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PruebaServicioAdministracionUsuarios {

    @Mock private UsuarioDao Dao;
    @Mock private TokenRefrescoDao TokenRefrescoDao;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private ServicioPresencia ServicioPresencia;

    @InjectMocks private ServicioAdministracionUsuarios service;

    private Usuario admin;
    private Usuario actor;

    @BeforeEach
    void setUp() {
        admin = Usuario.builder()
                .nombres("Admin").apellidos("Dos")
                .email("admin2@smartsys.local").passwordHash("old")
                .rol(Rol.ADMINISTRADOR).activo(true).build();
        admin.setId(2L);
        actor = Usuario.builder()
                .nombres("Super").apellidos("Admin")
                .email("admin@smartsys.local").passwordHash("old")
                .rol(Rol.ADMINISTRADOR).activo(true).build();
        actor.setId(1L);
    }

    @Test
    void createNormalizesEmailAndHashesPassword() {
        when(Dao.existsByEmailIgnoreCase("nuevo@smartsys.local")).thenReturn(false);
        when(passwordEncoder.encode("ClaveSegura123")).thenReturn("$2a$12$hash");
        when(Dao.save(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });

        ServicioAdministracionUsuarios.UserDetail detail = service.create("  Maria ", " Lopez ",
                "Nuevo@SmartSys.Local", "999888777", Rol.ENCARGADO_ALMACEN,
                "ClaveSegura123", true);

        assertThat(detail.id()).isEqualTo(10L);
        assertThat(detail.email()).isEqualTo("nuevo@smartsys.local");
        verify(passwordEncoder).encode("ClaveSegura123");
        verify(Dao).save(argThat(usuario ->
                usuario.getPasswordHash().equals("$2a$12$hash")
                        && usuario.getRol() == Rol.ENCARGADO_ALMACEN
                        && usuario.getTelefono().equals("999888777")));
    }

    @Test
    void createRejectsDuplicatedEmail() {
        when(Dao.existsByEmailIgnoreCase("admin2@smartsys.local")).thenReturn(true);

        assertThatThrownBy(() -> service.create("Otro", "Usuario", "admin2@smartsys.local",
                null, Rol.PERSONAL_LOGISTICA, "ClaveSegura123", true))
                .isInstanceOf(ExcepcionNegocio.class)
                .hasMessage("El correo ya está registrado");

        verify(Dao, never()).save(any());
    }

    @Test
    void updateBlocksSelfDeactivation() {
        when(Dao.findById(1L)).thenReturn(Optional.of(actor));

        assertThatThrownBy(() -> service.update(1L, "Super", "Admin", null,
                Rol.ADMINISTRADOR, false, actor))
                .isInstanceOf(ExcepcionNegocio.class)
                .hasMessageContaining("No puede desactivar su propia cuenta");
    }

    @Test
    void updateBlocksRemovingTheLastActiveAdministrator() {
        when(Dao.findById(2L)).thenReturn(Optional.of(admin));
        when(Dao.countByRolAndActivoTrue(Rol.ADMINISTRADOR)).thenReturn(1L);

        assertThatThrownBy(() -> service.update(2L, "Admin", "Dos", null,
                Rol.JEFE_LOGISTICA, true, actor))
                .isInstanceOf(ExcepcionNegocio.class)
                .hasMessage("Debe existir al menos un administrador activo");
    }

    @Test
    void resetPasswordHashesValueClearsLockAndRevokesRefreshTokens() {
        admin.setIntentosFallidos(4);
        when(Dao.findById(2L)).thenReturn(Optional.of(admin));
        when(passwordEncoder.encode("NuevaClave2026!")).thenReturn("$2a$12$new");

        service.resetPassword(2L, "NuevaClave2026!");

        assertThat(admin.getPasswordHash()).isEqualTo("$2a$12$new");
        assertThat(admin.getIntentosFallidos()).isZero();
        assertThat(admin.getBloqueadoHasta()).isNull();
        verify(TokenRefrescoDao).revokeAllByUsuarioId(2L);
    }

    @Test
    void resetPasswordRejectsShortPassword() {
        assertThatThrownBy(() -> service.resetPassword(2L, "corta"))
                .isInstanceOf(ExcepcionNegocio.class)
                .hasMessageContaining("al menos 10 caracteres");

        verifyNoInteractions(passwordEncoder);
    }
}
