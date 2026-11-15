package com.higienesalud.smartsys.security;

import com.higienesalud.smartsys.dao.PermisoRolDao;
import com.higienesalud.smartsys.dao.RolSistemaDao;
import com.higienesalud.smartsys.model.PermisoRol;
import com.higienesalud.smartsys.model.RolSistema;
import com.higienesalud.smartsys.service.ServicioPermisos;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static java.util.Map.entry;

/**
 * Crea el catálogo base de roles y la matriz inicial de permisos.
 * Solo ejecuta si las tablas están vacías.
 */
@Configuration
public class SembradorPermisos {

    private record RoleSeed(String nombre, String descripcion) {}

    private static final List<RoleSeed> ROLES = List.of(
            new RoleSeed("ADMINISTRADOR", "Administrador del sistema"),
            new RoleSeed("GERENTE_GENERAL", "Gerente general"),
            new RoleSeed("JEFE_LOGISTICA", "Jefe de logística"),
            new RoleSeed("ENCARGADO_ALMACEN", "Encargado de almacén"),
            new RoleSeed("PERSONAL_OPERATIVO", "Personal operativo"),
            new RoleSeed("PERSONAL_LOGISTICA", "Personal de logística"),
            new RoleSeed("RESPONSABLE_DISTRIBUCION", "Responsable de distribución"),
            new RoleSeed("TRANSPORTISTA", "Transportista")
    );

