package com.higienesalud.smartsys.model;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

/**
 * DTO de entrada para crear o actualizar un producto.
 */
public record ProductoRequest(
        @NotBlank String codigo,
        @NotBlank String nombre,
        String descripcion,
        String categoria,
        @NotBlank String unidadMedida,
        String marca,
        Boolean requiereLote,
        Boolean requiereVencimiento,
        Boolean activo,
        BigDecimal stockMinimo) {
}
