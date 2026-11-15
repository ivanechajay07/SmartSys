package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.exception.ExcepcionNoEncontrada;
import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.model.Usuario;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Casos de uso de datos maestros e inventario.
 * La capa de controlador solo valida y delega en este servicio.
 */
@Service
public class ServicioMaestros {

    private final EntidadPublicaDao entidadDao;
    private final PuntoEntregaDao puntoDao;
    private final ContratoDao contratoDao;
    private final TdrDao tdrDao;
    private final TdrItemDao tdrItemDao;
    private final ProductoDao productoDao;
    private final InventarioDao inventarioDao;
    private final VehiculoDao vehiculoDao;
    private final ProveedorDao proveedorDao;
    private final RolSistemaDao rolSistemaDao;
    private final ServicioInventario ServicioInventario;

    public ServicioMaestros(EntidadPublicaDao entidadDao,
                         PuntoEntregaDao puntoDao,
                         ContratoDao contratoDao,
                         TdrDao tdrDao,
                         TdrItemDao tdrItemDao,
                         ProductoDao productoDao,
                         InventarioDao inventarioDao,
                         VehiculoDao vehiculoDao,
                         ProveedorDao proveedorDao,
                         RolSistemaDao rolSistemaDao,
                         ServicioInventario ServicioInventario) {
        this.entidadDao = entidadDao;
        this.puntoDao = puntoDao;
        this.contratoDao = contratoDao;
        this.tdrDao = tdrDao;
        this.tdrItemDao = tdrItemDao;
        this.productoDao = productoDao;
        this.inventarioDao = inventarioDao;
        this.vehiculoDao = vehiculoDao;
        this.proveedorDao = proveedorDao;
        this.rolSistemaDao = rolSistemaDao;
        this.ServicioInventario = ServicioInventario;
    }

    @Transactional(readOnly = true)
    public List<EntidadPublica> entities() {
        return entidadDao.findAll();
    }

    @Transactional
    public EntidadPublica createEntity(EntidadRequest r) {
        return entidadDao.save(EntidadPublica.builder()
                .ruc(r.ruc()).razonSocial(r.razonSocial()).direccion(r.direccion())
                .departamento(r.departamento()).provincia(r.provincia()).distrito(r.distrito())
                .telefono(r.telefono()).correo(r.correo()).responsable(r.responsable())
                .activo(r.activo() == null || r.activo()).build());
    }

    @Transactional(readOnly = true)
    public List<PuntoEntrega> points(Long entidadId) {
        return puntoDao.findByEntidadIdOrderByNombre(entidadId);
    }

