package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.PermisoRolDao;
import com.higienesalud.smartsys.dao.RolSistemaDao;
import com.higienesalud.smartsys.dao.UsuarioDao;
import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.exception.ExcepcionNoEncontrada;
import com.higienesalud.smartsys.model.PermisoRol;
import com.higienesalud.smartsys.model.Rol;
import com.higienesalud.smartsys.model.RolSistema;
import com.higienesalud.smartsys.model.Usuario;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Matriz de permisos por rol y módulo. Es la fuente de verdad para las
 * autorizaciones de la API mediante expresiones {@code @permisos.puede(...)}.
 */
@Service("permisos")
public class ServicioPermisos {

    public static final String VER = "VER";
    public static final String CREAR = "CREAR";
    public static final String EDITAR = "EDITAR";
    public static final String ELIMINAR = "ELIMINAR";

    public record ModuloDef(String key, String label, String descripcion) {}

    public record PermisoItem(String modulo, boolean ver, boolean crear,
                              boolean editar, boolean eliminar) {}

    public record PermisoVista(String modulo, String label, String descripcion,
                               boolean ver, boolean crear, boolean editar, boolean eliminar) {}

    public static final List<ModuloDef> MODULOS = List.of(
            new ModuloDef("PANEL", "Panel general", "Indicadores, gráficos y alertas"),
            new ModuloDef("SOLICITUDES", "Solicitudes", "Solicitudes de material y aprobaciones"),
            new ModuloDef("REPOSICIONES", "Reposiciones", "Reposiciones internas de stock"),
            new ModuloDef("PROGRAMACION", "Programación", "Cronograma de abastecimiento"),
            new ModuloDef("DESPACHOS", "Despachos", "Preparación, transporte y entrega"),
            new ModuloDef("RUTA_MOVIL", "Ruta móvil", "Asignaciones e hitos del transportista"),
            new ModuloDef("RECEPCIONES", "Recepciones", "Conformidad en punto de entrega"),
            new ModuloDef("INVENTARIO", "Inventario", "Stock, ingresos, ajustes y movimientos"),
            new ModuloDef("TRAZABILIDAD", "Trazabilidad", "Órdenes, ingresos y salidas"),
            new ModuloDef("CUMPLIMIENTO", "Cumplimiento TDR", "Indicadores y cláusulas"),
            new ModuloDef("REPORTES", "Reportes", "Catálogo y exportaciones"),
            new ModuloDef("NOTIFICACIONES", "Notificaciones", "Bandeja y marcado de lectura"),
            new ModuloDef("DATOS_MAESTROS", "Datos maestros", "Entidades, productos, contratos y flota"),
            new ModuloDef("USUARIOS", "Usuarios y roles", "Cuentas, roles y permisos"),
            new ModuloDef("AUDITORIA", "Auditoría", "Consulta de operaciones"),
            new ModuloDef("PERFIL", "Mi cuenta", "Perfil y seguridad personal")
    );

    private final PermisoRolDao permisoDao;
    private final RolSistemaDao rolDao;
    private final UsuarioDao usuarioDao;
    private final Map<Integer, Map<String, PermisoRol>> cache = new ConcurrentHashMap<>();

    public ServicioPermisos(PermisoRolDao permisoDao, RolSistemaDao rolDao, UsuarioDao usuarioDao) {
        this.permisoDao = permisoDao;
        this.rolDao = rolDao;
        this.usuarioDao = usuarioDao;
    }

    public List<ModuloDef> modulos() {
        return MODULOS;
    }

    @Transactional(readOnly = true)
    public List<PermisoVista> porRol(Integer rolId) {
        Map<String, PermisoRol> actuales = cargar(rolId);
        return MODULOS.stream()
                .map(modulo -> {
                    PermisoRol permiso = actuales.get(modulo.key());
                    return new PermisoVista(modulo.key(), modulo.label(), modulo.descripcion(),
                            permiso != null && permiso.isPuedeVer(),
                            permiso != null && permiso.isPuedeCrear(),
                            permiso != null && permiso.isPuedeEditar(),
                            permiso != null && permiso.isPuedeEliminar());
                })
                .toList();
    }

