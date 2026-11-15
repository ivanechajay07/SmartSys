package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.DespachoDao;
import com.higienesalud.smartsys.dao.FirmaHojaRutaDao;
import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.exception.ExcepcionNoEncontrada;
import com.higienesalud.smartsys.model.Despacho;
import com.higienesalud.smartsys.model.FirmaHojaRuta;
import com.higienesalud.smartsys.model.TipoFirmaHojaRuta;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ServicioHojaRuta {

    private final DespachoDao despachoDao;
    private final FirmaHojaRutaDao firmaDao;

    public ServicioHojaRuta(DespachoDao despachoDao, FirmaHojaRutaDao firmaDao) {
        this.despachoDao = despachoDao;
        this.firmaDao = firmaDao;
    }

    @Transactional(readOnly = true)
    public List<FirmaDto> firmas(Long despachoId) {
        asegurarDespacho(despachoId);
        return firmaDao.findByDespachoIdOrderByTipoAsc(despachoId).stream()
                .map(FirmaDto::desde)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FirmaHojaRuta> firmasEntidad(Long despachoId) {
        asegurarDespacho(despachoId);
        return firmaDao.findByDespachoIdOrderByTipoAsc(despachoId);
    }

    @Transactional
    public List<FirmaDto> guardar(Long despachoId, List<FirmaRequest> solicitudes) {
        Despacho despacho = asegurarDespacho(despachoId);
        for (FirmaRequest solicitud : solicitudes) {
            if (solicitud.tipo() == null) {
                throw new ExcepcionNegocio("El tipo de firma es obligatorio");
            }
            Optional<FirmaHojaRuta> existente = firmaDao.findByDespachoIdAndTipo(despachoId, solicitud.tipo());
            String imagen = normalizarImagen(solicitud.imagen());
            FirmaHojaRuta firma = existente.orElseGet(() -> FirmaHojaRuta.builder()
                    .despacho(despacho)
                    .tipo(solicitud.tipo())
                    .build());
            firma.setNombre(limpiar(solicitud.nombre()));
            firma.setDni(limpiar(solicitud.dni()));
            firma.setCargo(limpiar(solicitud.cargo()));
            firma.setFechaFirma(solicitud.fechaFirma() == null ? LocalDateTime.now() : solicitud.fechaFirma());
            firma.setImagen(imagen);
            firmaDao.save(firma);
        }
        firmaDao.flush();
        return firmas(despachoId);
    }

    private Despacho asegurarDespacho(Long despachoId) {
        return despachoDao.findById(despachoId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Despacho no encontrado"));
    }

    private String normalizarImagen(String imagen) {
        if (imagen == null || imagen.isBlank()) {
            return "";
        }
        String value = imagen.trim();
        if (!value.startsWith("data:image/")) {
            throw new ExcepcionNegocio("La firma debe ser una imagen PNG o JPEG");
        }
        if (value.length() > 2_000_000) {
            throw new ExcepcionNegocio("La firma excede el tamaño permitido");
        }
        return value;
    }

    private String limpiar(String value) {
        if (value == null) {
            return null;
        }
        String limpio = value.trim();
        return limpio.isEmpty() ? null : limpio;
    }

    public record FirmaRequest(
            @NotNull TipoFirmaHojaRuta tipo,
            @Size(max = 160) String nombre,
            @Size(max = 20) String dni,
            @Size(max = 120) String cargo,
            LocalDateTime fechaFirma,
            String imagen) {
    }

    public record FirmaDto(
            TipoFirmaHojaRuta tipo,
            String nombre,
            String dni,
            String cargo,
            LocalDateTime fechaFirma,
            String imagen) {

        static FirmaDto desde(FirmaHojaRuta firma) {
            return new FirmaDto(firma.getTipo(), firma.getNombre(), firma.getDni(),
                    firma.getCargo(), firma.getFechaFirma(), firma.getImagen());
        }
    }
}
