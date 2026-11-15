package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
import com.higienesalud.smartsys.model.Despacho;
import com.higienesalud.smartsys.model.Usuario;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "recepcion")
public class Recepcion extends EntidadBase {

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "despacho_id", nullable = false)
    private Despacho despacho;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora;

    @Column(name = "recibido_por", nullable = false, length = 150)
    private String recibidoPor;

    @Column(name = "documento_identidad", length = 30)
    private String documentoIdentidad;

    @Column(nullable = false, length = 40)
    private String estado;

    @Column(length = 1000)
    private String observaciones;

    @Builder.Default
    @Column(nullable = false)
    private boolean conforme = true;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Builder.Default
    @OneToMany(mappedBy = "recepcion", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<DetalleRecepcion> detalles = new ArrayList<>();
}
