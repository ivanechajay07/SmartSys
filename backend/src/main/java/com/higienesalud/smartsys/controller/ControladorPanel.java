package com.higienesalud.smartsys.controller;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.Inventario;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
@PreAuthorize("@permisos.puede('PANEL','VER')")
public class ControladorPanel {

    private final ServicioPanel service;

    public ControladorPanel(ServicioPanel service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public ServicioPanel.Summary summary() {
        return service.summary();
    }

    @GetMapping("/charts")
    public ServicioPanel.Charts charts() {
        return service.charts();
    }

    @GetMapping("/stock-alerts")
    public List<Inventario> stockAlerts() {
        return service.stockAlerts();
    }
}
