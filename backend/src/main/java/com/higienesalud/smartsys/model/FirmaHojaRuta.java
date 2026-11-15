package com.higienesalud.smartsys.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "firma_hoja_ruta",
        uniqueConstraints = @UniqueConstraint(name = "uk_firma_despacho_tipo",
                columnNames = {"id_despacho", "tipo"}))
@AttributeOverride(name = "id", column = @Column(name = "id_firma"))
public class FirmaHojaRuta extends EntidadBase {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "id_despacho", nullable = false)
    private Despacho despacho;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoFirmaHojaRuta tipo;

    @Column(length = 160)
    private String nombre;

    @Column(length = 20)
    private String dni;

    @Column(length = 120)
    private String cargo;

    @Column(name = "fecha_firma", nullable = false)
    private LocalDateTime fechaFirma;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String imagen;
}
