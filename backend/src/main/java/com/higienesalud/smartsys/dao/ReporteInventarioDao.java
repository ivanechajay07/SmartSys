package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.ReporteInventario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReporteInventarioDao extends JpaRepository<ReporteInventario, Long> {
    List<ReporteInventario> findTop20ByOrderByFechaGeneracionDescIdDesc();
}
