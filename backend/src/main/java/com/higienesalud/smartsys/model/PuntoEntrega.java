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
@Table(name = "punto_entrega")
public class PuntoEntrega extends EntidadBase {
    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "entidad_id", nullable = false)
    private EntidadPublica entidad;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(length = 250)
    private String direccion;

    @Column(length = 80)
    private String distrito;

    @Column(length = 150)
    private String responsable;

    @Column(length = 30)
    private String telefono;

    @Builder.Default
    @Column(nullable = false)
    private boolean activo = true;
}
