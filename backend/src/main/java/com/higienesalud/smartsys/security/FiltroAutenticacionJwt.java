package com.higienesalud.smartsys.security;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.exception.*;
import com.higienesalud.smartsys.service.ServicioPresencia;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class FiltroAutenticacionJwt extends OncePerRequestFilter {

    private final ServicioJwt ServicioJwt;
    private final ServicioDetallesUsuario userDetailsService;
    private final ServicioPresencia ServicioPresencia;

    public FiltroAutenticacionJwt(ServicioJwt ServicioJwt, ServicioDetallesUsuario userDetailsService,
                         ServicioPresencia ServicioPresencia) {
        this.ServicioJwt = ServicioJwt;
        this.userDetailsService = userDetailsService;
        this.ServicioPresencia = ServicioPresencia;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (ServicioJwt.valid(token)) {
                String email = ServicioJwt.subject(token);
                UserDetails user = userDetailsService.loadUserByUsername(email);
                if (user.isEnabled() && user.isAccountNonLocked()) {
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    ServicioPresencia.touch(ServicioJwt.userId(token));
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}
