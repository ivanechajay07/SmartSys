package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
import com.higienesalud.smartsys.model.Usuario;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "evidencia")
public class Evidencia extends EntidadBase {
    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "despacho_id", nullable = false)
    private Despacho despacho;

    @Column(name = "recepcion_id")
    private Long recepcionId;

    @Column(nullable = false, length = 40)
    private String tipo;

    @Column(nullable = false, length = 500)
    private String url;

    @JsonIgnore
    @Column(columnDefinition = "MEDIUMTEXT")
    private String contenido;

    @Column(name = "tipo_mime", length = 80)
    private String tipoMime;

    @Column(name = "nombre_archivo", length = 255)
    private String nombreArchivo;

    @Column(length = 500)
    private String observaciones;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false)
    private LocalDateTime fecha;
}
