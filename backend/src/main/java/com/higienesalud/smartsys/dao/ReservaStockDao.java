package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.exception.*;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReservaStockDao extends JpaRepository<ReservaStock, Long> {
    List<ReservaStock> findByOrigenTipoAndOrigenId(String origenTipo, Long origenId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from ReservaStock r where r.id = :id")
    Optional<ReservaStock> findByIdForUpdate(@Param("id") Long id);
}
