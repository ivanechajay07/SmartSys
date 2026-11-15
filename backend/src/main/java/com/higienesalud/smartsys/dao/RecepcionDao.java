package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.exception.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecepcionDao extends JpaRepository<Recepcion, Long> {
    List<Recepcion> findAllByOrderByFechaHoraDesc();
    List<Recepcion> findByDespachoId(Long despachoId);
}
