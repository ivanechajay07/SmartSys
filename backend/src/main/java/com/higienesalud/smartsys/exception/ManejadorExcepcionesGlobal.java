package com.higienesalud.smartsys.exception;

import com.higienesalud.smartsys.model.*;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.net.URI;
import java.util.stream.Collectors;

@RestControllerAdvice
public class ManejadorExcepcionesGlobal {

    private static final org.slf4j.Logger log =
            org.slf4j.LoggerFactory.getLogger(ManejadorExcepcionesGlobal.class);

    @ExceptionHandler(ExcepcionNegocio.class)
    public ProblemDetail business(ExcepcionNegocio ex) {
        log.warn("Regla de negocio: {}", ex.getMessage());
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        detail.setTitle("Regla de negocio");
        detail.setType(URI.create("urn:smartsys:business-error"));
        return detail;
    }

    @ExceptionHandler(ExcepcionCredenciales.class)
    public ProblemDetail credentials(ExcepcionCredenciales ex) {
        log.warn("Credenciales rechazadas: {} intentos fallidos, bloqueado={}",
                ex.getIntentosFallidos(), ex.isBloqueado());
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        detail.setTitle("Acceso no autorizado");
        detail.setType(URI.create("urn:smartsys:credentials-error"));
        if (ex.getIntentosFallidos() != null) {
            detail.setProperty("intentosFallidos", ex.getIntentosFallidos());
        }
        if (ex.getIntentosRestantes() != null) {
            detail.setProperty("intentosRestantes", ex.getIntentosRestantes());
        }
        detail.setProperty("bloqueado", ex.isBloqueado());
        if (ex.getBloqueadoHasta() != null) {
            detail.setProperty("bloqueadoHasta", ex.getBloqueadoHasta());
        }
        if (ex.getSegundosParaDesbloqueo() != null) {
            detail.setProperty("segundosParaDesbloqueo", ex.getSegundosParaDesbloqueo());
        }
        return detail;
    }

    @ExceptionHandler(ExcepcionNoEncontrada.class)
    public ProblemDetail notFound(ExcepcionNoEncontrada ex) {
        log.warn("Recurso no encontrado: {}", ex.getMessage());
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        detail.setTitle("Recurso no encontrado");
        detail.setType(URI.create("urn:smartsys:not-found"));
        return detail;
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ProblemDetail routeNotFound(NoResourceFoundException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND,
                "La ruta solicitada no existe");
        detail.setTitle("Ruta no encontrada");
        detail.setType(URI.create("urn:smartsys:route-not-found"));
        return detail;
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail unreadableBody(HttpMessageNotReadableException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "El cuerpo de la solicitud no es válido");
        detail.setTitle("Solicitud inválida");
        detail.setType(URI.create("urn:smartsys:invalid-body"));
        return detail;
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail invalidParameter(MethodArgumentTypeMismatchException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "El parámetro '" + ex.getName() + "' no tiene un formato válido");
        detail.setTitle("Parámetro inválido");
        detail.setType(URI.create("urn:smartsys:invalid-parameter"));
        return detail;
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ProblemDetail missingPart(MissingServletRequestPartException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "Falta la parte requerida: " + ex.getRequestPartName());
        detail.setTitle("Solicitud incompleta");
        detail.setType(URI.create("urn:smartsys:missing-part"));
        return detail;
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ProblemDetail uploadTooLarge(MaxUploadSizeExceededException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.PAYLOAD_TOO_LARGE,
                "El archivo adjunto supera el tamaño permitido");
        detail.setTitle("Archivo demasiado grande");
        detail.setType(URI.create("urn:smartsys:upload-too-large"));
        return detail;
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ProblemDetail methodNotAllowed(HttpRequestMethodNotSupportedException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.METHOD_NOT_ALLOWED,
                "El método HTTP no está permitido para esta ruta");
        detail.setTitle("Método no permitido");
        detail.setType(URI.create("urn:smartsys:method-not-allowed"));
        return detail;
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail dataConflict(DataIntegrityViolationException ex) {
        log.warn("Conflicto de integridad de datos: {}", ex.getMostSpecificCause().getMessage());
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                "El dato entra en conflicto con un registro existente");
        detail.setTitle("Conflicto de datos");
        detail.setType(URI.create("urn:smartsys:data-conflict"));
        return detail;
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ProblemDetail accessDenied(org.springframework.security.access.AccessDeniedException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN,
                "No tiene permisos para realizar esta operación");
        detail.setTitle("No autorizado");
        detail.setType(URI.create("urn:smartsys:forbidden"));
        return detail;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail validation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, message);
        detail.setTitle("Validacion");
        detail.setType(URI.create("urn:smartsys:validation-error"));
        return detail;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail generic(Exception ex) {
        log.error("Error interno no controlado", ex);
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
                "Error interno. Contacte al administrador.");
        detail.setTitle("Error interno");
        detail.setType(URI.create("urn:smartsys:internal-error"));
        return detail;
    }
}
