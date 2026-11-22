package com.higienesalud.smartsys.integration;

import com.higienesalud.smartsys.dao.AuditoriaDao;
import com.higienesalud.smartsys.model.Auditoria;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PruebaAuditoriaRegistro {

    private static final String ADMIN = "admin@smartsys.local";
    private static final String PASSWORD = "Admin123!";

    @Autowired private MockMvc mockMvc;
    @Autowired private AuditoriaDao auditoriaDao;
    @Autowired private ObjectMapper objectMapper;

    static Stream<Arguments> modulosQueRegistran() {
        String suffix = Long.toString(System.nanoTime());
        String solicitud = "{\"entidadId\":999999,\"puntoEntregaId\":999999,"
                + "\"justificacion\":\"Auditoría\",\"items\":[{\"productoId\":999999,\"cantidad\":1}]}";
        String reposicion = "{\"justificacion\":\"Auditoría\","
                + "\"items\":[{\"productoId\":999999,\"cantidad\":1}]}";
        String programacion = "{\"tdrItemId\":999999,\"puntoId\":999999,"
                + "\"fecha\":\"2026-12-01\",\"cantidad\":1}";
        String despacho = "{\"programacionId\":999999,\"responsableId\":999999}";
        String recepcion = "{\"recibidoPor\":\"Auditoría\","
                + "\"items\":[{\"productoId\":999999}]}";
        String producto = "{\"codigo\":\"AUD-" + suffix + "\",\"nombre\":\"Producto auditoría\","
                + "\"unidadMedida\":\"UNIDAD\"}";
        String entidad = "{\"ruc\":\"20999999999\",\"razonSocial\":\"Entidad auditoría\"}";
        String contrato = "{\"numero\":\"AUD-" + suffix + "\",\"codigo\":\"AUD-" + suffix + "\","
                + "\"entidadId\":999999}";
        String proveedor = "{\"ruc\":\"20999999998\",\"razonSocial\":\"Proveedor auditoría\"}";
        String vehiculo = "{\"placa\":\"AUD-123\",\"marca\":\"Test\"}";
        String usuario = "{\"nombres\":\"Auditoría\",\"apellidos\":\"Test\","
                + "\"email\":\"audit-" + suffix + "@smartsys.local\",\"rol\":\"PERSONAL_LOGISTICA\","
                + "\"password\":\"ClaveSegura123\",\"activo\":true}";

        return Stream.of(
                Arguments.of("POST", "/api/v1/requests", "SOLICITUDES", "Registró solicitud", solicitud),
                Arguments.of("POST", "/api/v1/replenishments", "REPOSICIONES", "Registró reposición", reposicion),
                Arguments.of("POST", "/api/v1/schedules", "PROGRAMACIÓN", "Registró programación", programacion),
                Arguments.of("POST", "/api/v1/dispatches", "DESPACHOS", "Registró despacho", despacho),
                Arguments.of("POST", "/api/v1/dispatches/999999/receptions", "RECEPCIONES", "Registró recepción", recepcion),
                Arguments.of("POST", "/api/v1/inventory/entries", "INVENTARIO", "Registró ingreso",
                        "{\"productoId\":999999,\"cantidad\":1}"),
                Arguments.of("POST", "/api/v1/products", "DATOS MAESTROS", "Registró producto", producto),
                Arguments.of("POST", "/api/v1/entities", "DATOS MAESTROS", "Registró entidad", entidad),
                Arguments.of("POST", "/api/v1/contracts", "DATOS MAESTROS", "Registró contrato", contrato),
                Arguments.of("POST", "/api/v1/providers", "DATOS MAESTROS", "Registró proveedor", proveedor),
                Arguments.of("POST", "/api/v1/vehicles", "DATOS MAESTROS", "Registró vehículo", vehiculo),
                Arguments.of("POST", "/api/v1/users", "USUARIOS", "Registró usuario", usuario),
                Arguments.of("PUT", "/api/v1/roles/1/permissions", "USUARIOS", "Actualizó permisos del rol", "[]"),
                Arguments.of("POST", "/api/v1/notifications/read-all", "NOTIFICACIONES", "Actualizó notificaciones", "{}"),
                Arguments.of("POST", "/api/v1/auth/forgot-password", "SESIÓN", "Solicitó recuperación de contraseña",
                        "{\"email\":\"no-existe-audit@smartsys.local\"}")
        );
    }

    @ParameterizedTest(name = "{0} {1} registra en {2}")
    @MethodSource("modulosQueRegistran")
    void cadaModuloQueRegistraDejaAuditoria(
            String method, String path, String modulo, String accion, String body) throws Exception {
        mockMvc.perform(request(HttpMethod.valueOf(method), path)
                        .with(user(ADMIN).roles("ADMINISTRADOR"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body));

        Auditoria auditoria = ultimaAuditoria(path, method);
        assertThat(auditoria).as("Auditoría para %s %s", method, path).isNotNull();
        assertThat(auditoria.getModulo()).isEqualTo(modulo);
        assertThat(auditoria.getAccion()).isEqualTo(accion);
        assertThat(auditoria.getMetodo()).isEqualTo(method);
        assertThat(auditoria.getUsuarioEmail()).isEqualTo(ADMIN);
    }

    @Test
    void loginExitosoRegistraSesionYUsuario() throws Exception {
        mockMvc.perform(request(HttpMethod.POST, "/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                java.util.Map.of("email", ADMIN, "password", PASSWORD))));

        Auditoria auditoria = ultimaAuditoria("/api/v1/auth/login", "POST");
        assertThat(auditoria).isNotNull();
        assertThat(auditoria.getModulo()).isEqualTo("SESIÓN");
        assertThat(auditoria.getAccion()).isEqualTo("Inició sesión");
        assertThat(auditoria.getUsuarioEmail()).isEqualTo(ADMIN);
        assertThat(auditoria.isExito()).isTrue();
    }

    @Test
    void unaOperacionFallidaTambienQuedaRegistrada() throws Exception {
        String body = "{\"entidadId\":999999,\"puntoEntregaId\":999999,"
                + "\"justificacion\":\"Auditoría fallida\","
                + "\"items\":[{\"productoId\":999999,\"cantidad\":1}]}";
        mockMvc.perform(request(HttpMethod.POST, "/api/v1/requests")
                        .with(user(ADMIN).roles("ADMINISTRADOR"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body));

        Auditoria auditoria = ultimaAuditoria("/api/v1/requests", "POST");
        assertThat(auditoria).isNotNull();
        assertThat(auditoria.getModulo()).isEqualTo("SOLICITUDES");
        assertThat(auditoria.isExito()).isFalse();
        assertThat(auditoria.getDetalle()).isNotBlank();
    }

    private Auditoria ultimaAuditoria(String path, String method) {
        return auditoriaDao.findAll().stream()
                .filter(a -> path.equals(a.getRecurso()) && method.equals(a.getMetodo()))
                .max(Comparator.comparing(Auditoria::getId))
                .orElse(null);
    }
}
