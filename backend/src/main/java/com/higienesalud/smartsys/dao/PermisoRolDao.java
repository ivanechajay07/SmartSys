package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.PermisoRol;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PermisoRolDao extends JpaRepository<PermisoRol, Long> {
    List<PermisoRol> findByRolIdOrderByModuloAsc(Integer rolId);
    Optional<PermisoRol> findByRolIdAndModulo(Integer rolId, String modulo);
}
