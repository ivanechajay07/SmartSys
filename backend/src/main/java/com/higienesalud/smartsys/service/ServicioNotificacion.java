package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.exception.ExcepcionNoEncontrada;
import com.higienesalud.smartsys.model.Rol;
import com.higienesalud.smartsys.model.Usuario;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ServicioNotificacion {

    private final NotificacionDao Dao;
    private final SimpMessagingTemplate messagingTemplate;

    public ServicioNotificacion(NotificacionDao Dao, SimpMessagingTemplate messagingTemplate) {
        this.Dao = Dao;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public Notificacion create(Usuario usuario, Rol rolDestino, String titulo, String mensaje, String tipo) {
        Notificacion notificacion = Dao.save(Notificacion.builder()
                .usuario(usuario).rolDestino(rolDestino).titulo(titulo).mensaje(mensaje)
                .tipo(tipo == null ? "INFO" : tipo).leida(false).fecha(LocalDateTime.now()).build());
        messagingTemplate.convertAndSend("/topic/notifications", notificacion);
        return notificacion;
    }

    @Transactional
    public Notificacion toUser(Usuario usuario, String titulo, String mensaje, String tipo) {
        return create(usuario, null, titulo, mensaje, tipo);
    }

    @Transactional
    public Notificacion toRole(Rol rol, String titulo, String mensaje, String tipo) {
        return create(null, rol, titulo, mensaje, tipo);
    }

    @Transactional(readOnly = true)
    public List<Notificacion> listFor(Usuario usuario) {
        return Dao.findAllByOrderByFechaDesc().stream()
                .filter(n -> (n.getUsuario() != null && n.getUsuario().getId().equals(usuario.getId()))
                        || (n.getUsuario() == null
                        && (n.getRolDestino() == null || n.getRolDestino() == usuario.getRol())))
                .toList();
    }

    @Transactional(readOnly = true)
    public long unreadFor(Usuario usuario) {
        return listFor(usuario).stream().filter(n -> !n.isLeida()).count();
    }

    @Transactional
    public Notificacion markRead(Long id, Usuario usuario) {
        Notificacion notificacion = Dao.findById(id)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Notificación no encontrada"));
        boolean allowed = notificacion.getUsuario() == null || notificacion.getUsuario().getId().equals(usuario.getId());
        if (!allowed) {
            throw new ExcepcionNoEncontrada("Notificación no encontrada");
        }
        notificacion.setLeida(true);
        return Dao.save(notificacion);
    }

    @Transactional
    public void markAllRead(Usuario usuario) {
        listFor(usuario).forEach(n -> {
            if (!n.isLeida()) {
                n.setLeida(true);
                Dao.save(n);
            }
        });
    }
}
