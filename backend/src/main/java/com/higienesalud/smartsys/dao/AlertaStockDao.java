package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.AlertaStock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AlertaStockDao extends JpaRepository<AlertaStock, Long> {
    Optional<AlertaStock> findFirstByInventarioIdAndEstadoTrueOrderByFechaAlertaDesc(Long inventarioId);
}
