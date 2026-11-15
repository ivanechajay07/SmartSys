package com.higienesalud.smartsys.model;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "proveedor", uniqueConstraints = @UniqueConstraint(name = "uk_proveedor_ruc", columnNames = "ruc"))
public class Proveedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_proveedor")
    private Long id;

    @Column(nullable = false, length = 11)
    private String ruc;

    @Column(name = "razon_social", nullable = false, length = 120)
    private String razonSocial;

    @Column(length = 150)
    private String direccion;

    @Column(length = 20)
    private String telefono;

    @Column(length = 100)
    private String correo;

    @Builder.Default
    @Column(nullable = false)
    private boolean estado = true;
}
