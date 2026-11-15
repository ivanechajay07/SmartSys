package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.model.Despacho;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PruebaExportadorHojaRuta {

    @Test
    void generaPdfCorporativoConDatosMinimos() {
        Despacho despacho = Despacho.builder()
                .codigo("DES-1")
                .numeroHojaRuta("HR-1")
                .fecha(LocalDate.of(2026, 11, 8))
                .build();

        byte[] pdf = new ExportadorHojaRuta().generar(despacho, List.of());

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
        assertThat(pdf.length).isGreaterThan(1000);
    }
}
