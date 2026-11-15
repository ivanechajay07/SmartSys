package com.higienesalud.smartsys.audit;

import com.higienesalud.smartsys.dao.AuditoriaDao;
import com.higienesalud.smartsys.model.Auditoria;
import com.higienesalud.smartsys.model.Usuario;
import com.higienesalud.smartsys.security.UsuarioActual;
import com.higienesalud.smartsys.service.ServicioAutenticacion;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;

@Aspect
@Component
public class AspectoAuditoria {

    private final AuditoriaDao Dao;
    private final UsuarioActual UsuarioActual;

    public AspectoAuditoria(AuditoriaDao Dao, UsuarioActual UsuarioActual) {
        this.Dao = Dao;
        this.UsuarioActual = UsuarioActual;
    }

    @Around("within(@org.springframework.web.bind.annotation.RestController *)")
    public Object audit(ProceedingJoinPoint joinPoint) throws Throwable {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        HttpServletRequest request = attributes == null ? null : attributes.getRequest();
        String method = request == null ? "CALL" : request.getMethod();
        if ("GET".equals(method) || "OPTIONS".equals(method)) {
            return joinPoint.proceed();
        }

        String recurso = request == null ? joinPoint.getSignature().toShortString() : request.getRequestURI();
        DetectorDispositivo.Info info = DetectorDispositivo.detectar(request);
        Usuario usuario = usuarioActual();
        boolean success = false;
        String error = null;
        Object result = null;

        try {
            result = joinPoint.proceed();
            success = true;
            return result;
        } catch (Throwable ex) {
            error = ex.getClass().getSimpleName() + ": " + ex.getMessage();
            throw ex;
        } finally {
            try {
                String email = usuario == null ? null : usuario.getEmail();
                String nombre = usuario == null ? null
                        : (usuario.getNombres() + " " + usuario.getApellidos()).trim();
                String rol = usuario == null || usuario.getRol() == null
                        ? null : usuario.getRol().name();

                if (result instanceof ServicioAutenticacion.TokenResponse token) {
                    email = token.email();
                    nombre = token.nombre();
                    rol = token.rol();
                }
                if (email == null) {
                    email = emailDeArgumentos(joinPoint.getArgs());
                }

                String accion = TraductorAuditoria.accion(method, recurso, success);
                String modulo = TraductorAuditoria.modulo(recurso);
                String detalle = error != null
                        ? error
                        : TraductorAuditoria.detalle(recurso, success, info);

                Dao.save(Auditoria.builder()
                        .usuarioEmail(email)
                        .usuarioNombre(nombre)
                        .rol(rol)
                        .metodo(method)
                        .recurso(recurso)
                        .accion(accion)
                        .modulo(modulo)
                        .exito(success)
                        .detalle(truncar(detalle, 1000))
                        .ip(info.ip())
                        .dispositivo(info.dispositivo())
                        .equipo(info.equipo())
                        .navegador(info.navegador())
                        .sistemaOperativo(info.sistemaOperativo())
                        .fecha(LocalDateTime.now())
                        .build());
            } catch (Exception ignored) {
                // La auditoría nunca debe romper la operación de negocio.
            }
        }
    }

    private Usuario usuarioActual() {
        try {
            return UsuarioActual.get();
        } catch (Exception ignored) {
            return null;
        }
    }

    private String emailDeArgumentos(Object[] args) {
        if (args == null) {
            return null;
        }
        for (Object arg : args) {
            if (arg != null && arg.getClass().getSimpleName().endsWith("LoginRequest")) {
                try {
                    Object email = arg.getClass().getMethod("email").invoke(arg);
                    return email == null ? null : String.valueOf(email);
                } catch (Exception ignored) {
                    return null;
                }
            }
        }
        return null;
    }

    private String truncar(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
