package com.higienesalud.smartsys.audit;

/**
 * Traduce método + ruta HTTP a una acción legible y a un módulo funcional.
 */
public final class TraductorAuditoria {

    private TraductorAuditoria() {
    }

    public static String accion(String method, String path, boolean exito) {
        String ruta = normalizar(path);
        if (ruta.startsWith("/auth/login")) {
            return exito ? "Inició sesión" : "Intentó iniciar sesión";
        }
        if (ruta.startsWith("/auth/logout")) return "Cerró sesión";
        if (ruta.startsWith("/auth/refresh")) return "Renovó sesión";
        if (ruta.startsWith("/auth/forgot-password")) return "Solicitó recuperación de contraseña";
        if (ruta.startsWith("/auth/change-password")) return "Cambió su contraseña";
        if (ruta.startsWith("/auth/profile")) return "Actualizó su perfil";
        if (ruta.startsWith("/auth/avatar")) return "Actualizó su foto de perfil";
        if (ruta.startsWith("/auth/mfa/verify")) return exito ? "Verificó segundo factor" : "Falló verificación MFA";
        if (ruta.startsWith("/auth/mfa/setup")) return "Configuró MFA";
        if (ruta.startsWith("/auth/mfa/enable")) return "Activó MFA";
        if (ruta.startsWith("/auth/mfa/disable")) return "Desactivó MFA";

        if (ruta.startsWith("/requests")) {
            if (ruta.endsWith("/approve")) return "Aprobó solicitud";
            if (ruta.endsWith("/reject")) return "Rechazó solicitud";
            if (ruta.endsWith("/submit")) return "Envió solicitud";
            return "Registró solicitud";
        }
        if (ruta.startsWith("/replenishments")) {
            if (ruta.endsWith("/approve")) return "Aprobó reposición";
            if (ruta.endsWith("/reject")) return "Rechazó reposición";
            if (ruta.endsWith("/submit")) return "Envió reposición";
            return "Registró reposición";
        }
        if (ruta.startsWith("/schedules")) {
            if (ruta.endsWith("/preview")) return "Consultó vista previa de programación";
            if (ruta.endsWith("/confirm")) return "Confirmó programación";
            if (ruta.endsWith("/reschedule")) return "Reprogramó entrega";
            if (ruta.endsWith("/cancel")) return "Canceló programación";
            return "Registró programación";
        }
        if (ruta.startsWith("/dispatches")) {
            if (ruta.contains("/receptions")) return "Registró recepción";
            if (ruta.contains("/signatures")) return "Registró firma de entrega";
            if (ruta.contains("/events")) return "Registró evento de despacho";
            if (ruta.endsWith("/prepare")) return "Preparó despacho";
            if (ruta.endsWith("/assign")) return "Asignó transporte";
            if (ruta.endsWith("/transport-receipt")) return "Confirmó carga";
            if (ruta.endsWith("/depart")) return "Inició ruta";
            if (ruta.endsWith("/arrive")) return "Registró llegada";
            if (ruta.endsWith("/deliver")) return "Registró entrega";
            if (ruta.endsWith("/cancel")) return "Canceló despacho";
            if (ruta.contains("/evidence")) return "Adjuntó evidencia";
            if (ruta.contains("/incidents")) return "Registró incidencia";
            return "Registró despacho";
        }
        if (ruta.startsWith("/receptions")) return "Registró recepción";
        if (ruta.startsWith("/inventory/entries")) return "Registró ingreso";
        if (ruta.startsWith("/inventory/adjustments")) return "Registró ajuste";
        if (ruta.startsWith("/products")) {
            return "PUT".equalsIgnoreCase(method) ? "Editó producto" : "Registró producto";
        }
        if (ruta.startsWith("/entities") && ruta.contains("/points")) return "Registró punto de entrega";
        if (ruta.startsWith("/entities")) return "Registró entidad";
        if (ruta.startsWith("/contracts") && ruta.contains("/tdrs")) return "Registró TDR";
        if (ruta.startsWith("/contracts") && ruta.contains("/clauses")) return "Registró cláusula";
        if (ruta.startsWith("/contracts")) return "Registró contrato";
        if (ruta.startsWith("/tdrs") && ruta.contains("/items")) return "Registró item de TDR";
        if (ruta.startsWith("/providers")) return "Registró proveedor";
        if (ruta.startsWith("/vehicles")) return "Registró vehículo";
        if (ruta.startsWith("/roles") && ruta.endsWith("/permissions")) return "Actualizó permisos del rol";
        if (ruta.startsWith("/users")) {
            if (ruta.endsWith("/status")) return "Cambió estado de usuario";
            if (ruta.endsWith("/reset-password")) return "Restableció contraseña";
            if (ruta.endsWith("/avatar")) return "Actualizó foto de usuario";
            if ("PUT".equalsIgnoreCase(method)) return "Editó usuario";
            return "Registró usuario";
        }
        if (ruta.startsWith("/notifications")) return "Actualizó notificaciones";
        return "Realizó operación administrativa";
    }

    public static String modulo(String path) {
        String ruta = normalizar(path);
        if (ruta.startsWith("/auth")) return "SESIÓN";
        if (ruta.contains("/receptions")) return "RECEPCIONES";
        if (ruta.startsWith("/requests")) return "SOLICITUDES";
        if (ruta.startsWith("/replenishments")) return "REPOSICIONES";
        if (ruta.startsWith("/schedules")) return "PROGRAMACIÓN";
        if (ruta.startsWith("/dispatches") || ruta.startsWith("/mobile")) return "DESPACHOS";
        if (ruta.startsWith("/receptions")) return "RECEPCIONES";
        if (ruta.startsWith("/inventory")) return "INVENTARIO";
        if (ruta.startsWith("/products") || ruta.startsWith("/entities")
                || ruta.startsWith("/contracts") || ruta.startsWith("/tdrs")
                || ruta.startsWith("/providers") || ruta.startsWith("/vehicles")) {
            return "DATOS MAESTROS";
        }
        if (ruta.startsWith("/users") || ruta.startsWith("/roles")) return "USUARIOS";
        if (ruta.startsWith("/notifications")) return "NOTIFICACIONES";
        return "SISTEMA";
    }

    public static String detalle(String path, boolean exito, DetectorDispositivo.Info info) {
        String ruta = normalizar(path);
        if (ruta.startsWith("/auth/login")) {
            String equipo = info == null || info.equipo() == null ? "dispositivo desconocido" : info.equipo();
            String ip = info == null || info.ip() == null ? "IP desconocida" : info.ip();
            return (exito ? "Sesión iniciada" : "Intento de inicio de sesión fallido")
                    + " desde " + equipo + " · IP " + ip;
        }
        java.util.regex.Matcher id = java.util.regex.Pattern.compile("/(\\d+)(?:/|$)")
                .matcher(ruta);
        if (id.find()) {
            return "ID afectado: " + id.group(1);
        }
        return exito ? "Operación completada" : "Operación no completada";
    }

    private static String normalizar(String path) {
        return path == null ? "" : path.replaceFirst("^/api/v1", "");
    }
}
