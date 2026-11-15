package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.*;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class ServicioProgramacion {

    private final ProgramacionDao Dao;
    private final TdrItemDao tdrItemDao;
    private final PuntoEntregaDao puntoDao;

    public ServicioProgramacion(ProgramacionDao Dao,
                               TdrItemDao tdrItemDao,
                               PuntoEntregaDao puntoDao) {
        this.Dao = Dao;
        this.tdrItemDao = tdrItemDao;
        this.puntoDao = puntoDao;
    }

    @Transactional(readOnly = true)
    public List<ProgramacionAbastecimiento> list(Long entidadId, Long contratoId, Long productoId,
                                                 String estado, LocalDate desde, LocalDate hasta) {
        return Dao.findAll().stream()
                .filter(p -> entidadId == null || p.getEntidad().getId().equals(entidadId))
                .filter(p -> contratoId == null || p.getContrato().getId().equals(contratoId))
                .filter(p -> productoId == null || p.getProducto().getId().equals(productoId))
                .filter(p -> estado == null || p.getEstado().name().equalsIgnoreCase(estado))
                .filter(p -> desde == null || !p.getFechaProgramada().isBefore(desde))
                .filter(p -> hasta == null || !p.getFechaProgramada().isAfter(hasta))
                .sorted(Comparator.comparing(ProgramacionAbastecimiento::getFechaProgramada))
                .toList();
    }

    @Transactional(readOnly = true)
    public ProgramacionAbastecimiento get(Long id) {
        return Dao.findById(id).orElseThrow(() -> new ExcepcionNoEncontrada("Programación no encontrada"));
    }

    @Transactional(readOnly = true)
    public List<PreviewItem> preview(Long tdrItemId, Long puntoId) {
        TdrItem item = tdrItemDao.findById(tdrItemId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Item TDR no encontrado"));
        PuntoEntrega punto = puntoDao.findById(puntoId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Punto de entrega no encontrado"));
        if (!punto.getEntidad().getId().equals(item.getTdr().getContrato().getEntidad().getId())) {
            throw new ExcepcionNegocio("El punto no pertenece a la entidad del contrato");
        }
        return generate(item);
    }

    @Transactional
    public List<ProgramacionAbastecimiento> confirm(Long tdrItemId, Long puntoId, List<PreviewItem> items) {
        if (items == null || items.isEmpty()) {
            throw new ExcepcionNegocio("Debe confirmar al menos una fecha");
        }
        TdrItem item = tdrItemDao.findById(tdrItemId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Item TDR no encontrado"));
        PuntoEntrega punto = puntoDao.findById(puntoId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Punto de entrega no encontrado"));
        BigDecimal total = items.stream().map(PreviewItem::cantidad).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal already = Dao.findByTdrItemId(tdrItemId).stream()
                .filter(p -> p.getEstado() != EstadoProgramacion.CANCELADA)
                .map(ProgramacionAbastecimiento::getCantidadProgramada)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (already.add(total).compareTo(item.getCantidadTotal()) > 0) {
            throw new ExcepcionNegocio("La programación supera la cantidad total del TDR");
        }
        List<ProgramacionAbastecimiento> result = new ArrayList<>();
        for (PreviewItem preview : items) {
            if (preview.cantidad() == null || preview.cantidad().signum() <= 0) {
                throw new ExcepcionNegocio("Las cantidades deben ser mayores a cero");
            }
            BigDecimal pendiente = item.getCantidadTotal().subtract(already).subtract(
                    result.stream().map(ProgramacionAbastecimiento::getCantidadProgramada)
                            .reduce(BigDecimal.ZERO, BigDecimal::add));
            if (preview.cantidad().compareTo(pendiente) > 0) {
                throw new ExcepcionNegocio("La cantidad excede el saldo pendiente del TDR");
            }
            result.add(Dao.save(ProgramacionAbastecimiento.builder()
                    .contrato(item.getTdr().getContrato())
                    .tdrItem(item)
                    .entidad(item.getTdr().getContrato().getEntidad())
                    .puntoEntrega(punto)
                    .producto(item.getProducto())
                    .fechaProgramada(preview.fecha())
                    .fechaLimite(item.getFechaLimite())
                    .cantidadComprometida(preview.cantidad())
                    .cantidadProgramada(preview.cantidad())
                    .cantidadEntregada(BigDecimal.ZERO)
                    .saldoPendiente(preview.cantidad())
                    .estado(EstadoProgramacion.PROGRAMADA)
                    .build()));
        }
        return result;
    }

    @Transactional
    public ProgramacionAbastecimiento create(Long tdrItemId, Long puntoId, LocalDate fecha, BigDecimal cantidad) {
        TdrItem item = tdrItemDao.findById(tdrItemId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Item TDR no encontrado"));
        PuntoEntrega punto = puntoDao.findById(puntoId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Punto de entrega no encontrado"));
        return confirm(tdrItemId, puntoId, List.of(new PreviewItem(fecha, cantidad))).get(0);
    }

    @Transactional
    public ProgramacionAbastecimiento reschedule(Long id, LocalDate nuevaFecha, String motivo) {
        ProgramacionAbastecimiento programacion = get(id);
        if (programacion.getEstado() == EstadoProgramacion.CANCELADA
                || programacion.getEstado() == EstadoProgramacion.CUMPLIDA) {
            throw new ExcepcionNegocio("No se puede reprogramar una programación cerrada");
        }
        if (nuevaFecha == null) {
            throw new ExcepcionNegocio("La nueva fecha es obligatoria");
        }
        programacion.setFechaProgramada(nuevaFecha);
        programacion.setEstado(EstadoProgramacion.REPROGRAMADA);
        programacion.setMotivo(motivo);
        return Dao.save(programacion);
    }

    @Transactional
    public ProgramacionAbastecimiento cancel(Long id, String motivo) {
        ProgramacionAbastecimiento programacion = get(id);
        if (programacion.getEstado() == EstadoProgramacion.CUMPLIDA) {
            throw new ExcepcionNegocio("No se puede cancelar una programación cumplida");
        }
        programacion.setEstado(EstadoProgramacion.CANCELADA);
        programacion.setMotivo(motivo);
        return Dao.save(programacion);
    }

    @Transactional
    public void registerDelivery(Long id, BigDecimal cantidad) {
        ProgramacionAbastecimiento programacion = get(id);
        programacion.setCantidadEntregada(programacion.getCantidadEntregada().add(cantidad));
        programacion.setSaldoPendiente(programacion.getCantidadComprometida()
                .subtract(programacion.getCantidadEntregada()));
        if (programacion.getSaldoPendiente().signum() <= 0) {
            programacion.setEstado(EstadoProgramacion.CUMPLIDA);
        } else {
            programacion.setEstado(EstadoProgramacion.PARCIAL);
        }
        Dao.save(programacion);
    }

    private List<PreviewItem> generate(TdrItem item) {
        LocalDate start = item.getFechaProgramada() == null ? LocalDate.now() : item.getFechaProgramada();
        LocalDate end = item.getFechaLimite() == null ? start.plusYears(1) : item.getFechaLimite();
        BigDecimal total = item.getCantidadTotal();
        BigDecimal per = item.getCantidadPorEntrega();
        if (per == null || per.signum() <= 0) {
            throw new ExcepcionNegocio("La cantidad por entrega debe ser mayor a cero");
        }
        List<PreviewItem> result = new ArrayList<>();
        BigDecimal accumulated = BigDecimal.ZERO;
        LocalDate current = start;
        int guard = 0;
        while (!current.isAfter(end) && accumulated.compareTo(total) < 0 && guard++ < 400) {
            BigDecimal remaining = total.subtract(accumulated);
            BigDecimal qty = per.min(remaining);
            result.add(new PreviewItem(current, qty));
            accumulated = accumulated.add(qty);
            current = next(current, item);
        }
        if (result.isEmpty()) {
            throw new ExcepcionNegocio("No se pudieron generar fechas para el TDR");
        }
        return result;
    }

    private LocalDate next(LocalDate date, TdrItem item) {
        return switch (item.getFrecuencia()) {
            case SEMANAL -> date.plusWeeks(1);
            case QUINCENAL -> date.plusWeeks(2);
            case MENSUAL -> date.plusMonths(1);
            case BIMESTRAL -> date.plusMonths(2);
            case TRIMESTRAL -> date.plusMonths(3);
            case SEMESTRAL -> date.plusMonths(6);
            case ANUAL -> date.plusYears(1);
            case PERSONALIZADA -> date.plusDays(item.getDiasPersonalizado() == null ? 30 : item.getDiasPersonalizado());
        };
    }

    public record PreviewItem(LocalDate fecha, BigDecimal cantidad) {}
}
