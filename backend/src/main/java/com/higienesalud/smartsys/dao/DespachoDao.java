package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.exception.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DespachoDao extends JpaRepository<Despacho, Long> {
    List<Despacho> findAllByOrderByFechaDesc();
    List<Despacho> findByTransportistaIdOrAcompananteIdOrderByFechaAsc(Long transportistaId, Long acompananteId);
    Optional<Despacho> findFirstBySalidaId(Long salidaId);
}
