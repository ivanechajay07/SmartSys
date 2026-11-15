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
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
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
