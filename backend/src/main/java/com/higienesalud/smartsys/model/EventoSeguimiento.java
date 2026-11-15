package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
import com.higienesalud.smartsys.model.Usuario;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "evento_seguimiento")
public class EventoSeguimiento extends EntidadBase {
    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "despacho_id", nullable = false)
    private Despacho despacho;

    @Column(nullable = false, length = 40)
    private String tipo;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false)
    private LocalDateTime fechaHora;

    @Column(length = 1000)
    private String observaciones;

    @Column(precision = 10, scale = 6)
    private BigDecimal latitud;

    @Column(precision = 10, scale = 6)
    private BigDecimal longitud;

    @Column(name = "evidencia_url", length = 500)
    private String evidenciaUrl;
}
