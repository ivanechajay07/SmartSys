package com.higienesalud.smartsys.security;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.exception.*;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class UsuarioActual {
    private final UsuarioDao Dao;

    public UsuarioActual(UsuarioDao Dao) {
        this.Dao = Dao;
    }

    public Usuario get() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return Dao.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalStateException("Usuario autenticado no encontrado"));
    }
}
