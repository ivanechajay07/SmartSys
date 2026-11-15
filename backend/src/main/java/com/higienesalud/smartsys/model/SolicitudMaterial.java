package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.higienesalud.smartsys.model.EntidadBase;
import com.higienesalud.smartsys.model.EntidadPublica;
import com.higienesalud.smartsys.model.PuntoEntrega;
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
@Table(name = "solicitud_material", uniqueConstraints = @UniqueConstraint(name = "uk_solicitud_codigo", columnNames = "codigo"))
@AttributeOverride(name = "id", column = @Column(name = "id_solicitud"))
public class SolicitudMaterial extends EntidadBase {
    @Column(nullable = false, length = 40)
    private String codigo;

    @Column(name = "id_orden")
    private Long ordenId;

    @Column(name = "nro_ticket", length = 20)
    private String nroTicket;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "entidad_id", nullable = false)
    private EntidadPublica entidad;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "punto_entrega_id", nullable = false)
    private PuntoEntrega puntoEntrega;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario solicitante;

    @Column(nullable = false)
    private LocalDateTime fechaSolicitud;

    @Column(name = "observacion", nullable = false, length = 1000)
    private String justificacion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private EstadoSolicitud estado;

    @Column(length = 500)
    private String motivoRechazo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "aprobado_por")
    private Usuario aprobadoPor;

    private LocalDateTime fechaAprobacion;

    @Builder.Default
    @OneToMany(mappedBy = "solicitud", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<DetalleSolicitud> detalles = new ArrayList<>();
}
