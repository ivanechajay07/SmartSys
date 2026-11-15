package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.Proveedor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProveedorDao extends JpaRepository<Proveedor, Long> {
    Optional<Proveedor> findByRuc(String ruc);
}
