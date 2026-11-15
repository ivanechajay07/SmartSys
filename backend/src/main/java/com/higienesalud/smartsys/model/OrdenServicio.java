package com.higienesalud.smartsys.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "orden_servicio")
public class OrdenServicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_orden")
    private Long id;

    @Column(name = "cliente_nombre", nullable = false, length = 120)
    private String clienteNombre;

    @Column(name = "cliente_ruc", nullable = false, columnDefinition = "CHAR(11)")
    private String clienteRuc;

    @Column(name = "direccion_servicio", length = 150)
    private String direccionServicio;

    @Column(name = "tipo_servicio", length = 60)
    private String tipoServicio;

    @Column(name = "fecha_servicio", nullable = false)
    private LocalDate fechaServicio;

    @Column(nullable = false, length = 30)
    private String estado;
}
