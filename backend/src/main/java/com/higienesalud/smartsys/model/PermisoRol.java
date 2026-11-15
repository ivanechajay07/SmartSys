package com.higienesalud.smartsys.model;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "permiso_rol", uniqueConstraints = {
        @UniqueConstraint(name = "uk_permiso_rol", columnNames = {"id_rol", "modulo"})
})
public class PermisoRol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_permiso")
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "id_rol", nullable = false)
    private RolSistema rol;

    @Column(nullable = false, length = 40)
    private String modulo;

    @Builder.Default
    @Column(name = "puede_ver", nullable = false)
    private boolean puedeVer = false;

    @Builder.Default
    @Column(name = "puede_crear", nullable = false)
    private boolean puedeCrear = false;

    @Builder.Default
    @Column(name = "puede_editar", nullable = false)
    private boolean puedeEditar = false;

    @Builder.Default
    @Column(name = "puede_eliminar", nullable = false)
    private boolean puedeEliminar = false;
}
