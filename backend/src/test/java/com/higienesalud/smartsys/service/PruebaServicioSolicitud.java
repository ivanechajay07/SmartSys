package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.service.ServicioInventario;
import com.higienesalud.smartsys.model.ReservaStock;
import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.model.Rol;
import com.higienesalud.smartsys.model.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PruebaServicioSolicitud {

    @Mock private SolicitudMaterialDao Dao;
    @Mock private EntidadPublicaDao entidadDao;
    @Mock private PuntoEntregaDao puntoDao;
    @Mock private ProductoDao productoDao;
    @Mock private InventarioDao inventarioDao;
    @Mock private ServicioInventario ServicioInventario;
    @Mock private com.higienesalud.smartsys.service.ServicioNotificacion ServicioNotificacion;
    @Mock private OrdenServicioDao ordenServicioDao;

    @InjectMocks private ServicioSolicitud service;

    private Usuario solicitante;
    private Usuario aprobador;
    private Producto producto;
    private SolicitudMaterial solicitud;

    @BeforeEach
    void setUp() {
        solicitante = Usuario.builder().nombres("Operativo").apellidos("Uno")
                .email("operativo@smartsys.local").rol(Rol.PERSONAL_OPERATIVO).build();
        solicitante.setId(1L);
        aprobador = Usuario.builder().nombres("Jefe").apellidos("Logística")
                .email("logistica@smartsys.local").rol(Rol.JEFE_LOGISTICA).build();
        aprobador.setId(2L);
        producto = Producto.builder().codigo("P1").nombre("Jabon").unidadMedida("BOTELLA").build();
        producto.setId(10L);
        EntidadPublica entidad = EntidadPublica.builder().ruc("20131257750").razonSocial("ESSALUD").build();
        entidad.setId(1L);
        PuntoEntrega punto = PuntoEntrega.builder().entidad(entidad).nombre("Hospital").build();
        punto.setId(1L);
        solicitud = SolicitudMaterial.builder().codigo("SOL-1").entidad(entidad).puntoEntrega(punto)
                .solicitante(solicitante).justificacion("Prueba").estado(EstadoSolicitud.EN_REVISION).build();
        solicitud.setId(5L);
        DetalleSolicitud detalle = DetalleSolicitud.builder().solicitud(solicitud).producto(producto)
                .cantidadSolicitada(new BigDecimal("10")).build();
        detalle.setId(1L);
        solicitud.getDetalles().add(detalle);
    }

    @Test
    void requesterCannotApproveOwnRequest() {
        when(Dao.findById(5L)).thenReturn(Optional.of(solicitud));
        solicitante.setId(2L);

        assertThatThrownBy(() -> service.approve(5L, solicitante))
                .isInstanceOf(ExcepcionNegocio.class)
                .hasMessageContaining("no puede aprobar su propia solicitud");
    }

    @Test
    void rejectionRequiresReason() {
        when(Dao.findById(5L)).thenReturn(Optional.of(solicitud));

        assertThatThrownBy(() -> service.reject(5L, "  ", aprobador))
                .isInstanceOf(ExcepcionNegocio.class)
                .hasMessageContaining("motivo de rechazo es obligatorio");
    }

    @Test
    void approvalReservesStockAndMarksRequestReadyForDispatch() {
        when(Dao.findById(5L)).thenReturn(Optional.of(solicitud));
        Inventario inventario = Inventario.builder().producto(producto)
                .stockFisico(new BigDecimal("100")).stockReservado(BigDecimal.ZERO)
                .stockMinimo(BigDecimal.ZERO).build();
        when(inventarioDao.findByProductoId(10L)).thenReturn(Optional.of(inventario));
        when(ServicioInventario.reserve(anyLong(), any(), any(), anyLong()))
                .thenAnswer(i -> {
                    ReservaStock r = ReservaStock.builder().cantidad(i.getArgument(1)).build();
                    r.setId(7L);
                    return r;
                });
        when(Dao.save(any(SolicitudMaterial.class))).thenAnswer(i -> i.getArgument(0));

        SolicitudMaterial result = service.approve(5L, aprobador);

        DetalleSolicitud detalle = result.getDetalles().get(0);
        assertThat(result.getEstado()).isEqualTo(EstadoSolicitud.PENDIENTE_DESPACHO);
        assertThat(detalle.getCantidadAprobada()).isEqualByComparingTo("10");
        assertThat(detalle.getReservaId()).isEqualTo(7L);
        assertThat(result.getAprobadoPor()).isEqualTo(aprobador);
    }
}
