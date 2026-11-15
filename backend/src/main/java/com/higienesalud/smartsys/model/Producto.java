package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "producto", uniqueConstraints = @UniqueConstraint(name = "uk_producto_codigo", columnNames = "codigo"))
@AttributeOverride(name = "id", column = @Column(name = "id_producto"))
public class Producto extends EntidadBase {
    @NotBlank
    @Column(nullable = false, length = 40)
    private String codigo;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(length = 500)
    private String descripcion;

    @Column(length = 80)
    private String categoria;

    @Column(name = "unidad_medida", nullable = false, length = 30)
    private String unidadMedida;

    @Column(length = 80)
    private String marca;

    @Builder.Default
    @Column(name = "requiere_lote", nullable = false)
    private boolean requiereLote = false;

    @Builder.Default
    @Column(name = "requiere_vencimiento", nullable = false)
    private boolean requiereVencimiento = false;

    @Builder.Default
    @Column(name = "estado", nullable = false)
    private boolean activo = true;
}
