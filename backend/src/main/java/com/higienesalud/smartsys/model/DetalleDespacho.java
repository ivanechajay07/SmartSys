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
@Table(name = "detalle_despacho")
public class DetalleDespacho extends EntidadBase {
    @JsonIgnore
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "despacho_id", nullable = false)
    private Despacho despacho;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(name = "cantidad_comprometida", nullable = false, precision = 14, scale = 3)
    private BigDecimal cantidadComprometida;

    @Builder.Default
    @Column(name = "cantidad_preparada", nullable = false, precision = 14, scale = 3)
    private BigDecimal cantidadPreparada = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "cantidad_despachada", nullable = false, precision = 14, scale = 3)
    private BigDecimal cantidadDespachada = BigDecimal.ZERO;

    @Column(name = "reserva_id")
    private Long reservaId;

    @Column(name = "solicitud_detalle_id")
    private Long solicitudDetalleId;
}
