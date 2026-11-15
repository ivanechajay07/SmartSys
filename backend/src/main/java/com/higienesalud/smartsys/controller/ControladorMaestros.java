package com.higienesalud.smartsys.controller;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.security.UsuarioActual;
import com.higienesalud.smartsys.service.ServicioMaestros;
import com.higienesalud.smartsys.service.ServicioMaestros.*;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class ControladorMaestros {

    private final ServicioMaestros service;
    private final UsuarioActual UsuarioActual;

    public ControladorMaestros(ServicioMaestros service, UsuarioActual UsuarioActual) {
        this.service = service;
        this.UsuarioActual = UsuarioActual;
    }

    @GetMapping("/entities")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','VER')")
    public List<EntidadPublica> entities() {
        return service.entities();
    }

    @PostMapping("/entities")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','CREAR')")
    public EntidadPublica createEntity(@Valid @RequestBody EntidadRequest request) {
        return service.createEntity(request);
    }

    @GetMapping("/entities/{id}/points")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','VER')")
    public List<PuntoEntrega> points(@PathVariable Long id) {
        return service.points(id);
    }

    @PostMapping("/entities/{id}/points")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','CREAR')")
    public PuntoEntrega createPoint(@PathVariable Long id, @Valid @RequestBody PointRequest request) {
        return service.createPoint(id, request);
    }

    @GetMapping("/contracts")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','VER')")
    public List<Contrato> contracts() {
        return service.contracts();
    }

    @PostMapping("/contracts")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','CREAR')")
    public Contrato createContract(@Valid @RequestBody ContractRequest request) {
        return service.createContract(request);
    }

    @GetMapping("/contracts/{id}/tdrs")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','VER')")
    public List<Tdr> tdrs(@PathVariable Long id) {
        return service.tdrs(id);
    }

    @PostMapping("/contracts/{id}/tdrs")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','CREAR')")
    public Tdr createTdr(@PathVariable Long id, @Valid @RequestBody TdrRequest request) {
        return service.createTdr(id, request);
    }

    @GetMapping("/tdrs/{id}/items")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','VER')")
    public List<TdrItem> items(@PathVariable Long id) {
        return service.items(id);
    }

    @PostMapping("/tdrs/{id}/items")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','CREAR')")
    public TdrItem createItem(@PathVariable Long id, @Valid @RequestBody TdrItemRequest request) {
        return service.createItem(id, request);
    }

    @GetMapping("/products")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','VER')")
    public List<Producto> products() {
        return service.products();
    }

    @PostMapping("/products")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','CREAR')")
    public Producto createProduct(@Valid @RequestBody ProductRequest request) {
        return service.createProduct(request);
    }

    @GetMapping("/inventory")
    @PreAuthorize("@permisos.puede('INVENTARIO','VER')")
    public List<Inventario> inventory() {
        return service.inventory();
    }

    @PostMapping("/inventory/entries")
    @PreAuthorize("@permisos.puede('INVENTARIO','CREAR')")
    public MovimientoInventario entry(@Valid @RequestBody EntryRequest request) {
        return service.entry(request, UsuarioActual.get());
    }

    @PostMapping("/inventory/adjustments")
    @PreAuthorize("@permisos.puede('INVENTARIO','EDITAR')")
    public MovimientoInventario adjustment(@Valid @RequestBody AdjustmentRequest request) {
        return service.adjustment(request, UsuarioActual.get());
    }

    @GetMapping("/inventory/movements")
    @PreAuthorize("@permisos.puede('INVENTARIO','VER')")
    public List<MovimientoInventario> movements() {
        return service.movements();
    }

    @GetMapping("/providers")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','VER')")
    public List<Proveedor> providers() {
        return service.providers();
    }

    @GetMapping("/roles")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','VER')")
    public List<RolSistema> roles() {
        return service.roles();
    }

    @PostMapping("/providers")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','CREAR')")
    public Proveedor createProvider(@Valid @RequestBody ProviderRequest request) {
        return service.createProvider(request);
    }

    @GetMapping("/vehicles")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','VER')")
    public List<Vehiculo> vehicles() {
        return service.vehicles();
    }

    @PostMapping("/vehicles")
    @PreAuthorize("@permisos.puede('DATOS_MAESTROS','CREAR')")
    public Vehiculo createVehicle(@Valid @RequestBody VehicleRequest request) {
        return service.createVehicle(request);
    }
}
