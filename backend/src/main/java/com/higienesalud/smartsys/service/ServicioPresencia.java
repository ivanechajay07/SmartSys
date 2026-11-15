package com.higienesalud.smartsys.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Presencia en memoria basada en la última petición autenticada de cada usuario.
 * Es suficiente para una instancia; en un despliegue horizontal se sustituiría
 * por Redis manteniendo este mismo contrato.
 */
@Service
public class ServicioPresencia {

    private static final Duration ONLINE_WINDOW = Duration.ofMinutes(3);

    private final ConcurrentHashMap<Long, Instant> lastSeen = new ConcurrentHashMap<>();

    public void touch(Long usuarioId) {
        if (usuarioId != null) {
            lastSeen.put(usuarioId, Instant.now());
        }
    }

    public Presence snapshot(Long usuarioId) {
        Instant seen = lastSeen.get(usuarioId);
        boolean online = seen != null && seen.plus(ONLINE_WINDOW).isAfter(Instant.now());
        return new Presence(usuarioId, seen, online, ONLINE_WINDOW.toSeconds());
    }

    public record Presence(Long usuarioId, Instant ultimaActividad, boolean enLinea, long ventanaSegundos) {
    }
}
