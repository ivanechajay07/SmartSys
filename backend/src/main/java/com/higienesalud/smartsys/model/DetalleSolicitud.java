package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.higienesalud.smartsys.model.EntidadBase;
import com.higienesalud.smartsys.model.Producto;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "detalle_solicitud")
@AttributeOverride(name = "id", column = @Column(name = "id_detalle_solicitud"))
public class DetalleSolicitud extends EntidadBase {
    @JsonIgnore
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "id_solicitud", nullable = false)
    private SolicitudMaterial solicitud;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    @Column(name = "cantidad_solicitada", nullable = false, precision = 14, scale = 3)
    private BigDecimal cantidadSolicitada;

    @Builder.Default
    @Column(name = "cantidad_aprobada", nullable = false, precision = 14, scale = 3)
    private BigDecimal cantidadAprobada = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "cantidad_despachada", nullable = false, precision = 14, scale = 3)
    private BigDecimal cantidadDespachada = BigDecimal.ZERO;

    @Column(name = "reserva_id")
    private Long reservaId;
}