    @Transactional
    public PuntoEntrega createPoint(Long entidadId, PointRequest r) {
        EntidadPublica entidad = entidadDao.findById(entidadId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Entidad no encontrada"));
        return puntoDao.save(PuntoEntrega.builder()
                .entidad(entidad).nombre(r.nombre()).direccion(r.direccion()).distrito(r.distrito())
                .responsable(r.responsable()).telefono(r.telefono())
                .activo(r.activo() == null || r.activo()).build());
    }

    @Transactional(readOnly = true)
    public List<Contrato> contracts() {
        return contratoDao.findAll();
    }

    @Transactional
    public Contrato createContract(ContractRequest r) {
        EntidadPublica entidad = entidadDao.findById(r.entidadId())
                .orElseThrow(() -> new ExcepcionNoEncontrada("Entidad no encontrada"));
        return contratoDao.save(Contrato.builder()
                .numero(r.numero()).codigo(r.codigo()).entidad(entidad).objeto(r.objeto())
                .fechaInicio(r.fechaInicio()).fechaFin(r.fechaFin())
                .responsableInterno(r.responsableInterno())
                .estado(r.estado() == null ? "VIGENTE" : r.estado())
                .archivoUrl(r.archivoUrl()).build());
    }

    @Transactional(readOnly = true)
    public List<Tdr> tdrs(Long contratoId) {
        return tdrDao.findByContratoIdOrderByFechaVigenciaDesc(contratoId);
    }

    @Transactional
    public Tdr createTdr(Long contratoId, TdrRequest r) {
        Contrato contrato = contratoDao.findById(contratoId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Contrato no encontrado"));
        return tdrDao.save(Tdr.builder()
                .contrato(contrato).version(r.version()).fechaVigencia(r.fechaVigencia())
                .archivoUrl(r.archivoUrl()).estado(r.estado() == null ? "VIGENTE" : r.estado()).build());
    }

    @Transactional(readOnly = true)
    public List<TdrItem> items(Long tdrId) {
        return tdrItemDao.findByTdrId(tdrId);
    }

    @Transactional
    public TdrItem createItem(Long tdrId, TdrItemRequest r) {
        Tdr tdr = tdrDao.findById(tdrId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("TDR no encontrado"));
        Producto producto = productoDao.findById(r.productoId())
                .orElseThrow(() -> new ExcepcionNoEncontrada("Producto no encontrado"));
        return tdrItemDao.save(TdrItem.builder()
                .tdr(tdr).producto(producto).cantidadTotal(r.cantidadTotal())
                .unidad(r.unidad()).frecuencia(r.frecuencia())
                .cantidadPorEntrega(r.cantidadPorEntrega())
                .fechaProgramada(r.fechaProgramada()).fechaLimite(r.fechaLimite())
                .diasPersonalizado(r.diasPersonalizado())
                .observaciones(r.observaciones()).build());
    }

    @Transactional(readOnly = true)
    public List<Producto> products() {
        return productoDao.findAll();
    }

    @Transactional
    public Producto createProduct(ProductRequest r) {
        Producto producto = productoDao.save(Producto.builder()
                .codigo(r.codigo()).nombre(r.nombre()).descripcion(r.descripcion())
                .categoria(r.categoria()).unidadMedida(r.unidadMedida()).marca(r.marca())
                .requiereLote(Boolean.TRUE.equals(r.requiereLote()))
                .requiereVencimiento(Boolean.TRUE.equals(r.requiereVencimiento()))
                .activo(r.activo() == null || r.activo()).build());
        inventarioDao.findByProductoId(producto.getId()).orElseGet(() ->
                inventarioDao.save(Inventario.builder()
                        .producto(producto).stockFisico(BigDecimal.ZERO)
                        .stockReservado(BigDecimal.ZERO)
                        .stockMinimo(r.stockMinimo() == null ? BigDecimal.ZERO : r.stockMinimo())
                        .build()));
        return producto;
    }

    @Transactional(readOnly = true)
    public List<Inventario> inventory() {
        return ServicioInventario.stock();
    }

    @Transactional
    public MovimientoInventario entry(EntryRequest r, Usuario actor) {
        return ServicioInventario.entry(r.productoId(), r.cantidad(), r.referencia(), r.observaciones(),
                r.proveedorId(), actor);
    }

    @Transactional(readOnly = true)
    public List<Proveedor> providers() {
        return proveedorDao.findAll();
    }

    @Transactional(readOnly = true)
    public List<RolSistema> roles() {
        return rolSistemaDao.findAllByOrderByIdAsc();
    }

    @Transactional
    public Proveedor createProvider(ProviderRequest r) {
        String ruc = r.ruc().trim();
        if (proveedorDao.findByRuc(ruc).isPresent()) {
            throw new ExcepcionNegocio("El RUC ya está registrado");
        }
        return proveedorDao.save(Proveedor.builder()
                .ruc(ruc)
                .razonSocial(r.razonSocial().trim())
                .direccion(r.direccion())
                .telefono(r.telefono())
                .correo(r.correo())
                .estado(r.estado() == null || r.estado())
                .build());
    }

    @Transactional
    public MovimientoInventario adjustment(AdjustmentRequest r, Usuario actor) {
        return ServicioInventario.adjust(r.productoId(), r.cantidad(), r.tipo(), r.referencia(),
                r.observaciones(), actor);
    }

    @Transactional(readOnly = true)
    public List<MovimientoInventario> movements() {
        return ServicioInventario.movements();
    }

    @Transactional(readOnly = true)
    public List<Vehiculo> vehicles() {
        return vehiculoDao.findAll();
    }

    @Transactional
    public Vehiculo createVehicle(VehicleRequest r) {
        return vehiculoDao.save(Vehiculo.builder()
                .placa(r.placa()).marca(r.marca()).modelo(r.modelo()).tipo(r.tipo())
                .estado(r.estado() == null ? "DISPONIBLE" : r.estado()).build());
    }

    public record EntidadRequest(@NotBlank String ruc, @NotBlank String razonSocial, String direccion,
                                 String departamento, String provincia, String distrito, String telefono,
                                 String correo, String responsable, Boolean activo) {
    }

    public record PointRequest(@NotBlank String nombre, String direccion, String distrito,
                               String responsable, String telefono, Boolean activo) {
    }

    public record ContractRequest(@NotBlank String numero, @NotBlank String codigo, @NotNull Long entidadId,
                                  String objeto, LocalDate fechaInicio, LocalDate fechaFin,
                                  String responsableInterno, String estado, String archivoUrl) {
    }

    public record TdrRequest(@NotBlank String version, LocalDate fechaVigencia, String archivoUrl,
                             String estado) {
    }

    public record TdrItemRequest(@NotNull Long productoId, @NotNull @Positive BigDecimal cantidadTotal,
                                 @NotBlank String unidad, @NotNull Frecuencia frecuencia,
                                 @NotNull @Positive BigDecimal cantidadPorEntrega,
                                 LocalDate fechaProgramada, LocalDate fechaLimite,
                                 Integer diasPersonalizado, String observaciones) {
    }

    public record ProductRequest(@NotBlank String codigo, @NotBlank String nombre, String descripcion,
                                 String categoria, @NotBlank String unidadMedida, String marca,
                                 Boolean requiereLote, Boolean requiereVencimiento, Boolean activo,
                                 BigDecimal stockMinimo) {
    }

    public record EntryRequest(@NotNull Long productoId, @NotNull @Positive BigDecimal cantidad,
                               String referencia, String observaciones, Long proveedorId) {
    }

    public record ProviderRequest(
            @NotBlank @Pattern(regexp = "\\d{11}", message = "El RUC debe tener 11 dígitos") String ruc,
            @NotBlank String razonSocial,
            String direccion,
            String telefono,
            String correo,
            Boolean estado) {
    }

    public record AdjustmentRequest(@NotNull Long productoId, @NotNull @Positive BigDecimal cantidad,
                                    @NotNull TipoMovimiento tipo, String referencia, String observaciones) {
    }

    public record VehicleRequest(@NotBlank String placa, String marca, String modelo, String tipo,
                                 String estado) {
    }
}
