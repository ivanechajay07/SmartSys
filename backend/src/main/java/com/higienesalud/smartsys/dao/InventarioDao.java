package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.exception.*;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface InventarioDao extends JpaRepository<Inventario, Long> {
    Optional<Inventario> findByProductoId(Long productoId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inventario i where i.producto.id = :productoId")
    Optional<Inventario> findByProductoIdForUpdate(@Param("productoId") Long productoId);
}