    // V = ver, C = crear, E = editar, D = eliminar
    private static final Map<String, Map<String, String>> DEFAULTS = Map.ofEntries(
            entry("ADMINISTRADOR", Map.ofEntries(
                    entry("PANEL", "V"), entry("SOLICITUDES", "VCE"),
                    entry("REPOSICIONES", "VCE"), entry("PROGRAMACION", "VCE"),
                    entry("DESPACHOS", "VCE"), entry("RUTA_MOVIL", "VCE"),
                    entry("RECEPCIONES", "VC"), entry("INVENTARIO", "VCE"),
                    entry("TRAZABILIDAD", "V"), entry("CUMPLIMIENTO", "V"),
                    entry("REPORTES", "V"), entry("NOTIFICACIONES", "VE"),
                    entry("DATOS_MAESTROS", "VCE"), entry("USUARIOS", "VCE"),
                    entry("AUDITORIA", "V"), entry("PERFIL", "V"))),
            entry("GERENTE_GENERAL", Map.ofEntries(
                    entry("PANEL", "V"), entry("SOLICITUDES", "V"),
                    entry("REPOSICIONES", "V"), entry("PROGRAMACION", "V"),
                    entry("DESPACHOS", "V"), entry("RUTA_MOVIL", "V"),
                    entry("RECEPCIONES", "V"), entry("INVENTARIO", "V"),
                    entry("TRAZABILIDAD", "V"), entry("CUMPLIMIENTO", "V"),
                    entry("REPORTES", "V"), entry("NOTIFICACIONES", "VE"),
                    entry("PERFIL", "V"))),
            entry("JEFE_LOGISTICA", Map.ofEntries(
                    entry("PANEL", "V"), entry("SOLICITUDES", "VCE"),
                    entry("REPOSICIONES", "VCE"), entry("PROGRAMACION", "VCE"),
                    entry("DESPACHOS", "VCE"), entry("RUTA_MOVIL", "VCE"),
                    entry("RECEPCIONES", "VC"), entry("INVENTARIO", "V"),
                    entry("TRAZABILIDAD", "V"), entry("CUMPLIMIENTO", "V"),
                    entry("REPORTES", "V"), entry("NOTIFICACIONES", "VE"),
                    entry("DATOS_MAESTROS", "VCE"), entry("AUDITORIA", "V"),
                    entry("PERFIL", "V"))),
            entry("ENCARGADO_ALMACEN", Map.ofEntries(
                    entry("PANEL", "V"), entry("SOLICITUDES", "V"),
                    entry("REPOSICIONES", "VCE"), entry("PROGRAMACION", "V"),
                    entry("DESPACHOS", "VCE"), entry("RUTA_MOVIL", "VCE"),
                    entry("RECEPCIONES", "VC"), entry("INVENTARIO", "VCE"),
                    entry("TRAZABILIDAD", "V"), entry("CUMPLIMIENTO", "V"),
                    entry("REPORTES", "V"), entry("NOTIFICACIONES", "VE"),
                    entry("DATOS_MAESTROS", "VCE"), entry("PERFIL", "V"))),
            entry("PERSONAL_OPERATIVO", Map.ofEntries(
                    entry("PANEL", "V"), entry("SOLICITUDES", "VCE"),
                    entry("REPOSICIONES", "V"), entry("PROGRAMACION", "V"),
                    entry("DESPACHOS", "V"), entry("RUTA_MOVIL", "V"),
                    entry("RECEPCIONES", "VC"), entry("INVENTARIO", "V"),
                    entry("TRAZABILIDAD", "V"), entry("CUMPLIMIENTO", "V"),
                    entry("NOTIFICACIONES", "VE"), entry("PERFIL", "V"))),
            entry("PERSONAL_LOGISTICA", Map.ofEntries(
                    entry("PANEL", "V"), entry("SOLICITUDES", "VCE"),
                    entry("REPOSICIONES", "V"), entry("PROGRAMACION", "V"),
                    entry("DESPACHOS", "V"), entry("RUTA_MOVIL", "V"),
                    entry("RECEPCIONES", "VC"), entry("INVENTARIO", "V"),
                    entry("TRAZABILIDAD", "V"), entry("CUMPLIMIENTO", "V"),
                    entry("NOTIFICACIONES", "VE"), entry("PERFIL", "V"))),
            entry("RESPONSABLE_DISTRIBUCION", Map.ofEntries(
                    entry("PANEL", "V"), entry("SOLICITUDES", "V"),
                    entry("REPOSICIONES", "V"), entry("PROGRAMACION", "V"),
                    entry("DESPACHOS", "VCE"), entry("RUTA_MOVIL", "VCE"),
                    entry("RECEPCIONES", "VC"), entry("INVENTARIO", "V"),
                    entry("TRAZABILIDAD", "V"), entry("CUMPLIMIENTO", "V"),
                    entry("REPORTES", "V"), entry("NOTIFICACIONES", "VE"),
                    entry("PERFIL", "V"))),
            entry("TRANSPORTISTA", Map.ofEntries(
                    entry("PANEL", "V"), entry("SOLICITUDES", "V"),
                    entry("REPOSICIONES", "V"), entry("PROGRAMACION", "V"),
                    entry("DESPACHOS", "VCE"), entry("RUTA_MOVIL", "VCE"),
                    entry("RECEPCIONES", "V"), entry("INVENTARIO", "V"),
                    entry("CUMPLIMIENTO", "V"), entry("NOTIFICACIONES", "VE"),
                    entry("PERFIL", "V")))
    );

    @Bean
    CommandLineRunner seedPermissions(RolSistemaDao rolDao, PermisoRolDao permisoDao) {
        return args -> {
            if (rolDao.count() == 0) {
                List<RolSistema> roles = ROLES.stream()
                        .map(seed -> RolSistema.builder()
                                .nombre(seed.nombre())
                                .descripcion(seed.descripcion())
                                .build())
                        .toList();
                rolDao.saveAll(roles);
            }
            if (permisoDao.count() > 0) {
                return;
            }
            Map<String, RolSistema> roles = new LinkedHashMap<>();
            for (RolSistema rol : rolDao.findAll()) {
                roles.put(rol.getNombre(), rol);
            }
            DEFAULTS.forEach((nombreRol, modulos) -> {
                RolSistema rol = roles.get(nombreRol);
                if (rol == null) {
                    return;
                }
                for (ServicioPermisos.ModuloDef modulo : ServicioPermisos.MODULOS) {
                    String mask = modulos.getOrDefault(modulo.key(), "");
                    permisoDao.save(PermisoRol.builder()
                            .rol(rol)
                            .modulo(modulo.key())
                            .puedeVer(mask.contains("V"))
                            .puedeCrear(mask.contains("C"))
                            .puedeEditar(mask.contains("E"))
                            .puedeEliminar(mask.contains("D"))
                            .build());
                }
            });
        };
    }
}
