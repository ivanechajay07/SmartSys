package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.EntidadBase;
import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.model.ProgramacionAbastecimiento;
import com.higienesalud.smartsys.model.Usuario;
import com.higienesalud.smartsys.model.SolicitudMaterial;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "despacho", uniqueConstraints = @UniqueConstraint(name = "uk_despacho_codigo", columnNames = "codigo"))
@AttributeOverride(name = "id", column = @Column(name = "id_despacho"))
public class Despacho extends EntidadBase {
    @Column(nullable = false, length = 40)
    private String codigo;

    @Column(name = "id_salida")
    private Long salidaId;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "entidad_id", nullable = false)
    private EntidadPublica entidad;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "punto_entrega_id", nullable = false)
    private PuntoEntrega puntoEntrega;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "contrato_id", nullable = false)
    private Contrato contrato;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "tdr_id", nullable = false)
    private Tdr tdr;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "programacion_id", nullable = false)
    private ProgramacionAbastecimiento programacion;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "solicitud_id")
    private SolicitudMaterial solicitud;

    @Column(name = "fecha_despacho", nullable = false)
    private LocalDate fecha;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "responsable_id", nullable = false)
    private Usuario responsable;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "transportista_id")
    private Usuario transportista;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "acompanante_id")
    private Usuario acompanante;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vehiculo_id")
    private Vehiculo vehiculo;

    @Column(name = "fecha_hora_asignacion")
    private LocalDateTime fechaHoraAsignacion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private EstadoDespacho estado;

    @Column(name = "numero_guia", length = 40)
    private String numeroGuia;

    @Column(name = "numero_salida", length = 40)
    private String numeroSalida;

    @Column(name = "numero_hoja_ruta", length = 40)
    private String numeroHojaRuta;

    @Column(name = "fecha_hora_salida")
    private LocalDateTime fechaHoraSalida;

    @Column(name = "fecha_hora_llegada")
    private LocalDateTime fechaHoraLlegada;

    @Column(length = 1000)
    private String observaciones;

    @Builder.Default
    @OneToMany(mappedBy = "despacho", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<DetalleDespacho> detalles = new ArrayList<>();
}
