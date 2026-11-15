package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.exception.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TdrDao extends JpaRepository<Tdr, Long> {
    List<Tdr> findByContratoIdOrderByFechaVigenciaDesc(Long contratoId);
}
