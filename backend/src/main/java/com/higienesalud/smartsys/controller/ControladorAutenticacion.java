package com.higienesalud.smartsys.controller;

import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.security.ServicioCookieRefresco;
import com.higienesalud.smartsys.service.ServicioAutenticacion;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class ControladorAutenticacion {

    private final ServicioAutenticacion service;
    private final ServicioCookieRefresco refreshCookie;
    private final CookieCsrfTokenRepository csrfTokenRepository;

    public ControladorAutenticacion(ServicioAutenticacion service,
                                    ServicioCookieRefresco refreshCookie,
                                    CookieCsrfTokenRepository csrfTokenRepository) {
        this.service = service;
        this.refreshCookie = refreshCookie;
        this.csrfTokenRepository = csrfTokenRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                   HttpServletRequest httpRequest,
                                   HttpServletResponse httpResponse) {
        ServicioAutenticacion.LoginResult result = service.login(request.email(), request.password());
        issueCsrf(httpRequest, httpResponse);
        if (result.mfa() != null) {
            return ResponseEntity.ok(result.mfa());
        }
        return sessionResponse(result);
    }

    @PostMapping("/mfa/verify")
    public ResponseEntity<ServicioAutenticacion.TokenResponse> verifyMfa(
            @Valid @RequestBody MfaVerifyRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        ServicioAutenticacion.LoginResult result = service.verifyMfa(request.mfaToken(), request.code());
        issueCsrf(httpRequest, httpResponse);
        return sessionResponse(result);
    }

    @PostMapping("/mfa/setup")
    public ServicioAutenticacion.MfaSetupResponse setupMfa() {
        return service.setupMfa();
    }

    @PostMapping("/mfa/enable")
    public void enableMfa(@Valid @RequestBody MfaCodeRequest request) {
        service.enableMfa(request.code());
    }

    @PostMapping("/mfa/disable")
    public void disableMfa(@Valid @RequestBody MfaCodeRequest request) {
        service.disableMfa(request.code());
    }

    private ResponseEntity<ServicioAutenticacion.TokenResponse> sessionResponse(
            ServicioAutenticacion.LoginResult result) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.create(result.refreshToken()).toString())
                .body(result.response());
    }

    @PostMapping("/refresh")
    public ResponseEntity<ServicioAutenticacion.TokenResponse> refresh(
            @CookieValue(name = ServicioCookieRefresco.COOKIE_NAME, required = false) String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ExcepcionNegocio("Refresh token requerido");
        }
        ServicioAutenticacion.LoginResult result = service.refresh(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.create(result.refreshToken()).toString())
                .body(result.response());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = ServicioCookieRefresco.COOKIE_NAME, required = false) String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            service.logout(refreshToken);
        }
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.clear().toString())
                .build();
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(HttpServletRequest request, HttpServletResponse response) {
        CsrfToken token = issueCsrf(request, response);
        return Map.of("token", token.getToken());
    }

    private CsrfToken issueCsrf(HttpServletRequest request, HttpServletResponse response) {
        CsrfToken token = csrfTokenRepository.generateToken(request);
        csrfTokenRepository.saveToken(token, request, response);
        return token;
    }

    @PostMapping("/forgot-password")
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        service.forgotPassword(request.email());
    }

    @GetMapping("/me")
    public ServicioAutenticacion.MeResponse me() {
        return service.me();
    }

    @PutMapping("/profile")
    public ServicioAutenticacion.MeResponse updateProfile(@Valid @RequestBody ProfileRequest request) {
        return service.updateProfile(request.nombres(), request.apellidos(),
                request.telefono(), request.avatarUrl());
    }

    @PutMapping("/avatar")
    public ServicioAutenticacion.MeResponse updateAvatar(@Valid @RequestBody AvatarRequest request) {
        return service.updateAvatar(request.avatarUrl());
    }

    @PostMapping("/change-password")
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        service.changePassword(request.currentPassword(), request.newPassword());
    }

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {
    }

    public record ForgotPasswordRequest(@Email @NotBlank String email) {
    }

    public record MfaVerifyRequest(@NotBlank String mfaToken, @NotBlank String code) {
    }

    public record MfaCodeRequest(@NotBlank String code) {
    }

    public record ChangePasswordRequest(@NotBlank String currentPassword, @NotBlank String newPassword) {
    }

    public record ProfileRequest(
            @NotBlank @Size(max = 120) String nombres,
            @NotBlank @Size(max = 120) String apellidos,
            @Size(max = 30) String telefono,
            @Size(max = 400_000) String avatarUrl) {
    }

    public record AvatarRequest(
            @Size(max = 400_000) String avatarUrl) {
    }
}
