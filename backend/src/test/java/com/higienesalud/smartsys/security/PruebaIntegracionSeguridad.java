package com.higienesalud.smartsys.security;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PruebaIntegracionSeguridad {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UsuarioDao usuarioDao;

    @Test
    void protectedEndpointRejectsAnonymousRequest() throws Exception {
        mockMvc.perform(get("/api/v1/products"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "admin@smartsys.local", roles = "ADMINISTRADOR")
    void protectedEndpointAllowsAuthenticatedUser() throws Exception {
        mockMvc.perform(get("/api/v1/products"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "transporte@smartsys.local", roles = "TRANSPORTISTA")
    void writeEndpointRejectsInsufficientRole() throws Exception {
        mockMvc.perform(post("/api/v1/requests/1/approve"))
                .andExpect(status().isForbidden());
    }

    @Test
    void loginReturnsAccessAndRefreshTokens() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@smartsys.local","password":"Admin123!"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.rol").value("ADMINISTRADOR"));
    }

    @Test
    void invalidCredentialsReturnBusinessError() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@smartsys.local","password":"incorrecta"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Credenciales invalidas"));
    }

    @Test
    void refreshTokenRotatesAndCannotBeReused() throws Exception {
        String login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"logistica@smartsys.local","password":"Admin123!"}
                                """))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode node = objectMapper.readTree(login);
        String refresh = node.get("refreshToken").asText();

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void accessTokenStopsWorkingWhenUserIsDeactivated() throws Exception {
        String login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"almacen@smartsys.local","password":"Admin123!"}
                                """))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String token = objectMapper.readTree(login).get("token").asText();

        Usuario usuario = usuarioDao.findByEmailIgnoreCase("almacen@smartsys.local").orElseThrow();
        usuario.setActivo(false);
        usuarioDao.saveAndFlush(usuario);
        try {
            mockMvc.perform(get("/api/v1/products").header("Authorization", "Bearer " + token))
                    .andExpect(status().isUnauthorized());
        } finally {
            usuario.setActivo(true);
            usuarioDao.saveAndFlush(usuario);
        }
    }

    @Test
    void forgotPasswordRespondsGenericallyForKnownAndUnknownEmails() throws Exception {
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@smartsys.local"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"noexiste@smartsys.local"}
                                """))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "logistica@smartsys.local", roles = "JEFE_LOGISTICA")
    void userManagementRejectsNonAdminRole() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombres":"Nuevo","apellidos":"Usuario","email":"nuevo@smartsys.local",
                                 "rol":"PERSONAL_LOGISTICA","password":"ClaveSegura123","activo":true}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@smartsys.local", roles = "ADMINISTRADOR")
    void userListDoesNotExposePasswordHash() throws Exception {
        String body = mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).contains("admin@smartsys.local").doesNotContain("passwordHash");
    }
}
