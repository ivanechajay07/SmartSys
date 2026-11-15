package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.DetalleIngreso;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DetalleIngresoDao extends JpaRepository<DetalleIngreso, Long> {
    List<DetalleIngreso> findByIngresoIdOrderByIdAsc(Long ingresoId);
}
