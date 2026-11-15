package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "contrato", uniqueConstraints = @UniqueConstraint(name = "uk_contrato_codigo", columnNames = "codigo"))
public class Contrato extends EntidadBase {
    @NotBlank
    @Column(nullable = false, length = 60)
    private String numero;

    @NotBlank
    @Column(nullable = false, length = 60)
    private String codigo;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "entidad_id", nullable = false)
    private EntidadPublica entidad;

    @Column(length = 500)
    private String objeto;

    @Column(name = "fecha_inicio")
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin")
    private LocalDate fechaFin;

    @Column(name = "responsable_interno", length = 150)
    private String responsableInterno;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String estado = "VIGENTE";

    @Column(name = "archivo_url", length = 500)
    private String archivoUrl;
}
