package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.higienesalud.smartsys.model.EntidadBase;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "usuario", uniqueConstraints = @UniqueConstraint(name = "uk_usuario_email", columnNames = "correo"))
@AttributeOverride(name = "id", column = @Column(name = "id_usuario"))
public class Usuario extends EntidadBase {

    @Column(nullable = false, length = 120)
    private String nombres;

    @Column(nullable = false, length = 120)
    private String apellidos;

    @Column(name = "correo", nullable = false, length = 160)
    private String email;

    @JsonIgnore
    @Column(name = "id_rol")
    private Integer idRol;

    @JsonIgnore
    @Column(name = "clave_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(length = 30)
    private String telefono;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Rol rol;

    @Builder.Default
    @Column(name = "estado", nullable = false)
    private boolean activo = true;

    @Builder.Default
    @Column(name = "intentos_fallidos", nullable = false)
    private int intentosFallidos = 0;

    @Column(name = "bloqueado_hasta")
    private LocalDateTime bloqueadoHasta;

    @Column(name = "ultimo_acceso")
    private LocalDateTime ultimoAcceso;

    @Lob
    @Column(name = "avatar_url", columnDefinition = "LONGTEXT")
    private String avatarUrl;
}
