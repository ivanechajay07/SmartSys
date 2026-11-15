package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
import com.higienesalud.smartsys.model.Rol;
import com.higienesalud.smartsys.model.Usuario;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "notificacion")
public class Notificacion extends EntidadBase {

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "rol_destino", length = 40)
    private Rol rolDestino;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(nullable = false, length = 1000)
    private String mensaje;

    @Column(nullable = false, length = 40)
    private String tipo;

    @Builder.Default
    @Column(nullable = false)
    private boolean leida = false;

    @Column(nullable = false)
    private LocalDateTime fecha;
}
