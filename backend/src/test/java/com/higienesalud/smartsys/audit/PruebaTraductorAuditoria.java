package com.higienesalud.smartsys.audit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.params.provider.Arguments.arguments;

class PruebaTraductorAuditoria {

    static Stream<Arguments> rutasQueRegistran() {
        return Stream.of(
                arguments("POST", "/api/v1/auth/login", "SESIÓN", "Inició sesión"),
                arguments("POST", "/api/v1/auth/logout", "SESIÓN", "Cerró sesión"),
                arguments("POST", "/api/v1/auth/refresh", "SESIÓN", "Renovó sesión"),
                arguments("POST", "/api/v1/auth/forgot-password", "SESIÓN", "Solicitó recuperación de contraseña"),
                arguments("PUT", "/api/v1/auth/profile", "SESIÓN", "Actualizó su perfil"),
                arguments("PUT", "/api/v1/auth/avatar", "SESIÓN", "Actualizó su foto de perfil"),
                arguments("POST", "/api/v1/auth/change-password", "SESIÓN", "Cambió su contraseña"),
                arguments("POST", "/api/v1/auth/mfa/verify", "SESIÓN", "Verificó segundo factor"),
                arguments("POST", "/api/v1/auth/mfa/setup", "SESIÓN", "Configuró MFA"),
                arguments("POST", "/api/v1/auth/mfa/enable", "SESIÓN", "Activó MFA"),
                arguments("POST", "/api/v1/auth/mfa/disable", "SESIÓN", "Desactivó MFA"),

                arguments("POST", "/api/v1/requests", "SOLICITUDES", "Registró solicitud"),
                arguments("POST", "/api/v1/requests/12/submit", "SOLICITUDES", "Envió solicitud"),
                arguments("POST", "/api/v1/requests/12/approve", "SOLICITUDES", "Aprobó solicitud"),
                arguments("POST", "/api/v1/requests/12/reject", "SOLICITUDES", "Rechazó solicitud"),

                arguments("POST", "/api/v1/replenishments", "REPOSICIONES", "Registró reposición"),
                arguments("POST", "/api/v1/replenishments/4/submit", "REPOSICIONES", "Envió reposición"),
                arguments("POST", "/api/v1/replenishments/4/approve", "REPOSICIONES", "Aprobó reposición"),
                arguments("POST", "/api/v1/replenishments/4/reject", "REPOSICIONES", "Rechazó reposición"),

                arguments("POST", "/api/v1/schedules", "PROGRAMACIÓN", "Registró programación"),
                arguments("POST", "/api/v1/schedules/preview", "PROGRAMACIÓN", "Consultó vista previa de programación"),
                arguments("POST", "/api/v1/schedules/confirm", "PROGRAMACIÓN", "Confirmó programación"),
                arguments("POST", "/api/v1/schedules/7/reschedule", "PROGRAMACIÓN", "Reprogramó entrega"),
                arguments("POST", "/api/v1/schedules/7/cancel", "PROGRAMACIÓN", "Canceló programación"),

                arguments("POST", "/api/v1/dispatches", "DESPACHOS", "Registró despacho"),
                arguments("POST", "/api/v1/dispatches/9/prepare", "DESPACHOS", "Preparó despacho"),
                arguments("POST", "/api/v1/dispatches/9/assign", "DESPACHOS", "Asignó transporte"),
                arguments("POST", "/api/v1/dispatches/9/depart", "DESPACHOS", "Inició ruta"),
                arguments("POST", "/api/v1/dispatches/9/arrive", "DESPACHOS", "Registró llegada"),
                arguments("POST", "/api/v1/dispatches/9/deliver", "DESPACHOS", "Registró entrega"),
                arguments("POST", "/api/v1/dispatches/9/cancel", "DESPACHOS", "Canceló despacho"),
                arguments("POST", "/api/v1/dispatches/9/evidence", "DESPACHOS", "Adjuntó evidencia"),
                arguments("POST", "/api/v1/dispatches/9/incidents", "DESPACHOS", "Registró incidencia"),
                arguments("POST", "/api/v1/dispatches/9/events", "DESPACHOS", "Registró evento de despacho"),
                arguments("POST", "/api/v1/dispatches/9/signatures", "DESPACHOS", "Registró firma de entrega"),
                arguments("POST", "/api/v1/dispatches/9/receptions", "RECEPCIONES", "Registró recepción"),

                arguments("POST", "/api/v1/receptions", "RECEPCIONES", "Registró recepción"),
                arguments("POST", "/api/v1/inventory/entries", "INVENTARIO", "Registró ingreso"),
                arguments("POST", "/api/v1/inventory/adjustments", "INVENTARIO", "Registró ajuste"),

                arguments("POST", "/api/v1/products", "DATOS MAESTROS", "Registró producto"),
                arguments("PUT", "/api/v1/products/3", "DATOS MAESTROS", "Editó producto"),
                arguments("POST", "/api/v1/entities", "DATOS MAESTROS", "Registró entidad"),
                arguments("POST", "/api/v1/entities/2/points", "DATOS MAESTROS", "Registró punto de entrega"),
                arguments("POST", "/api/v1/contracts", "DATOS MAESTROS", "Registró contrato"),
                arguments("POST", "/api/v1/contracts/2/tdrs", "DATOS MAESTROS", "Registró TDR"),
                arguments("POST", "/api/v1/contracts/2/clauses", "DATOS MAESTROS", "Registró cláusula"),
                arguments("POST", "/api/v1/tdrs/5/items", "DATOS MAESTROS", "Registró item de TDR"),
                arguments("POST", "/api/v1/providers", "DATOS MAESTROS", "Registró proveedor"),
                arguments("POST", "/api/v1/vehicles", "DATOS MAESTROS", "Registró vehículo"),

                arguments("POST", "/api/v1/users", "USUARIOS", "Registró usuario"),
                arguments("PUT", "/api/v1/users/6", "USUARIOS", "Editó usuario"),
                arguments("POST", "/api/v1/users/6/status", "USUARIOS", "Cambió estado de usuario"),
                arguments("POST", "/api/v1/users/6/reset-password", "USUARIOS", "Restableció contraseña"),
                arguments("POST", "/api/v1/users/6/avatar", "USUARIOS", "Actualizó foto de usuario"),
                arguments("PUT", "/api/v1/roles/3/permissions", "USUARIOS", "Actualizó permisos del rol"),

                arguments("POST", "/api/v1/notifications/15/read", "NOTIFICACIONES", "Actualizó notificaciones"),
                arguments("POST", "/api/v1/notifications/read-all", "NOTIFICACIONES", "Actualizó notificaciones")
        );
    }

    @ParameterizedTest(name = "{0} {1} -> {2} / {3}")
    @MethodSource("rutasQueRegistran")
    void traduceCadaModuloQueRegistra(String method, String path, String modulo, String accion) {
        assertThat(TraductorAuditoria.modulo(path)).isEqualTo(modulo);
        assertThat(TraductorAuditoria.accion(method, path, true)).isEqualTo(accion);
    }

    @Test
    void extraeElIdAfectadoEnElDetalle() {
        assertThat(TraductorAuditoria.detalle("/api/v1/requests/42/approve", true, null))
                .isEqualTo("ID afectado: 42");
    }

    @Test
    void unaRutaDesconocidaQuedaEnSistema() {
        assertThat(TraductorAuditoria.modulo("/api/v1/desconocido")).isEqualTo("SISTEMA");
        assertThat(TraductorAuditoria.accion("POST", "/api/v1/desconocido", true))
                .isEqualTo("Realizó operación administrativa");
    }
}
