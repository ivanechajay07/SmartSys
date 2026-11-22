package com.higienesalud.smartsys.security;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
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
        mockMvc.perform(post("/api/v1/requests/1/approve").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    void loginReturnsAccessTokenAndHttpOnlyRefreshCookie() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@smartsys.local","password":"Admin123!"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(jsonPath("$.rol").value("ADMINISTRADOR"))
                .andReturn();

        Cookie refreshCookie = result.getResponse().getCookie("smartsys_refresh");
        assertThat(refreshCookie).isNotNull();
        assertThat(refreshCookie.isHttpOnly()).isTrue();
        assertThat(refreshCookie.getPath()).isEqualTo("/api/v1/auth");
        assertThat(result.getResponse().getHeaders(HttpHeaders.SET_COOKIE))
                .anyMatch(value -> value.contains("smartsys_refresh=") && value.contains("SameSite=Strict"));
    }

    @Test
    void csrfEndpointIssuesCookie() throws Exception {
        mockMvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
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
    void refreshTokenRotatesAndReuseRevokesTheWholeFamily() throws Exception {
        Cookie original = loginCookie("logistica@smartsys.local");

        MvcResult rotatedResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(original)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();
        Cookie rotated = rotatedResult.getResponse().getCookie("smartsys_refresh");
        assertThat(rotated).isNotNull();
        assertThat(rotated.getValue()).isNotEqualTo(original.getValue());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(original)
                        .with(csrf()))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(rotated)
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void refreshRequiresCsrfToken() throws Exception {
        Cookie cookie = loginCookie("logistica@smartsys.local");
        mockMvc.perform(post("/api/v1/auth/refresh").cookie(cookie))
                .andExpect(status().isForbidden());
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
    void logoutRevokesRefreshCookieWithoutAccessToken() throws Exception {
        Cookie refresh = loginCookie("admin@smartsys.local");

        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(refresh)
                        .with(csrf()))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refresh)
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "operativo@smartsys.local", roles = "PERSONAL_OPERATIVO")
    void mfaSetupRequiresCsrfAndReturnsSecret() throws Exception {
        mockMvc.perform(post("/api/v1/auth/mfa/setup"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/auth/mfa/setup").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.secret").isNotEmpty())
                .andExpect(jsonPath("$.otpauthUri").value(org.hamcrest.Matchers.containsString("otpauth://totp/")));

        Usuario usuario = usuarioDao.findByEmailIgnoreCase("operativo@smartsys.local").orElseThrow();
        usuario.setMfaSecret(null);
        usuario.setMfaEnabled(false);
        usuarioDao.saveAndFlush(usuario);
    }

    @Test
    void loginForMfaUserReturnsChallengeInsteadOfTokens() throws Exception {
        Usuario usuario = usuarioDao.findByEmailIgnoreCase("operativo@smartsys.local").orElseThrow();
        usuario.setMfaSecret("JBSWY3DPEHPK3PXP");
        usuario.setMfaEnabled(true);
        usuarioDao.saveAndFlush(usuario);
        try {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"email":"operativo@smartsys.local","password":"Admin123!"}
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.mfaRequired").value(true))
                    .andExpect(jsonPath("$.mfaToken").isNotEmpty())
                    .andExpect(jsonPath("$.token").doesNotExist());
        } finally {
            usuario.setMfaEnabled(false);
            usuario.setMfaSecret(null);
            usuarioDao.saveAndFlush(usuario);
        }
    }

    @Test
    @WithMockUser(username = "operativo@smartsys.local", roles = "PERSONAL_OPERATIVO")
    void invalidMfaCodeDoesNotEnableMfa() throws Exception {
        String setup = mockMvc.perform(post("/api/v1/auth/mfa/setup").with(csrf()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(objectMapper.readTree(setup).get("secret").asText()).isNotEmpty();

        mockMvc.perform(post("/api/v1/auth/mfa/enable")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"000000\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "admin@smartsys.local", roles = "ADMINISTRADOR")
    void unknownRouteReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/no-existe"))
                .andExpect(status().isNotFound());
    }

    @Test
    void malformedJsonReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{bad"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "logistica@smartsys.local", roles = "JEFE_LOGISTICA")
    void userManagementRejectsNonAdminRole() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombres":"Nuevo","apellidos":"Usuario","email":"nuevo@smartsys.local",
                                 "rol":"PERSONAL_LOGISTICA","password":"ClaveSegura123","activo":true}
                                """))
                .andExpect(status().isForbidden());
    }

    private Cookie loginCookie(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Admin123!\"}"))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookie = result.getResponse().getCookie("smartsys_refresh");
        assertThat(cookie).isNotNull();
        return cookie;
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
