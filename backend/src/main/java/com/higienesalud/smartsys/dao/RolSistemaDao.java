package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.RolSistema;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RolSistemaDao extends JpaRepository<RolSistema, Integer> {
    List<RolSistema> findAllByOrderByIdAsc();
    Optional<RolSistema> findByNombre(String nombre);
}
