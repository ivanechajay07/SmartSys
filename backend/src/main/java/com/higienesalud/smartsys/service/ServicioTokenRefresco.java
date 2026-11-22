package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class ServicioTokenRefresco {

    private final TokenRefrescoDao Dao;
    private final ServicioRevocacionTokens revocacion;
    private final long refreshDays;
    private final SecureRandom random = new SecureRandom();

    public ServicioTokenRefresco(TokenRefrescoDao Dao,
                               ServicioRevocacionTokens revocacion,
                               @Value("${app.jwt.refresh-days:7}") long refreshDays) {
        this.Dao = Dao;
        this.revocacion = revocacion;
        this.refreshDays = refreshDays;
    }

    @Transactional
    public String issue(Usuario usuario) {
        byte[] bytes = new byte[48];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Dao.save(TokenRefresco.builder()
                .usuario(usuario)
                .tokenHash(hash(raw))
                .expiraEn(LocalDateTime.now().plusDays(refreshDays))
                .revocado(false)
                .build());
        return raw;
    }

    @Transactional
    public Usuario rotate(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ExcepcionNegocio("Refresh token requerido");
        }
        TokenRefresco token = Dao.findByTokenHash(hash(raw))
                .orElseThrow(() -> new ExcepcionNegocio("Refresh token inválido"));
        if (token.isRevocado()) {
            // Reutilización de un token ya rotado: se invalidan todas las
            // sesiones del usuario para cortar una posible cadena robada.
            // La revocación corre en una transacción independiente porque
            // este método termina lanzando una excepción de negocio.
            revocacion.revokeAllFor(token.getUsuario().getId());
            throw new ExcepcionNegocio("Refresh token reutilizado; sesiones revocadas");
        }
        if (token.getExpiraEn().isBefore(LocalDateTime.now())) {
            throw new ExcepcionNegocio("Refresh token expirado");
        }
        if (!token.getUsuario().isActivo()) {
            throw new ExcepcionNegocio("Usuario inactivo");
        }
        token.setRevocado(true);
        Dao.save(token);
        return token.getUsuario();
    }

    @Transactional
    public void revoke(String raw) {
        Dao.findByTokenHash(hash(raw)).ifPresent(token -> {
            token.setRevocado(true);
            Dao.save(token);
        });
    }

    @Transactional
    public void revokeAllFor(Long usuarioId) {
        revocacion.revokeAllFor(usuarioId);
    }

    @Transactional(readOnly = true)
    public TokenRefresco valid(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ExcepcionNegocio("Refresh token requerido");
        }
        TokenRefresco token = Dao.findByTokenHash(hash(raw))
                .orElseThrow(() -> new ExcepcionNegocio("Refresh token inválido"));
        if (token.isRevocado() || token.getExpiraEn().isBefore(LocalDateTime.now())) {
            throw new ExcepcionNegocio("Refresh token expirado o revocado");
        }
        if (!token.getUsuario().isActivo()) {
            throw new ExcepcionNegocio("Usuario inactivo");
        }
        return token;
    }

    private String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo generar el hash del token", ex);
        }
    }
}
