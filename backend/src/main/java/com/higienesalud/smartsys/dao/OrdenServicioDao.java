package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.OrdenServicio;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrdenServicioDao extends JpaRepository<OrdenServicio, Long> {
}
