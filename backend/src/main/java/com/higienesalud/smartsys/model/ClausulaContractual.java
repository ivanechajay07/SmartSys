package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
import com.higienesalud.smartsys.model.Contrato;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "clausula_contractual")
public class ClausulaContractual extends EntidadBase {

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "contrato_id", nullable = false)
    private Contrato contrato;

    @Column(nullable = false, length = 40)
    private String codigo;

    @Column(nullable = false, length = 500)
    private String descripcion;

    @Column(nullable = false, length = 40)
    private String tipo;

    @Column(name = "umbral_porcentaje", precision = 5, scale = 2)
    private BigDecimal umbralPorcentaje;

    @Builder.Default
    @Column(name = "accion_sugerida", nullable = false, length = 200)
    private String accionSugerida = "REVISION_MANUAL";

    @Builder.Default
    @Column(nullable = false)
    private boolean activa = true;
}
