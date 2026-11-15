package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.DetalleSalida;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DetalleSalidaDao extends JpaRepository<DetalleSalida, Long> {
    List<DetalleSalida> findBySalidaIdOrderByIdAsc(Long salidaId);
}
