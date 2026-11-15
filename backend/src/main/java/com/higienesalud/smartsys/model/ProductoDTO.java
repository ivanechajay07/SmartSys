package com.higienesalud.smartsys.model;

/**
 * DTO de salida para la tabla producto.
 * Evita exponer la entidad JPA directamente en la API.
 */
public record ProductoDTO(
        Long id,
        String codigo,
        String nombre,
        String descripcion,
        String categoria,
        String unidadMedida,
        String marca,
        boolean requiereLote,
        boolean requiereVencimiento,
        boolean activo) {

    public static ProductoDTO desde(Producto producto) {
        return new ProductoDTO(
                producto.getId(),
                producto.getCodigo(),
                producto.getNombre(),
                producto.getDescripcion(),
                producto.getCategoria(),
                producto.getUnidadMedida(),
                producto.getMarca(),
                producto.isRequiereLote(),
                producto.isRequiereVencimiento(),
                producto.isActivo());
    }
}
