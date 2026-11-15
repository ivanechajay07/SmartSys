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
@Table(name = "vehiculo", uniqueConstraints = @UniqueConstraint(name = "uk_vehiculo_placa", columnNames = "placa"))
public class Vehiculo extends EntidadBase {
    @NotBlank
    @Column(nullable = false, length = 15)
    private String placa;

    @Column(length = 60)
    private String marca;

    @Column(length = 60)
    private String modelo;

    @Column(length = 40)
    private String tipo;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String estado = "DISPONIBLE";
}
