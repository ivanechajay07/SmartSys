package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.exception.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventoSeguimientoDao extends JpaRepository<EventoSeguimiento, Long> {
    List<EventoSeguimiento> findByDespachoIdOrderByFechaHoraAsc(Long despachoId);
}
