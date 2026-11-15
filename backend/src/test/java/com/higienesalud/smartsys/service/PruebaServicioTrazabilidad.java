package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.model.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PruebaServicioTrazabilidad {

    @Mock private OrdenServicioDao ordenServicioDao;
    @Mock private SolicitudMaterialDao solicitudMaterialDao;
    @Mock private IngresoAlmacenDao ingresoAlmacenDao;
    @Mock private DetalleIngresoDao detalleIngresoDao;
    @Mock private SalidaAlmacenDao salidaAlmacenDao;
    @Mock private DetalleSalidaDao detalleSalidaDao;
    @Mock private DespachoDao despachoDao;

    @InjectMocks private ServicioTrazabilidad service;

    @Test
    void exponeOrdenesConSuSolicitudDeOrigen() {
        OrdenServicio orden = OrdenServicio.builder()
                .id(5L).clienteNombre("ESSALUD").clienteRuc("20131257750")
                .tipoServicio("SUMINISTRO").fechaServicio(LocalDate.of(2026, 11, 8))
                .estado("ACTIVO").build();
        SolicitudMaterial solicitud = SolicitudMaterial.builder()
                .codigo("SOL-9").ordenId(5L).build();
        solicitud.setId(9L);

        when(ordenServicioDao.findAll(any(Sort.class))).thenReturn(List.of(orden));
        when(solicitudMaterialDao.findFirstByOrdenId(5L)).thenReturn(Optional.of(solicitud));

        List<ServicioTrazabilidad.OrdenVista> ordenes = service.ordenes();

        assertThat(ordenes).singleElement().satisfies(vista -> {
            assertThat(vista.clienteNombre()).isEqualTo("ESSALUD");
            assertThat(vista.solicitudId()).isEqualTo(9L);
            assertThat(vista.solicitudCodigo()).isEqualTo("SOL-9");
        });
    }

    @Test
    void exponeIngresosConProveedorYDetalles() {
        Usuario usuario = Usuario.builder().nombres("Ana").apellidos("Pérez").build();
        Proveedor proveedor = Proveedor.builder().id(3L).razonSocial("Proveedor Uno").build();
        Producto producto = Producto.builder().codigo("PROD-001").nombre("Jabón").build();
        IngresoAlmacen ingreso = IngresoAlmacen.builder()
                .id(10L).usuario(usuario).proveedor(proveedor)
                .nroGuiaRemision("GUIA-1").fechaIngreso(LocalDate.of(2026, 11, 7))
                .observacion("Ingreso").estado(true).build();
        DetalleIngreso detalle = DetalleIngreso.builder()
                .id(1L).ingreso(ingreso).producto(producto)
                .cantidad(new BigDecimal("2.500")).lote("L-1").build();

        when(ingresoAlmacenDao.findAll(any(Sort.class))).thenReturn(List.of(ingreso));
        when(detalleIngresoDao.findByIngresoIdOrderByIdAsc(10L)).thenReturn(List.of(detalle));

        List<ServicioTrazabilidad.IngresoVista> ingresos = service.ingresos();

        assertThat(ingresos).hasSize(1);
        ServicioTrazabilidad.IngresoVista vista = ingresos.get(0);
        assertThat(vista.guia()).isEqualTo("GUIA-1");
        assertThat(vista.proveedor()).isEqualTo("Proveedor Uno");
        assertThat(vista.usuario()).isEqualTo("Ana Pérez");
        assertThat(vista.detalles()).singleElement().satisfies(d -> {
            assertThat(d.producto()).isEqualTo("Jabón");
            assertThat(d.cantidad()).isEqualByComparingTo("2.5");
            assertThat(d.lote()).isEqualTo("L-1");
        });
    }

    @Test
    void exponeSalidasConSuDespachoYDetalles() {
        Usuario usuario = Usuario.builder().nombres("Luis").apellidos("Gómez").build();
        Producto producto = Producto.builder().codigo("PROD-002").nombre("Papel").build();
        SalidaAlmacen salida = SalidaAlmacen.builder()
                .id(20L).usuario(usuario).nroGuiaInterna("SAL-20")
                .fechaSalida(LocalDate.of(2026, 11, 7)).tipoEntrega("DESPACHO").estado(true).build();
        DetalleSalida detalle = DetalleSalida.builder()
                .id(2L).salida(salida).producto(producto)
                .cantidadEntregada(new BigDecimal("4.000")).build();
        Despacho despacho = Despacho.builder().codigo("DES-30").build();
        despacho.setId(30L);

        when(salidaAlmacenDao.findAll(any(Sort.class))).thenReturn(List.of(salida));
        when(detalleSalidaDao.findBySalidaIdOrderByIdAsc(20L)).thenReturn(List.of(detalle));
        when(despachoDao.findFirstBySalidaId(20L)).thenReturn(Optional.of(despacho));

        List<ServicioTrazabilidad.SalidaVista> salidas = service.salidas();

        assertThat(salidas).hasSize(1);
        assertThat(salidas.get(0).guia()).isEqualTo("SAL-20");
        assertThat(salidas.get(0).usuario()).isEqualTo("Luis Gómez");
        assertThat(salidas.get(0).despachoCodigo()).isEqualTo("DES-30");
        assertThat(salidas.get(0).detalles()).singleElement()
                .satisfies(d -> assertThat(d.cantidad()).isEqualByComparingTo("4"));
    }
}
