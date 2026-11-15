package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tdr")
public class Tdr extends EntidadBase {
    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "contrato_id", nullable = false)
    private Contrato contrato;

    @Column(nullable = false, length = 30)
    private String version;

    @Column(name = "fecha_vigencia")
    private LocalDate fechaVigencia;

    @Column(name = "archivo_url", length = 500)
    private String archivoUrl;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String estado = "VIGENTE";
}
