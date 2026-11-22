package com.higienesalud.smartsys.security;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.exception.*;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class ServicioJwt {

    private final SecretKey key;
    private final long expirationMinutes;

    public ServicioJwt(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-minutes:480}") long expirationMinutes) {
        String value = secret == null ? "" : secret.trim();
        if (value.length() < 32
                || value.contains("CAMBIE")
                || value.contains("SmartSysChangeThis")) {
            throw new IllegalStateException(
                    "JWT_SECRET debe configurarse con al menos 32 caracteres y no puede usar el valor de ejemplo");
        }
        if (expirationMinutes < 5 || expirationMinutes > 480) {
            throw new IllegalStateException("JWT_EXPIRATION_MINUTES debe estar entre 5 y 480 minutos");
        }
        this.key = Keys.hmacShaKeyFor(value.getBytes(StandardCharsets.UTF_8));
        this.expirationMinutes = expirationMinutes;
    }

    public String generate(Usuario usuario) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(usuario.getEmail())
                .claim("uid", usuario.getId())
                .claim("rol", usuario.getRol().name())
                .claim("nombre", usuario.getNombres() + " " + usuario.getApellidos())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();
    }

    public String generateMfaChallenge(Usuario usuario) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(usuario.getEmail())
                .claim("uid", usuario.getId())
                .claim("purpose", "mfa")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(5, ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();
    }

    public String mfaSubject(String token) {
        Claims payload = claims(token);
        if (!"mfa".equals(payload.get("purpose", String.class))) {
            throw new IllegalArgumentException("Token MFA inválido");
        }
        return payload.getSubject();
    }

    public String subject(String token) {
        return claims(token).getSubject();
    }

    public Long userId(String token) {
        Object uid = claims(token).get("uid");
        return uid instanceof Number number ? number.longValue() : null;
    }

    public boolean valid(String token) {
        try {
            claims(token);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    private Claims claims(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
