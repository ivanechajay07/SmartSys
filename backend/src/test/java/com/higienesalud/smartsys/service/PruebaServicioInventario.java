package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.model.*;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PruebaServicioInventario {

    @Mock private InventarioDao inventarioDao;
    @Mock private ProductoDao productoDao;
    @Mock private MovimientoInventarioDao movimientoDao;
    @Mock private ReservaStockDao reservaDao;
    @Mock private IngresoAlmacenDao ingresoAlmacenDao;
    @Mock private DetalleIngresoDao detalleIngresoDao;
    @Mock private AlertaStockDao alertaStockDao;
    @Mock private ProveedorDao proveedorDao;

    @InjectMocks private ServicioInventario service;

    private Producto producto;
    private Inventario inventario;

    @BeforeEach
    void setUp() {
        producto = Producto.builder().codigo("P1").nombre("Jabon").unidadMedida("BOTELLA").build();
        producto.setId(1L);
        inventario = Inventario.builder().producto(producto)
                .stockFisico(new BigDecimal("100"))
                .stockReservado(new BigDecimal("20"))
                .stockMinimo(new BigDecimal("10"))
                .build();
        inventario.setId(1L);
    }

    @Test
    void entryIncrementsPhysicalStockAndCreatesMovement() {
        when(inventarioDao.findByProductoIdForUpdate(1L)).thenReturn(Optional.of(inventario));
        when(movimientoDao.save(any(MovimientoInventario.class))).thenAnswer(i -> i.getArgument(0));

        MovimientoInventario movement = service.entry(1L, new BigDecimal("5"), "OC-1", "Ingreso", null);

        assertThat(inventario.getStockFisico()).isEqualByComparingTo("105");
        assertThat(movement.getTipo()).isEqualTo(TipoMovimiento.INGRESO);
        assertThat(movement.getSaldoResultante()).isEqualByComparingTo("105");
    }

    @Test
    void reserveRejectsWhenAvailableStockIsInsufficient() {
        when(inventarioDao.findByProductoIdForUpdate(1L)).thenReturn(Optional.of(inventario));

        assertThatThrownBy(() -> service.reserve(1L, new BigDecimal("90"), "SOLICITUD", 1L))
                .isInstanceOf(ExcepcionNegocio.class)
                .hasMessageContaining("Stock disponible insuficiente");
        verify(inventarioDao, never()).save(any());
    }

    @Test
    void reserveIncrementsReservedStockAndPersistsReservation() {
        when(inventarioDao.findByProductoIdForUpdate(1L)).thenReturn(Optional.of(inventario));
        when(reservaDao.save(any(ReservaStock.class))).thenAnswer(i -> {
            ReservaStock r = i.getArgument(0);
            r.setId(9L);
            return r;
        });

        ReservaStock reserva = service.reserve(1L, new BigDecimal("30"), "SOLICITUD", 5L);

        assertThat(inventario.getStockReservado()).isEqualByComparingTo("50");
        assertThat(reserva.getId()).isEqualTo(9L);
        assertThat(reserva.getEstado()).isEqualTo(EstadoReserva.ACTIVA);
    }

    @Test
    void consumeReservationDecrementsBothStocks() {
        inventario.setStockReservado(new BigDecimal("50"));
        ReservaStock reserva = ReservaStock.builder().producto(producto).cantidad(new BigDecimal("50"))
                .estado(EstadoReserva.ACTIVA).origenTipo("SOLICITUD").origenId(1L).build();
        reserva.setId(3L);
        when(reservaDao.findByIdForUpdate(3L)).thenReturn(Optional.of(reserva));
        when(inventarioDao.findByProductoIdForUpdate(1L)).thenReturn(Optional.of(inventario));
        when(movimientoDao.save(any(MovimientoInventario.class))).thenAnswer(i -> i.getArgument(0));

        MovimientoInventario movement = service.consumeReservation(3L, new BigDecimal("30"),
                "DES-1", "Salida", null);

        assertThat(inventario.getStockFisico()).isEqualByComparingTo("70");
        assertThat(inventario.getStockReservado()).isEqualByComparingTo("20");
        assertThat(reserva.getCantidad()).isEqualByComparingTo("20");
        assertThat(reserva.getEstado()).isEqualTo(EstadoReserva.ACTIVA);
        assertThat(movement.getTipo()).isEqualTo(TipoMovimiento.SALIDA);
    }

    @Test
    void adjustmentCannotLeavePhysicalStockBelowReserved() {
        when(inventarioDao.findByProductoIdForUpdate(1L)).thenReturn(Optional.of(inventario));

        assertThatThrownBy(() -> service.adjust(1L, new BigDecimal("90"),
                TipoMovimiento.AJUSTE_NEGATIVO, "AJ-1", "Merma", null))
                .isInstanceOf(ExcepcionNegocio.class)
                .hasMessageContaining("stock físico menor al reservado");
    }
}
