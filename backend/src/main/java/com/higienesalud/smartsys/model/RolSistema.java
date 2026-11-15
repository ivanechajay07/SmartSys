package com.higienesalud.smartsys.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Catálogo físico de roles del modelo APF2.
 * La autorización usa el enum {@link Rol}; esta entidad expone el catálogo
 * almacenado en la tabla {@code rol}.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "rol")
public class RolSistema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rol")
    private Integer id;

    @Column(nullable = false, unique = true, length = 50)
    private String nombre;

    @Column(length = 100)
    private String descripcion;
}
