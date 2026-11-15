package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.exception.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditoriaDao extends JpaRepository<Auditoria, Long> {
    List<Auditoria> findAllByOrderByFechaDesc();
    List<Auditoria> findByFechaBetweenOrderByFechaDesc(LocalDateTime desde, LocalDateTime hasta);
}
