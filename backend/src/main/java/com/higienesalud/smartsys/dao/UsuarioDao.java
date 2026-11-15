package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.exception.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioDao extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    long countByRolAndActivoTrue(Rol rol);
}
