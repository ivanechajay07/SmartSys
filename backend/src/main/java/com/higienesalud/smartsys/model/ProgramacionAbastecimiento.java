package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
import com.higienesalud.smartsys.model.*;
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
@Table(name = "programacion_abastecimiento")
public class ProgramacionAbastecimiento extends EntidadBase {
    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "contrato_id", nullable = false)
    private Contrato contrato;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "tdr_item_id", nullable = false)
    private TdrItem tdrItem;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "entidad_id", nullable = false)
    private EntidadPublica entidad;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "punto_entrega_id", nullable = false)
    private PuntoEntrega puntoEntrega;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(name = "fecha_programada", nullable = false)
    private LocalDate fechaProgramada;

    @Column(name = "fecha_limite")
    private LocalDate fechaLimite;

    @Column(name = "cantidad_comprometida", nullable = false, precision = 14, scale = 3)
    private BigDecimal cantidadComprometida;

    @Column(name = "cantidad_programada", nullable = false, precision = 14, scale = 3)
    private BigDecimal cantidadProgramada;

    @Builder.Default
    @Column(name = "cantidad_entregada", nullable = false, precision = 14, scale = 3)
    private BigDecimal cantidadEntregada = BigDecimal.ZERO;

    @Column(name = "saldo_pendiente", nullable = false, precision = 14, scale = 3)
    private BigDecimal saldoPendiente;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EstadoProgramacion estado;

    @Column(length = 500)
    private String motivo;

    @Version
    @Column(nullable = false)
    private Long version;
}
