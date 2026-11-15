package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.interfaces.ProductoDao;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.exception.ExcepcionNoEncontrada;
import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.model.Usuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ServicioInventario {

    private final InventarioDao inventarioDao;
    private final ProductoDao productoDao;
    private final MovimientoInventarioDao movimientoDao;
    private final ReservaStockDao reservaDao;
    private final IngresoAlmacenDao ingresoAlmacenDao;
    private final DetalleIngresoDao detalleIngresoDao;
    private final AlertaStockDao alertaStockDao;
    private final ProveedorDao proveedorDao;

    public ServicioInventario(InventarioDao inventarioDao,
                            ProductoDao productoDao,
                            MovimientoInventarioDao movimientoDao,
                            ReservaStockDao reservaDao,
                            IngresoAlmacenDao ingresoAlmacenDao,
                            DetalleIngresoDao detalleIngresoDao,
                            AlertaStockDao alertaStockDao,
                            ProveedorDao proveedorDao) {
        this.inventarioDao = inventarioDao;
        this.productoDao = productoDao;
        this.movimientoDao = movimientoDao;
        this.reservaDao = reservaDao;
        this.ingresoAlmacenDao = ingresoAlmacenDao;
        this.detalleIngresoDao = detalleIngresoDao;
        this.alertaStockDao = alertaStockDao;
        this.proveedorDao = proveedorDao;
    }

    @Transactional(readOnly = true)
    public List<Inventario> stock() {
        return inventarioDao.findAll();
    }

    @Transactional(readOnly = true)
    public List<MovimientoInventario> movements() {
        return movimientoDao.findAllByOrderByFechaDesc();
    }

    @Transactional
    public MovimientoInventario entry(Long productoId, BigDecimal cantidad, String referencia,
                                      String observaciones, Usuario usuario) {
        return entry(productoId, cantidad, referencia, observaciones, null, usuario);
    }

    @Transactional
    public MovimientoInventario entry(Long productoId, BigDecimal cantidad, String referencia,
                                      String observaciones, Long proveedorId, Usuario usuario) {
        if (cantidad == null || cantidad.signum() <= 0) {
            throw new ExcepcionNegocio("La cantidad debe ser mayor a cero");
        }
        Inventario inventario = lock(productoId);
        inventario.setStockFisico(inventario.getStockFisico().add(cantidad));
        inventarioDao.save(inventario);
        syncStockAlert(inventario);
        MovimientoInventario movimiento = movement(inventario, TipoMovimiento.INGRESO,
                cantidad, referencia, observaciones, usuario);

        Proveedor proveedor = proveedorId == null ? null : proveedorDao.findById(proveedorId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Proveedor no encontrado"));
        IngresoAlmacen ingreso = ingresoAlmacenDao.save(IngresoAlmacen.builder()
                .usuario(usuario)
                .proveedor(proveedor)
                .nroGuiaRemision(referencia)
                .fechaIngreso(LocalDate.now())
                .observacion(observaciones)
                .estado(true)
                .build());
        detalleIngresoDao.save(DetalleIngreso.builder()
                .ingreso(ingreso)
                .producto(inventario.getProducto())
                .cantidad(cantidad)
                .build());
        return movimiento;
    }

    @Transactional
    public MovimientoInventario adjust(Long productoId, BigDecimal cantidad, TipoMovimiento tipo,
                                        String referencia, String observaciones, Usuario usuario) {
        if (tipo != TipoMovimiento.AJUSTE_POSITIVO && tipo != TipoMovimiento.AJUSTE_NEGATIVO
                && tipo != TipoMovimiento.DEVOLUCION && tipo != TipoMovimiento.MERMA) {
            throw new ExcepcionNegocio("Tipo de ajuste no permitido");
        }
        if (cantidad == null || cantidad.signum() <= 0) {
            throw new ExcepcionNegocio("La cantidad debe ser mayor a cero");
        }
        Inventario inventario = lock(productoId);
        BigDecimal delta = (tipo == TipoMovimiento.AJUSTE_POSITIVO || tipo == TipoMovimiento.DEVOLUCION)
                ? cantidad : cantidad.negate();
        BigDecimal nuevo = inventario.getStockFisico().add(delta);
        if (nuevo.signum() < 0) {
            throw new ExcepcionNegocio("El ajuste deja stock negativo");
        }
        if (nuevo.compareTo(inventario.getStockReservado()) < 0) {
            throw new ExcepcionNegocio("El ajuste deja stock físico menor al reservado");
        }
        inventario.setStockFisico(nuevo);
        inventarioDao.save(inventario);
        syncStockAlert(inventario);
        return movement(inventario, tipo, cantidad, referencia, observaciones, usuario);
    }

    @Transactional
    public ReservaStock reserve(Long productoId, BigDecimal cantidad, String origenTipo, Long origenId) {
        if (cantidad == null || cantidad.signum() <= 0) {
            throw new ExcepcionNegocio("La cantidad a reservar debe ser mayor a cero");
        }
        Inventario inventario = lock(productoId);
        if (inventario.getStockDisponible().compareTo(cantidad) < 0) {
            throw new ExcepcionNegocio("Stock disponible insuficiente para " + inventario.getProducto().getNombre());
        }
        inventario.setStockReservado(inventario.getStockReservado().add(cantidad));
        inventarioDao.save(inventario);
        return reservaDao.save(ReservaStock.builder()
                .inventario(inventario)
                .producto(inventario.getProducto())
                .cantidad(cantidad)
                .origenTipo(origenTipo)
                .origenId(origenId)
                .estado(EstadoReserva.ACTIVA)
                .fechaExpiracion(LocalDateTime.now().plusDays(30))
                .build());
    }

    @Transactional
    public MovimientoInventario consumeReservation(Long reservaId, BigDecimal cantidad,
                                                   String referencia, String observaciones, Usuario usuario) {
        if (cantidad == null || cantidad.signum() <= 0) {
            throw new ExcepcionNegocio("La cantidad a consumir debe ser mayor a cero");
        }
        ReservaStock reserva = reservaDao.findByIdForUpdate(reservaId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Reserva no encontrada"));
        if (reserva.getEstado() != EstadoReserva.ACTIVA) {
            throw new ExcepcionNegocio("La reserva no está activa");
        }
        if (reserva.getCantidad().compareTo(cantidad) < 0) {
            throw new ExcepcionNegocio("La cantidad supera la reserva disponible");
        }
        Inventario inventario = lock(reserva.getProducto().getId());
        if (inventario.getStockFisico().compareTo(cantidad) < 0) {
            throw new ExcepcionNegocio("Stock físico insuficiente");
        }
        inventario.setStockFisico(inventario.getStockFisico().subtract(cantidad));
        inventario.setStockReservado(inventario.getStockReservado().subtract(cantidad));
        if (inventario.getStockReservado().signum() < 0) {
            throw new ExcepcionNegocio("Inconsistencia de stock reservado");
        }
        inventarioDao.save(inventario);

        reserva.setCantidad(reserva.getCantidad().subtract(cantidad));
        if (reserva.getCantidad().signum() == 0) {
            reserva.setEstado(EstadoReserva.CONSUMIDA);
        }
        reservaDao.save(reserva);
        return movement(inventario, TipoMovimiento.SALIDA, cantidad, referencia, observaciones, usuario);
    }

    @Transactional
    public void releaseReservation(Long reservaId) {
        ReservaStock reserva = reservaDao.findByIdForUpdate(reservaId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Reserva no encontrada"));
        if (reserva.getEstado() != EstadoReserva.ACTIVA) {
            return;
        }
        Inventario inventario = lock(reserva.getProducto().getId());
        inventario.setStockReservado(inventario.getStockReservado().subtract(reserva.getCantidad()));
        if (inventario.getStockReservado().signum() < 0) {
            inventario.setStockReservado(BigDecimal.ZERO);
        }
        inventarioDao.save(inventario);
        reserva.setEstado(EstadoReserva.LIBERADA);
        reservaDao.save(reserva);
    }

    private Inventario lock(Long productoId) {
        return inventarioDao.findByProductoIdForUpdate(productoId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Inventario no encontrado para el producto " + productoId));
    }

    private MovimientoInventario movement(Inventario inventario, TipoMovimiento tipo, BigDecimal cantidad,
                                          String referencia, String observaciones, Usuario usuario) {
        return movimientoDao.save(MovimientoInventario.builder()
                .inventarioId(inventario.getId())
                .producto(inventario.getProducto())
                .tipo(tipo)
                .cantidad(cantidad)
                .saldoResultante(inventario.getStockFisico())
                .referencia(referencia)
                .observaciones(observaciones)
                .usuario(usuario)
                .fecha(LocalDateTime.now())
                .build());
    }

    private void syncStockAlert(Inventario inventario) {
        var activa = alertaStockDao
                .findFirstByInventarioIdAndEstadoTrueOrderByFechaAlertaDesc(inventario.getId());
        boolean bajoMinimo = inventario.getStockFisico().compareTo(inventario.getStockMinimo()) < 0;
        if (bajoMinimo && activa.isEmpty()) {
            alertaStockDao.save(AlertaStock.builder()
                    .inventario(inventario)
                    .fechaAlerta(LocalDate.now())
                    .stockActual(inventario.getStockFisico())
                    .umbralMinimo(inventario.getStockMinimo())
                    .estado(true)
                    .build());
        } else if (!bajoMinimo && activa.isPresent()) {
            AlertaStock alerta = activa.get();
            alerta.setEstado(false);
            alertaStockDao.save(alerta);
        }
    }
}
