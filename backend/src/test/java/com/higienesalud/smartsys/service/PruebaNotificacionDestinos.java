package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.NotificacionDao;
import com.higienesalud.smartsys.exception.ExcepcionNoEncontrada;
import com.higienesalud.smartsys.model.Notificacion;
import com.higienesalud.smartsys.model.Rol;
import com.higienesalud.smartsys.model.Usuario;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PruebaNotificacionDestinos {

    private final NotificacionDao dao = mock(NotificacionDao.class);
    private final SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
    private final ServicioNotificacion service = new ServicioNotificacion(dao, messaging);

    @Test
    void notificacionPersonalSeEnviaSoloAlUsuario() {
        when(dao.save(any(Notificacion.class))).thenAnswer(inv -> inv.getArgument(0));
        Usuario usuario = usuario(7L, "ana@smartsys.local", Rol.ENCARGADO_ALMACEN);

        service.toUser(usuario, "Título", "Mensaje", "INFO");

        verify(messaging).convertAndSendToUser(eq("ana@smartsys.local"),
                eq("/queue/notifications"), any(Notificacion.class));
        verify(messaging, never()).convertAndSend(eq("/topic/notifications"), any(Notificacion.class));
    }

    @Test
    void notificacionDeRolSeEnviaAlTopicDelRol() {
        when(dao.save(any(Notificacion.class))).thenAnswer(inv -> inv.getArgument(0));

        service.toRole(Rol.JEFE_LOGISTICA, "Título", "Mensaje", "INFO");

        verify(messaging).convertAndSend(eq("/topic/notifications/JEFE_LOGISTICA"),
                any(Notificacion.class));
        verify(messaging, never()).convertAndSend(eq("/topic/notifications"), any(Notificacion.class));
    }

    @Test
    void anuncioGeneralSeEnviaAlTopicGeneral() {
        when(dao.save(any(Notificacion.class))).thenAnswer(inv -> inv.getArgument(0));

        service.create(null, null, "Aviso", "Mensaje", "INFO");

        verify(messaging).convertAndSend(eq("/topic/notifications/general"),
                any(Notificacion.class));
    }

    @Test
    void noSePuedeMarcarLeidaUnaNotificacionDeOtroRol() {
        Notificacion notificacion = Notificacion.builder()
                .usuario(null)
                .rolDestino(Rol.JEFE_LOGISTICA)
                .titulo("Solo logística")
                .mensaje("Contenido")
                .tipo("INFO")
                .leida(false)
                .fecha(LocalDateTime.now())
                .build();
        notificacion.setId(10L);
        when(dao.findById(10L)).thenReturn(Optional.of(notificacion));

        assertThatThrownBy(() -> service.markRead(10L, usuario(1L, "admin@smartsys.local", Rol.ADMINISTRADOR)))
                .isInstanceOf(ExcepcionNoEncontrada.class);
    }

    @Test
    void elRolDestinoSiPuedeMarcarLeidaSuNotificacion() {
        Notificacion notificacion = Notificacion.builder()
                .rolDestino(Rol.JEFE_LOGISTICA)
                .titulo("Solo logística")
                .mensaje("Contenido")
                .tipo("INFO")
                .leida(false)
                .fecha(LocalDateTime.now())
                .build();
        notificacion.setId(11L);
        when(dao.findById(11L)).thenReturn(Optional.of(notificacion));
        when(dao.save(any(Notificacion.class))).thenAnswer(inv -> inv.getArgument(0));

        Notificacion saved = service.markRead(11L,
                usuario(2L, "logistica@smartsys.local", Rol.JEFE_LOGISTICA));

        assertThat(saved.isLeida()).isTrue();
    }

    private Usuario usuario(Long id, String email, Rol rol) {
        Usuario usuario = Usuario.builder().email(email).rol(rol).activo(true)
                .nombres("Nombre").apellidos("Apellido").build();
        usuario.setId(id);
        return usuario;
    }
}
