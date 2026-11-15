package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.exception.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductoDao extends JpaRepository<Producto, Long> {
    Optional<Producto> findByCodigoIgnoreCase(String codigo);
    List<Producto> findByActivoTrueOrderByNombre();
}
