package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.FirmaHojaRuta;
import com.higienesalud.smartsys.model.TipoFirmaHojaRuta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FirmaHojaRutaDao extends JpaRepository<FirmaHojaRuta, Long> {
    List<FirmaHojaRuta> findByDespachoIdOrderByTipoAsc(Long despachoId);

    Optional<FirmaHojaRuta> findByDespachoIdAndTipo(Long despachoId, TipoFirmaHojaRuta tipo);
}
