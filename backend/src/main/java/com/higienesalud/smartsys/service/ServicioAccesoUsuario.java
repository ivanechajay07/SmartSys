package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.UsuarioDao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Registro de acceso en una transacción independiente para evitar bloqueos
 * cruzados cuando varios inicios de sesión del mismo usuario ocurren en paralelo.
 */
@Service
public class ServicioAccesoUsuario {

    private final UsuarioDao Dao;

    public ServicioAccesoUsuario(UsuarioDao Dao) {
        this.Dao = Dao;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registerSuccessfulLogin(Long usuarioId) {
        Dao.findById(usuarioId).ifPresent(usuario -> {
            usuario.setIntentosFallidos(0);
            usuario.setBloqueadoHasta(null);
            usuario.setUltimoAcceso(LocalDateTime.now());
            Dao.save(usuario);
        });
    }
}
