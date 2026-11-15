package com.higienesalud.smartsys.model;

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
@Table(name = "alerta_stock")
public class AlertaStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_alerta")
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "id_inventario", nullable = false)
    private Inventario inventario;

    @Column(name = "fecha_alerta", nullable = false)
    private LocalDate fechaAlerta;

    @Column(name = "stock_actual", nullable = false, precision = 14, scale = 3)
    private BigDecimal stockActual;

    @Column(name = "umbral_minimo", nullable = false, precision = 14, scale = 3)
    private BigDecimal umbralMinimo;

    @Builder.Default
    @Column(nullable = false)
    private boolean estado = true;
}
