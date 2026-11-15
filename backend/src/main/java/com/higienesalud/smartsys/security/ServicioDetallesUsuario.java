package com.higienesalud.smartsys.security;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.exception.*;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ServicioDetallesUsuario implements UserDetailsService {

    private final UsuarioDao Dao;

    public ServicioDetallesUsuario(UsuarioDao Dao) {
        this.Dao = Dao;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Usuario usuario = Dao.findByEmailIgnoreCase(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        boolean locked = usuario.getBloqueadoHasta() != null
                && usuario.getBloqueadoHasta().isAfter(java.time.LocalDateTime.now());

        return User.builder()
                .username(usuario.getEmail())
                .password(usuario.getPasswordHash())
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getRol().name())))
                .disabled(!usuario.isActivo())
                .accountLocked(locked)
                .build();
    }
}
