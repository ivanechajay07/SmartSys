package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.TokenRefrescoDao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioRevocacionTokens {

    private final TokenRefrescoDao dao;

    public ServicioRevocacionTokens(TokenRefrescoDao dao) {
        this.dao = dao;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeAllFor(Long usuarioId) {
        dao.revokeAllByUsuarioId(usuarioId);
    }
}
