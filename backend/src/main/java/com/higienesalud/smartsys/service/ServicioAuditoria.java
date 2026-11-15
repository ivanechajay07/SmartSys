package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.AuditoriaDao;
import com.higienesalud.smartsys.model.Auditoria;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ServicioAuditoria {

    private final AuditoriaDao Dao;

    public ServicioAuditoria(AuditoriaDao Dao) {
        this.Dao = Dao;
    }

    @Transactional(readOnly = true)
    public List<Auditoria> list(LocalDate desde, LocalDate hasta) {
        if (desde == null && hasta == null) {
            return Dao.findAllByOrderByFechaDesc();
        }
        LocalDateTime start = desde == null ? LocalDateTime.of(2000, 1, 1, 0, 0) : desde.atStartOfDay();
        LocalDateTime end = hasta == null ? LocalDateTime.now().plusDays(1) : hasta.atTime(23, 59, 59);
        return Dao.findByFechaBetweenOrderByFechaDesc(start, end);
    }
}
