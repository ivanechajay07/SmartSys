package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.DespachoDao;
import com.higienesalud.smartsys.dao.FirmaHojaRutaDao;
import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.model.Despacho;
import com.higienesalud.smartsys.model.FirmaHojaRuta;
import com.higienesalud.smartsys.model.TipoFirmaHojaRuta;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PruebaServicioHojaRuta {

    @Mock
    private DespachoDao despachoDao;

    @Mock
    private FirmaHojaRutaDao firmaDao;

    @InjectMocks
    private ServicioHojaRuta service;

    @Test
    void guardaFirmaSinImagenParaConservarLosDatosDelFirmante() {
        Despacho despacho = Despacho.builder().codigo("DES-7").build();
        despacho.setId(7L);
        when(despachoDao.findById(7L)).thenReturn(Optional.of(despacho));
        when(firmaDao.findByDespachoIdAndTipo(7L, TipoFirmaHojaRuta.DESPACHO))
                .thenReturn(Optional.empty());
        when(firmaDao.findByDespachoIdOrderByTipoAsc(7L)).thenReturn(List.of());

        service.guardar(7L, List.of(new ServicioHojaRuta.FirmaRequest(
                TipoFirmaHojaRuta.DESPACHO, "Ana Quispe", "12345678",
                "Responsable de despacho", LocalDateTime.of(2026, 11, 8, 10, 30), "")));

        ArgumentCaptor<FirmaHojaRuta> captor = ArgumentCaptor.forClass(FirmaHojaRuta.class);
        verify(firmaDao).save(captor.capture());
        FirmaHojaRuta firma = captor.getValue();
        assertThat(firma.getTipo()).isEqualTo(TipoFirmaHojaRuta.DESPACHO);
        assertThat(firma.getNombre()).isEqualTo("Ana Quispe");
        assertThat(firma.getImagen()).isEmpty();
        assertThat(firma.getFechaFirma()).isEqualTo(LocalDateTime.of(2026, 11, 8, 10, 30));
    }

    @Test
    void guardaImagenBase64Valida() {
        Despacho despacho = Despacho.builder().codigo("DES-8").build();
        despacho.setId(8L);
        when(despachoDao.findById(8L)).thenReturn(Optional.of(despacho));
        when(firmaDao.findByDespachoIdAndTipo(8L, TipoFirmaHojaRuta.RECEPCION))
                .thenReturn(Optional.empty());
        when(firmaDao.findByDespachoIdOrderByTipoAsc(8L)).thenReturn(List.of());
        String imagen = "data:image/png;base64,iVBORw0KGgo=";

        service.guardar(8L, List.of(new ServicioHojaRuta.FirmaRequest(
                TipoFirmaHojaRuta.RECEPCION, "Luis Ramos", "87654321",
                "Responsable de recepción", null, imagen)));

        ArgumentCaptor<FirmaHojaRuta> captor = ArgumentCaptor.forClass(FirmaHojaRuta.class);
        verify(firmaDao).save(captor.capture());
        assertThat(captor.getValue().getImagen()).isEqualTo(imagen);
        assertThat(captor.getValue().getFechaFirma()).isNotNull();
    }

    @Test
    void rechazaFirmasQueNoSonImagen() {
        Despacho despacho = Despacho.builder().codigo("DES-9").build();
        despacho.setId(9L);
        when(despachoDao.findById(9L)).thenReturn(Optional.of(despacho));
        when(firmaDao.findByDespachoIdAndTipo(9L, TipoFirmaHojaRuta.TRANSPORTISTA))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.guardar(9L, List.of(new ServicioHojaRuta.FirmaRequest(
                TipoFirmaHojaRuta.TRANSPORTISTA, "Pedro", null, null, null, "texto"))))
                .isInstanceOf(ExcepcionNegocio.class)
                .hasMessageContaining("imagen");
    }

    @Test
    void listaFirmasDelDespacho() {
        Despacho despacho = Despacho.builder().codigo("DES-10").build();
        despacho.setId(10L);
        when(despachoDao.findById(10L)).thenReturn(Optional.of(despacho));
        when(firmaDao.findByDespachoIdOrderByTipoAsc(10L)).thenReturn(List.of(
                FirmaHojaRuta.builder().tipo(TipoFirmaHojaRuta.DESPACHO)
                        .nombre("Ana").cargo("Despacho").imagen("").build()));

        List<ServicioHojaRuta.FirmaDto> firmas = service.firmas(10L);

        assertThat(firmas).hasSize(1);
        assertThat(firmas.get(0).tipo()).isEqualTo(TipoFirmaHojaRuta.DESPACHO);
        assertThat(firmas.get(0).nombre()).isEqualTo("Ana");
    }
}
