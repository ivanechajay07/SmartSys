package com.higienesalud.smartsys.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PruebaRolesPropios {

    private record UsuarioDemo(String email, String rol, String moduloClave, String accionClave) {}

    private static final List<UsuarioDemo> USUARIOS = List.of(
            new UsuarioDemo("admin@smartsys.local", "ADMINISTRADOR", "USUARIOS", "editar"),
            new UsuarioDemo("gerente@smartsys.local", "GERENTE_GENERAL", "REPORTES", "ver"),
            new UsuarioDemo("logistica@smartsys.local", "JEFE_LOGISTICA", "DATOS_MAESTROS", "crear"),
            new UsuarioDemo("almacen@smartsys.local", "ENCARGADO_ALMACEN", "INVENTARIO", "crear"),
            new UsuarioDemo("operativo@smartsys.local", "PERSONAL_OPERATIVO", "SOLICITUDES", "crear"),
            new UsuarioDemo("transporte@smartsys.local", "TRANSPORTISTA", "RUTA_MOVIL", "crear")
    );

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void cadaUsuarioAutenticadoVeSuPropioRolYPermisos() throws Exception {
        for (UsuarioDemo esperado : USUARIOS) {
            String login = mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("email", esperado.email(), "password", "Admin123!"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.rol").value(esperado.rol()))
                    .andReturn().getResponse().getContentAsString();

            String token = objectMapper.readTree(login).get("token").asText();
            assertThat(token).isNotBlank();

            mockMvc.perform(get("/api/v1/auth/me")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email").value(esperado.email()))
                    .andExpect(jsonPath("$.rol").value(esperado.rol()));

            String permisosJson = mockMvc.perform(get("/api/v1/auth/permissions")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();

            JsonNode permisos = objectMapper.readTree(permisosJson);
            assertThat(permisos.isArray()).isTrue();
            assertThat(permisos.size()).isEqualTo(16);

            Map<String, JsonNode> porModulo = new java.util.LinkedHashMap<>();
            permisos.forEach(item -> porModulo.put(item.get("modulo").asText(), item));

            assertThat(porModulo).containsKey("PERFIL");
            assertThat(porModulo.get("PERFIL").get("ver").asBoolean()).isTrue();
            assertThat(porModulo).containsKey(esperado.moduloClave());
            assertThat(porModulo.get(esperado.moduloClave()).get(esperado.accionClave()).asBoolean())
                    .as("%s debe tener %s.%s", esperado.email(), esperado.moduloClave(), esperado.accionClave())
                    .isTrue();
        }
    }

    @Test
    void losPermisosDeUnUsuarioNoSeMezclanConLosDeOtroRol() throws Exception {
        JsonNode admin = permisosDe("admin@smartsys.local");
        JsonNode transporte = permisosDe("transporte@smartsys.local");

        assertThat(admin.get("USUARIOS").get("ver").asBoolean()).isTrue();
        assertThat(transporte.get("USUARIOS").get("ver").asBoolean()).isFalse();
        assertThat(transporte.get("RUTA_MOVIL").get("crear").asBoolean()).isTrue();
        assertThat(admin.get("RUTA_MOVIL").get("crear").asBoolean()).isTrue();
    }

    @Test
    void consultarElPerfilSinSesionDevuelveNoAutorizado() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/auth/permissions"))
                .andExpect(status().isUnauthorized());
    }

    private JsonNode permisosDe(String email) throws Exception {
        String login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("email", email, "password", "Admin123!"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String token = objectMapper.readTree(login).get("token").asText();
        String json = mockMvc.perform(get("/api/v1/auth/permissions")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode array = objectMapper.readTree(json);
        Map<String, JsonNode> porModulo = new java.util.LinkedHashMap<>();
        array.forEach(item -> porModulo.put(item.get("modulo").asText(), item));
        return objectMapper.valueToTree(porModulo);
    }
}
