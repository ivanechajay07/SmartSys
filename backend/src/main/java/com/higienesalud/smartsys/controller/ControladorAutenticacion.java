package com.higienesalud.smartsys.controller;

import com.higienesalud.smartsys.service.ServicioAutenticacion;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class ControladorAutenticacion {

    private final ServicioAutenticacion service;

    public ControladorAutenticacion(ServicioAutenticacion service) {
        this.service = service;
    }

    @PostMapping("/login")
    public ServicioAutenticacion.TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return service.login(request.email(), request.password());
    }

    @PostMapping("/refresh")
    public ServicioAutenticacion.TokenResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return service.refresh(request.refreshToken());
    }

    @PostMapping("/logout")
    public void logout(@Valid @RequestBody RefreshRequest request) {
        service.logout(request.refreshToken());
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

    public record RefreshRequest(@NotBlank String refreshToken) {
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
