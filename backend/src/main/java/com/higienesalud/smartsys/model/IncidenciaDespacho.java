package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
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
@Table(name = "incidencia_despacho")
public class IncidenciaDespacho extends EntidadBase {
    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "despacho_id", nullable = false)
    private Despacho despacho;

    @Column(nullable = false, length = 60)
    private String tipo;

    @Column(nullable = false, length = 1000)
    private String descripcion;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String estado = "ABIERTA";

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false)
    private LocalDateTime fecha;
}
