package com.higienesalud.smartsys.security;

import com.higienesalud.smartsys.dao.UsuarioDao;
import com.higienesalud.smartsys.model.Usuario;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PruebaBloqueoLogin {

    private static final String EMAIL = "operativo@smartsys.local";
    private static final String PASSWORD = "Admin123!";
    private static final String WRONG = "ClaveIncorrecta123!";

    @Autowired private MockMvc mockMvc;
    @Autowired private UsuarioDao usuarioDao;

    @Test
    void informaIntentosRestantesYDesbloqueoEnTiempoReal() throws Exception {
        Usuario usuario = usuarioDao.findByEmailIgnoreCase(EMAIL).orElseThrow();
        usuario.setIntentosFallidos(0);
        usuario.setBloqueadoHasta(null);
        usuarioDao.saveAndFlush(usuario);
        try {
            for (int intento = 1; intento <= 4; intento++) {
                mockMvc.perform(post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"" + EMAIL + "\",\"password\":\"" + WRONG + "\"}"))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.intentosFallidos").value(intento))
                        .andExpect(jsonPath("$.intentosRestantes").value(5 - intento))
                        .andExpect(jsonPath("$.bloqueado").value(false))
                        .andExpect(jsonPath("$.segundosParaDesbloqueo").value(0));
            }

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"" + EMAIL + "\",\"password\":\"" + WRONG + "\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.intentosFallidos").value(5))
                    .andExpect(jsonPath("$.intentosRestantes").value(0))
                    .andExpect(jsonPath("$.bloqueado").value(true))
                    .andExpect(jsonPath("$.segundosParaDesbloqueo").isNumber())
                    .andExpect(jsonPath("$.bloqueadoHasta").isNotEmpty());

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"" + EMAIL + "\",\"password\":\"" + PASSWORD + "\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.bloqueado").value(true))
                    .andExpect(jsonPath("$.segundosParaDesbloqueo").isNumber());
        } finally {
            usuario.setIntentosFallidos(0);
            usuario.setBloqueadoHasta(null);
            usuarioDao.saveAndFlush(usuario);
        }
    }

    @Test
    void unBloqueoExpiradoReiniciaElContador() throws Exception {
        Usuario usuario = usuarioDao.findByEmailIgnoreCase(EMAIL).orElseThrow();
        usuario.setIntentosFallidos(5);
        usuario.setBloqueadoHasta(LocalDateTime.now().minusMinutes(1));
        usuarioDao.saveAndFlush(usuario);
        try {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"" + EMAIL + "\",\"password\":\"" + WRONG + "\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.intentosFallidos").value(1))
                    .andExpect(jsonPath("$.intentosRestantes").value(4))
                    .andExpect(jsonPath("$.bloqueado").value(false));
        } finally {
            usuario.setIntentosFallidos(0);
            usuario.setBloqueadoHasta(null);
            usuarioDao.saveAndFlush(usuario);
        }
    }

    @Test
    void unCorreoDesconocidoNoRevelaContadores() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"no-existe-login@smartsys.local\",\"password\":\"" + WRONG + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Credenciales invalidas"))
                .andExpect(jsonPath("$.intentosRestantes").doesNotExist())
                .andExpect(jsonPath("$.bloqueado").value(false));
    }
}
