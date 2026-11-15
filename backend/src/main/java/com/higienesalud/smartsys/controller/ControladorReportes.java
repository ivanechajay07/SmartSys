package com.higienesalud.smartsys.controller;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
public class ControladorReportes {

    private final ServicioReportes service;
    private final ExportadorReportes exporter;
    private final UsuarioActual usuarioActual;

    public ControladorReportes(ServicioReportes service, ExportadorReportes exporter,
                               UsuarioActual usuarioActual) {
        this.service = service;
        this.exporter = exporter;
        this.usuarioActual = usuarioActual;
    }

    @GetMapping
    @PreAuthorize("@permisos.puede('REPORTES','VER')")
    public List<ServicioReportes.ReportDefinition> catalog() {
        return service.catalog();
    }

    @GetMapping("/history")
    @PreAuthorize("@permisos.puede('REPORTES','VER')")
    public List<ServicioReportes.HistorialReporte> history() {
        return service.historial();
    }

    @GetMapping("/{key}")
    @PreAuthorize("@permisos.puede('REPORTES','VER')")
    public ResponseEntity<?> generate(@PathVariable String key,
                                      @RequestParam(defaultValue = "json") String format,
                                      @RequestParam(required = false)
                                      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                      @RequestParam(required = false)
                                      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        DatosReporte data = service.generate(key, desde, hasta);
        String filename = "smartsys-" + key + "-" + LocalDate.now();
        String fmt = format.toLowerCase();
        boolean exportable = fmt.equals("csv") || fmt.equals("xlsx") || fmt.equals("excel") || fmt.equals("pdf");
        if (exportable) {
            service.registrar(key, fmt.equals("excel") ? "xlsx" : fmt, desde, hasta, usuarioActual.get());
        }
        return switch (fmt) {
            case "csv" -> ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + ".csv\"")
                    .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                    .body(exporter.csv(data, desde, hasta));
            case "xlsx", "excel" -> ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + ".xlsx\"")
                    .contentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(exporter.xlsx(data, desde, hasta));
            case "pdf" -> ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + ".pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(exporter.pdf(data, desde, hasta));
            default -> ResponseEntity.ok(data);
        };
    }
}
