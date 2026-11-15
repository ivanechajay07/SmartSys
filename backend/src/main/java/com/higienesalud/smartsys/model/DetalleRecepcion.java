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
@Table(name = "detalle_recepcion")
public class DetalleRecepcion extends EntidadBase {

    @JsonIgnore
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "recepcion_id", nullable = false)
    private Recepcion recepcion;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(name = "cantidad_recibida", nullable = false, precision = 14, scale = 3)
    private BigDecimal cantidadRecibida;

    @Builder.Default
    @Column(name = "cantidad_rechazada", nullable = false, precision = 14, scale = 3)
    private BigDecimal cantidadRechazada = BigDecimal.ZERO;

    @Column(length = 500)
    private String observaciones;
}
