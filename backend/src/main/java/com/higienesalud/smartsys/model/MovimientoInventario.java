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
@Table(name = "movimiento_inventario")
@AttributeOverride(name = "id", column = @Column(name = "id_movimiento"))
public class MovimientoInventario extends EntidadBase {
    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(name = "id_inventario")
    private Long inventarioId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_movimiento", nullable = false, length = 30)
    private TipoMovimiento tipo;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal cantidad;

    @Column(name = "saldo", nullable = false, precision = 14, scale = 3)
    private BigDecimal saldoResultante;

    @Column(length = 120)
    private String referencia;

    @Column(length = 500)
    private String observaciones;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(name = "fecha_movimiento", nullable = false)
    private LocalDateTime fecha;
}
