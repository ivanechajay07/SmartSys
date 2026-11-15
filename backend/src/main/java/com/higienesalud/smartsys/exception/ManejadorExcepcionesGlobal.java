package com.higienesalud.smartsys.exception;

import com.higienesalud.smartsys.model.*;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

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

    @ExceptionHandler(ExcepcionNoEncontrada.class)
    public ProblemDetail notFound(ExcepcionNoEncontrada ex) {
        log.warn("Recurso no encontrado: {}", ex.getMessage());
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        detail.setTitle("Recurso no encontrado");
        detail.setType(URI.create("urn:smartsys:not-found"));
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
