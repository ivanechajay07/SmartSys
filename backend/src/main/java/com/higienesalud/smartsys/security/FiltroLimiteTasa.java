package com.higienesalud.smartsys.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Límite de tasa en memoria para endpoints sensibles (login, refresh,
 * recuperación de contraseña y exportaciones). Es una primera barrera para
 * una instancia; en despliegues horizontales debe complementarse con un
 * límite en el proxy o con un almacén compartido (Redis).
 */
@Component
public class FiltroLimiteTasa extends OncePerRequestFilter {

    private final boolean enabled;
    private final boolean trustProxy;
    private final int loginPerMinute;
    private final int forgotPerMinute;
    private final int exportPerMinute;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public FiltroLimiteTasa(
            @Value("${app.rate-limit.enabled:true}") boolean enabled,
            @Value("${app.rate-limit.trust-proxy:false}") boolean trustProxy,
            @Value("${app.rate-limit.login-per-minute:20}") int loginPerMinute,
            @Value("${app.rate-limit.forgot-per-minute:5}") int forgotPerMinute,
            @Value("${app.rate-limit.export-per-minute:20}") int exportPerMinute) {
        this.enabled = enabled;
        this.trustProxy = trustProxy;
        this.loginPerMinute = loginPerMinute;
        this.forgotPerMinute = forgotPerMinute;
        this.exportPerMinute = exportPerMinute;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        String category = null;
        int limit = 0;

        if ("/api/v1/auth/forgot-password".equals(path)) {
            category = "forgot";
            limit = forgotPerMinute;
        } else if ("/api/v1/auth/login".equals(path) || "/api/v1/auth/refresh".equals(path)) {
            category = "auth";
            limit = loginPerMinute;
        } else if (path.startsWith("/api/v1/reports/") && isExport(request)) {
            category = "export";
            limit = exportPerMinute;
        }

        if (category != null) {
            String key = category + ":" + clientIp(request);
            int bucketLimit = limit;
            if (buckets.size() > 10_000) {
                buckets.clear();
            }
            Bucket bucket = buckets.computeIfAbsent(key, ignored -> new Bucket(bucketLimit));
            if (!bucket.tryConsume(limit)) {
                response.setStatus(429);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding("UTF-8");
                response.setHeader("Retry-After", "60");
                response.getWriter().write(
                        "{\"error\":\"Demasiadas solicitudes. Intente nuevamente en unos segundos.\"}");
                return;
            }
            response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
            response.setHeader("X-RateLimit-Remaining", String.valueOf(bucket.available()));
        }

        filterChain.doFilter(request, response);
    }

    private boolean isExport(HttpServletRequest request) {
        String format = request.getParameter("format");
        if (format == null) {
            return false;
        }
        String value = format.toLowerCase();
        return value.equals("csv") || value.equals("xlsx") || value.equals("excel") || value.equals("pdf");
    }

    private String clientIp(HttpServletRequest request) {
        if (!trustProxy) {
            return request.getRemoteAddr();
        }
        String real = request.getHeader("X-Real-IP");
        if (real != null && !real.isBlank()) {
            return real.trim();
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Token bucket simple: capacidad = peticiones por minuto, recarga lineal
     * durante 60 segundos.
     */
    private static final class Bucket {
        private final double capacity;
        private final double refillPerNano;
        private double tokens;
        private long lastRefill;

        private Bucket(int perMinute) {
            this.capacity = perMinute;
            this.tokens = perMinute;
            this.refillPerNano = perMinute / 60_000_000_000.0;
            this.lastRefill = System.nanoTime();
        }

        private synchronized boolean tryConsume(int limit) {
            long now = System.nanoTime();
            tokens = Math.min(capacity, tokens + (now - lastRefill) * refillPerNano);
            lastRefill = now;
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }

        private synchronized int available() {
            return (int) Math.floor(tokens);
        }
    }
}
