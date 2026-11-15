package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
import com.higienesalud.smartsys.model.Usuario;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "solicitud_reposicion", uniqueConstraints = @UniqueConstraint(name = "uk_reposicion_codigo", columnNames = "codigo"))
@AttributeOverride(name = "id", column = @Column(name = "id_reposicion"))
public class SolicitudReposicion extends EntidadBase {
    @Column(nullable = false, length = 40)
    private String codigo;

    @Column(name = "id_alerta")
    private Long alertaId;

    @Column(name = "id_producto")
    private Long productoId;

    @Column(name = "cantidad_solicitada", precision = 14, scale = 3)
    private BigDecimal cantidadSolicitada;

    @Column(nullable = false, length = 1000)
    private String justificacion;

    @Column(name = "monto_estimado", precision = 14, scale = 2)
    private BigDecimal montoEstimado;

    @Column(name = "referencia_presupuesto", length = 150)
    private String referenciaPresupuesto;

    @Column(name = "proveedor_sugerido", length = 200)
    private String proveedorSugerido;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private EstadoReposicion estado;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "id_solicitante", nullable = false)
    private Usuario solicitante;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_aprobador")
    private Usuario aprobador;

    @Column(nullable = false)
    private LocalDateTime fechaSolicitud;

    private LocalDateTime fechaResolucion;

    @Column(length = 500)
    private String motivoRechazo;

    @Builder.Default
    @OneToMany(mappedBy = "reposicion", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<DetalleReposicion> detalles = new ArrayList<>();
}
