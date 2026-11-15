package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PruebaServicioProgramacion {

    @Mock private ProgramacionDao Dao;
    @Mock private TdrItemDao tdrItemDao;
    @Mock private PuntoEntregaDao puntoDao;

    @InjectMocks private ServicioProgramacion service;

    @Test
    void previewGeneratesMonthlyDatesUntilTotalIsCovered() {
        TdrItem item = item(Frecuencia.MENSUAL, "1200", "200",
                LocalDate.of(2026, 1, 5), LocalDate.of(2026, 6, 30));
        PuntoEntrega punto = punto();
        when(tdrItemDao.findById(1L)).thenReturn(Optional.of(item));
        when(puntoDao.findById(1L)).thenReturn(Optional.of(punto));

        List<ServicioProgramacion.PreviewItem> result = service.preview(1L, 1L);

        assertThat(result).hasSize(6);
        assertThat(result).extracting(ServicioProgramacion.PreviewItem::fecha)
                .containsExactly(LocalDate.of(2026, 1, 5), LocalDate.of(2026, 2, 5),
                        LocalDate.of(2026, 3, 5), LocalDate.of(2026, 4, 5),
                        LocalDate.of(2026, 5, 5), LocalDate.of(2026, 6, 5));
        assertThat(result).allMatch(p -> p.cantidad().compareTo(new BigDecimal("200")) == 0);
    }

    @Test
    void previewRoundsLastDeliveryToRemainingQuantity() {
        TdrItem item = item(Frecuencia.SEMANAL, "1000", "300",
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));
        when(tdrItemDao.findById(1L)).thenReturn(Optional.of(item));
        when(puntoDao.findById(1L)).thenReturn(Optional.of(punto()));

        List<ServicioProgramacion.PreviewItem> result = service.preview(1L, 1L);

        assertThat(result).hasSize(4);
        assertThat(result.get(3).cantidad()).isEqualByComparingTo("100");
        assertThat(result.stream().map(ServicioProgramacion.PreviewItem::cantidad)
                .reduce(BigDecimal.ZERO, BigDecimal::add)).isEqualByComparingTo("1000");
    }

    private TdrItem item(Frecuencia frecuencia, String total, String per, LocalDate start, LocalDate end) {
        EntidadPublica entidad = EntidadPublica.builder().ruc("20131257750").razonSocial("ESSALUD").build();
        entidad.setId(1L);
        Contrato contrato = Contrato.builder().numero("C1").codigo("CTR-1").entidad(entidad).build();
        contrato.setId(1L);
        Tdr tdr = Tdr.builder().contrato(contrato).version("V1").build();
        tdr.setId(1L);
        Producto producto = Producto.builder().codigo("P1").nombre("Jabon").unidadMedida("BOTELLA").build();
        producto.setId(1L);
        TdrItem item = TdrItem.builder().tdr(tdr).producto(producto)
                .cantidadTotal(new BigDecimal(total)).unidad("BOTELLA").frecuencia(frecuencia)
                .cantidadPorEntrega(new BigDecimal(per)).fechaProgramada(start).fechaLimite(end).build();
        item.setId(1L);
        return item;
    }

    private PuntoEntrega punto() {
        EntidadPublica entidad = EntidadPublica.builder().ruc("20131257750").razonSocial("ESSALUD").build();
        entidad.setId(1L);
        PuntoEntrega punto = PuntoEntrega.builder().entidad(entidad).nombre("Hospital").build();
        punto.setId(1L);
        return punto;
    }
}
