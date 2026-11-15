package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.exception.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SolicitudMaterialDao extends JpaRepository<SolicitudMaterial, Long> {
    List<SolicitudMaterial> findAllByOrderByFechaSolicitudDesc();
    Optional<SolicitudMaterial> findFirstByOrdenId(Long ordenId);
}
