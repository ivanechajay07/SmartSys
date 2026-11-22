package com.higienesalud.smartsys.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class ServicioCookieRefresco {

    public static final String COOKIE_NAME = "smartsys_refresh";
    private static final String COOKIE_PATH = "/api/v1/auth";

    private final boolean secure;
    private final long refreshDays;

    public ServicioCookieRefresco(
            @Value("${app.security.refresh-cookie-secure:true}") boolean secure,
            @Value("${app.jwt.refresh-days:7}") long refreshDays) {
        this.secure = secure;
        this.refreshDays = refreshDays;
    }

    public ResponseCookie create(String refreshToken) {
        return ResponseCookie.from(COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path(COOKIE_PATH)
                .maxAge(Duration.ofDays(refreshDays))
                .build();
    }

    public ResponseCookie clear() {
        return ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path(COOKIE_PATH)
                .maxAge(Duration.ZERO)
                .build();
    }
}
