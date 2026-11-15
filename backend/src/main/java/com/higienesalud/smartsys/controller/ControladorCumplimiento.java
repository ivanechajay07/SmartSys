package com.higienesalud.smartsys.controller;

import com.higienesalud.smartsys.model.ClausulaContractual;
import com.higienesalud.smartsys.service.ServicioCumplimiento;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class ControladorCumplimiento {

    private final ServicioCumplimiento service;

    public ControladorCumplimiento(ServicioCumplimiento service) {
        this.service = service;
    }

    @GetMapping("/compliance/tdrs/{tdrId}")
    @PreAuthorize("@permisos.puede('CUMPLIMIENTO','VER')")
    public ServicioCumplimiento.TdrCompliance tdr(@PathVariable Long tdrId) {
        return service.evaluate(tdrId);
    }

    @GetMapping("/compliance/summary")
    @PreAuthorize("@permisos.puede('CUMPLIMIENTO','VER')")
    public List<ServicioCumplimiento.TdrCompliance> summary() {
        return service.summary();
    }

    @GetMapping("/contracts/{id}/clauses")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','VER')")
    public List<ClausulaContractual> clauses(@PathVariable Long id) {
        return service.clauses(id);
    }

    @PostMapping("/contracts/{id}/clauses")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','CREAR')")
    public ClausulaContractual createClause(@PathVariable Long id,
                                            @Valid @RequestBody ClauseRequest request) {
        return service.createClause(id, new ServicioCumplimiento.ClauseRequest(
                request.codigo(), request.descripcion(), request.tipo(),
                request.umbralPorcentaje(), request.accionSugerida(), request.activa()));
    }

    public record ClauseRequest(@NotBlank String codigo, @NotBlank String descripcion,
                                @NotBlank String tipo, BigDecimal umbralPorcentaje,
                                String accionSugerida, Boolean activa) {
    }
}
