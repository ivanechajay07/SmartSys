package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tdr_item")
public class TdrItem extends EntidadBase {
    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "tdr_id", nullable = false)
    private Tdr tdr;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(name = "cantidad_total", nullable = false, precision = 14, scale = 3)
    private BigDecimal cantidadTotal;

    @Column(nullable = false, length = 30)
    private String unidad;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Frecuencia frecuencia;

    @Column(name = "cantidad_por_entrega", nullable = false, precision = 14, scale = 3)
    private BigDecimal cantidadPorEntrega;

    @Column(name = "fecha_programada")
    private LocalDate fechaProgramada;

    @Column(name = "fecha_limite")
    private LocalDate fechaLimite;

    @Column(name = "dias_personalizado")
    private Integer diasPersonalizado;

    @Column(length = 500)
    private String observaciones;
}
