package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
import com.higienesalud.smartsys.model.Inventario;
import com.higienesalud.smartsys.model.Producto;
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
@Table(name = "reserva_stock")
public class ReservaStock extends EntidadBase {
    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "inventario_id", nullable = false)
    private Inventario inventario;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal cantidad;

    @Column(name = "origen_tipo", nullable = false, length = 40)
    private String origenTipo;

    @Column(name = "origen_id")
    private Long origenId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EstadoReserva estado;

    @Column(name = "fecha_expiracion")
    private LocalDateTime fechaExpiracion;
}
