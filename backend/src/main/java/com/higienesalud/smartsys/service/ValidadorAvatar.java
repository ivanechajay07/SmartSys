package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.exception.ExcepcionNegocio;

/**
 * Validación de avatares enviados por el cliente. El frontend reduce la imagen
 * antes de enviarla como data URL; aquí se limita el tamaño y el tipo permitido.
 */
public final class ValidadorAvatar {

    private static final int MAX_LENGTH = 400_000;

    private ValidadorAvatar() {
    }

    public static String normalize(String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return null;
        }
        String value = avatarUrl.trim();
        if (value.length() > MAX_LENGTH) {
            throw new ExcepcionNegocio("La imagen supera el tamaño permitido (máx. 400 KB).");
        }

        boolean dataImage = value.startsWith("data:image/png;base64,")
                || value.startsWith("data:image/jpeg;base64,")
                || value.startsWith("data:image/jpg;base64,")
                || value.startsWith("data:image/webp;base64,");
        boolean remote = value.startsWith("https://") || value.startsWith("http://");

        if (!dataImage && !remote) {
            throw new ExcepcionNegocio("Formato de imagen no válido. Use PNG, JPG o WEBP.");
        }
        if (dataImage) {
            int comma = value.indexOf(',');
            if (comma < 0 || value.length() - comma < 20) {
                throw new ExcepcionNegocio("La imagen enviada no es válida.");
            }
        }
        return value;
    }
}