    @Transactional
    public List<PermisoVista> actualizar(Integer rolId, List<PermisoItem> items) {
        RolSistema rol = rolDao.findById(rolId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Rol no encontrado"));
        Map<String, PermisoItem> porModulo = new LinkedHashMap<>();
        if (items != null) {
            for (PermisoItem item : items) {
                if (item != null && item.modulo() != null) {
                    porModulo.put(item.modulo(), item);
                }
            }
        }
        if ("ADMINISTRADOR".equals(rol.getNombre())) {
            PermisoItem usuarios = porModulo.get("USUARIOS");
            if (usuarios == null || !usuarios.ver() || !usuarios.editar()) {
                throw new ExcepcionNegocio(
                        "El rol Administrador debe conservar los permisos de ver y editar en Usuarios");
            }
        }
        for (ModuloDef modulo : MODULOS) {
            PermisoItem item = porModulo.getOrDefault(modulo.key(),
                    new PermisoItem(modulo.key(), false, false, false, false));
            PermisoRol permiso = permisoDao.findByRolIdAndModulo(rolId, modulo.key())
                    .orElseGet(() -> PermisoRol.builder().rol(rol).modulo(modulo.key()).build());
            permiso.setPuedeVer(item.ver());
            permiso.setPuedeCrear(item.crear());
            permiso.setPuedeEditar(item.editar());
            permiso.setPuedeEliminar(item.eliminar());
            permisoDao.save(permiso);
        }
        cache.remove(rolId);
        return porRol(rolId);
    }

    @Transactional(readOnly = true)
    public List<PermisoVista> actuales() {
        Usuario usuario = usuarioActual();
        if (usuario == null) {
            throw new ExcepcionNoEncontrada("Usuario autenticado no encontrado");
        }
        return porRol(rolId(usuario));
    }

    /**
     * Expresión usada por {@code @PreAuthorize}. Resuelve el usuario autenticado
     * y valida la acción sobre el módulo indicado.
     */
    public boolean puede(String modulo, String accion) {
        Usuario usuario = usuarioActual();
        if (usuario == null) {
            return false;
        }
        if (usuario.getRol() == Rol.ADMINISTRADOR && "USUARIOS".equals(modulo)) {
            return true;
        }
        Map<String, PermisoRol> permisos = cache.computeIfAbsent(rolId(usuario), this::cargar);
        PermisoRol permiso = permisos.get(modulo);
        if (permiso == null) {
            return false;
        }
        return switch (accion == null ? "" : accion.toUpperCase()) {
            case VER -> permiso.isPuedeVer();
            case CREAR -> permiso.isPuedeCrear();
            case EDITAR -> permiso.isPuedeEditar();
            case ELIMINAR -> permiso.isPuedeEliminar();
            default -> false;
        };
    }

    private Integer rolId(Usuario usuario) {
        if (usuario.getIdRol() != null) {
            return usuario.getIdRol();
        }
        if (usuario.getRol() == null) {
            throw new ExcepcionNegocio("El usuario no tiene rol asignado");
        }
        return rolDao.findByNombre(usuario.getRol().name())
                .map(RolSistema::getId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Rol no encontrado"));
    }

    private Map<String, PermisoRol> cargar(Integer rolId) {
        Map<String, PermisoRol> permisos = new LinkedHashMap<>();
        for (PermisoRol permiso : permisoDao.findByRolIdOrderByModuloAsc(rolId)) {
            permisos.put(permiso.getModulo(), permiso);
        }
        return permisos;
    }

    private Usuario usuarioActual() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return usuarioDao.findByEmailIgnoreCase(authentication.getName()).orElse(null);
    }
}
