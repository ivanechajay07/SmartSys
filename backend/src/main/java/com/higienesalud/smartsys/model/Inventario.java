package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "inventario", uniqueConstraints = @UniqueConstraint(name = "uk_inventario_producto", columnNames = "id_producto"))
@AttributeOverride(name = "id", column = @Column(name = "id_inventario"))
public class Inventario extends EntidadBase {
    @OneToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    @Builder.Default
    @Column(name = "stock_actual", nullable = false, precision = 14, scale = 3)
    private BigDecimal stockFisico = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "stock_reservado", nullable = false, precision = 14, scale = 3)
    private BigDecimal stockReservado = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "stock_minimo", nullable = false, precision = 14, scale = 3)
    private BigDecimal stockMinimo = BigDecimal.ZERO;

    @Version
    @Column(nullable = false)
    private Long version;

    public BigDecimal getStockDisponible() {
        return stockFisico.subtract(stockReservado);
    }
}
