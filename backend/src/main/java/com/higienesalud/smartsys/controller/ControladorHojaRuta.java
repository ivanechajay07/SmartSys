package com.higienesalud.smartsys.controller;

import com.higienesalud.smartsys.model.Despacho;
import com.higienesalud.smartsys.service.ExportadorHojaRuta;
import com.higienesalud.smartsys.service.ServicioDespacho;
import com.higienesalud.smartsys.service.ServicioHojaRuta;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class ControladorHojaRuta {

    private final ServicioHojaRuta service;
    private final ServicioDespacho despachoService;
    private final ExportadorHojaRuta exportador;

    public ControladorHojaRuta(ServicioHojaRuta service, ServicioDespacho despachoService,
                               ExportadorHojaRuta exportador) {
        this.service = service;
        this.despachoService = despachoService;
        this.exportador = exportador;
    }

    @GetMapping("/dispatches/{id}/signatures")
    @PreAuthorize("@permisos.puede('DESPACHOS','VER') or @permisos.puede('RECEPCIONES','VER')")
    public List<ServicioHojaRuta.FirmaDto> firmas(@PathVariable Long id) {
        return service.firmas(id);
    }

    @PostMapping("/dispatches/{id}/signatures")
    @PreAuthorize("@permisos.puede('DESPACHOS','EDITAR') or @permisos.puede('RECEPCIONES','CREAR')")
    public List<ServicioHojaRuta.FirmaDto> guardar(@PathVariable Long id,
                                                   @Valid @RequestBody FirmasRequest request) {
        return service.guardar(id, request.firmas());
    }

    @GetMapping("/dispatches/{id}/route-sheet/pdf")
    @PreAuthorize("@permisos.puede('DESPACHOS','VER') or @permisos.puede('RECEPCIONES','VER')")
    public ResponseEntity<byte[]> pdf(@PathVariable Long id) {
        Despacho despacho = despachoService.get(id);
        byte[] contenido = exportador.generar(despacho, service.firmasEntidad(id));
        String codigo = despacho.getNumeroHojaRuta() == null ? "hoja-ruta"
                : despacho.getNumeroHojaRuta().replaceAll("[^A-Za-z0-9_-]", "-");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"hoja-ruta-" + codigo + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(contenido);
    }

    public record FirmasRequest(@NotEmpty List<ServicioHojaRuta.FirmaRequest> firmas) {
    }
}
