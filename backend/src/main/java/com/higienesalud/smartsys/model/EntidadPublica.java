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
@Table(name = "entidad_publica", uniqueConstraints = @UniqueConstraint(name = "uk_entidad_ruc", columnNames = "ruc"))
public class EntidadPublica extends EntidadBase {
    @NotBlank
    @Column(nullable = false, length = 11)
    private String ruc;

    @NotBlank
    @Column(nullable = false, length = 200)
    private String razonSocial;

    @Column(length = 250)
    private String direccion;

    @Column(length = 80)
    private String departamento;

    @Column(length = 80)
    private String provincia;

    @Column(length = 80)
    private String distrito;

    @Column(length = 30)
    private String telefono;

    @Column(length = 150)
    private String correo;

    @Column(length = 150)
    private String responsable;

    @Builder.Default
    @Column(nullable = false)
    private boolean activo = true;
}
