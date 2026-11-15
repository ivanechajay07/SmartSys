package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "auditoria")
public class Auditoria extends EntidadBase {

    @Column(name = "usuario_email", length = 160)
    private String usuarioEmail;

    @Column(length = 40)
    private String rol;

    @Column(name = "usuario_nombre", length = 160)
    private String usuarioNombre;

    @Column(nullable = false, length = 20)
    private String metodo;

    @Column(nullable = false, length = 300)
    private String recurso;

    @Column(nullable = false, length = 200)
    private String accion;

    @Column(length = 40)
    private String modulo;

    @Column(nullable = false)
    private boolean exito;

    @Column(length = 1000)
    private String detalle;

    @Column(length = 45)
    private String ip;

    @Column(length = 30)
    private String dispositivo;

    @Column(length = 120)
    private String equipo;

    @Column(length = 80)
    private String navegador;

    @Column(name = "sistema_operativo", length = 80)
    private String sistemaOperativo;

    @Column(nullable = false)
    private LocalDateTime fecha;
}
