package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.exception.ExcepcionNoEncontrada;
import com.higienesalud.smartsys.model.Despacho;
import com.higienesalud.smartsys.dao.DespachoDao;
import com.higienesalud.smartsys.model.IncidenciaDespacho;
import com.higienesalud.smartsys.dao.IncidenciaDespachoDao;
import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.model.EstadoProgramacion;
import com.higienesalud.smartsys.model.ProgramacionAbastecimiento;
import com.higienesalud.smartsys.dao.ProgramacionDao;
import com.higienesalud.smartsys.model.DetalleRecepcion;
import com.higienesalud.smartsys.model.Recepcion;
import com.higienesalud.smartsys.dao.RecepcionDao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class ServicioCumplimiento {

    private final TdrDao tdrDao;
    private final TdrItemDao tdrItemDao;
    private final ProgramacionDao programacionDao;
    private final DespachoDao despachoDao;
    private final IncidenciaDespachoDao incidenciaDao;
    private final RecepcionDao recepcionDao;
    private final ClausulaContractualDao clausulaDao;
    private final ContratoDao contratoDao;

    public ServicioCumplimiento(TdrDao tdrDao,
                               TdrItemDao tdrItemDao,
                               ProgramacionDao programacionDao,
                               DespachoDao despachoDao,
                               IncidenciaDespachoDao incidenciaDao,
                               RecepcionDao recepcionDao,
                               ClausulaContractualDao clausulaDao,
                               ContratoDao contratoDao) {
        this.tdrDao = tdrDao;
        this.tdrItemDao = tdrItemDao;
        this.programacionDao = programacionDao;
        this.despachoDao = despachoDao;
        this.incidenciaDao = incidenciaDao;
        this.recepcionDao = recepcionDao;
        this.clausulaDao = clausulaDao;
        this.contratoDao = contratoDao;
    }

    @Transactional(readOnly = true)
    public TdrCompliance evaluate(Long tdrId) {
        Tdr tdr = tdrDao.findById(tdrId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("TDR no encontrado"));
        List<TdrItem> items = tdrItemDao.findByTdrId(tdrId);
        List<ProgramacionAbastecimiento> programaciones = items.stream()
                .flatMap(i -> programacionDao.findByTdrItemId(i.getId()).stream())
                .toList();
        List<Despacho> despachos = despachoDao.findAll().stream()
                .filter(d -> d.getTdr().getId().equals(tdrId)).toList();
        List<Recepcion> recepciones = recepcionDao.findAll().stream()
                .filter(r -> r.getDespacho().getTdr().getId().equals(tdrId)).toList();
        List<IncidenciaDespacho> incidencias = despachos.stream()
                .flatMap(d -> incidenciaDao.findByDespachoIdOrderByFechaDesc(d.getId()).stream())
                .toList();

        BigDecimal comprometido = items.stream().map(TdrItem::getCantidadTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal programado = programaciones.stream().map(ProgramacionAbastecimiento::getCantidadProgramada)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal entregado = programaciones.stream().map(ProgramacionAbastecimiento::getCantidadEntregada)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal recibido = recepciones.stream()
                .flatMap(r -> r.getDetalles().stream())
                .map(DetalleRecepcion::getCantidadRecibida)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long cumplidas = programaciones.stream()
                .filter(p -> p.getEstado() == EstadoProgramacion.CUMPLIDA).count();
        long vencidas = programaciones.stream()
                .filter(p -> p.getEstado() != EstadoProgramacion.CANCELADA
                        && p.getEstado() != EstadoProgramacion.CUMPLIDA
                        && p.getFechaProgramada().isBefore(LocalDate.now()))
                .count();
        long totalEvaluables = programaciones.stream()
                .filter(p -> p.getEstado() != EstadoProgramacion.CANCELADA).count();

        BigDecimal cumplimientoPct = pct(entregado, comprometido);
        BigDecimal puntualidadPct = totalEvaluables == 0 ? BigDecimal.valueOf(100)
                : pct(BigDecimal.valueOf(cumplidas), BigDecimal.valueOf(totalEvaluables));

        List<ItemCompliance> itemCompliance = new ArrayList<>();
        for (TdrItem item : items) {
            BigDecimal itemProgramado = programaciones.stream()
                    .filter(p -> p.getTdrItem().getId().equals(item.getId()))
                    .map(ProgramacionAbastecimiento::getCantidadProgramada)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal itemEntregado = programaciones.stream()
                    .filter(p -> p.getTdrItem().getId().equals(item.getId()))
                    .map(ProgramacionAbastecimiento::getCantidadEntregada)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            itemCompliance.add(new ItemCompliance(item.getId(), item.getProducto().getNombre(),
                    item.getCantidadTotal(), itemProgramado, itemEntregado,
                    pct(itemEntregado, item.getCantidadTotal())));
        }

        List<ClausulaEvaluada> clausulas = clausulaDao
                .findByContratoIdAndActivaTrueOrderByCodigo(tdr.getContrato().getId()).stream()
                .map(c -> {
                    boolean incumple = c.getUmbralPorcentaje() != null
                            && cumplimientoPct.compareTo(c.getUmbralPorcentaje()) < 0;
                    return new ClausulaEvaluada(c.getId(), c.getCodigo(), c.getDescripcion(), c.getTipo(),
                            c.getUmbralPorcentaje(), c.getAccionSugerida(), incumple,
                            incumple ? "Requiere revisión manual. No se aplican penalidades automaticas." : "Conforme");
                }).toList();

        return new TdrCompliance(tdrId, tdr.getContrato().getCodigo(), tdr.getContrato().getEntidad().getRazonSocial(),
                comprometido, programado, entregado, recibido, cumplimientoPct, puntualidadPct,
                programaciones.size(), cumplidas, vencidas, recepciones.size(), incidencias.size(),
                itemCompliance, clausulas);
    }

    @Transactional(readOnly = true)
    public List<TdrCompliance> summary() {
        return tdrDao.findAll().stream().map(t -> evaluate(t.getId())).toList();
    }

    @Transactional(readOnly = true)
    public List<ClausulaContractual> clauses(Long contratoId) {
        return clausulaDao.findByContratoIdAndActivaTrueOrderByCodigo(contratoId);
    }

    @Transactional
    public ClausulaContractual createClause(Long contratoId, ClauseRequest request) {
        Contrato contrato = contratoDao.findById(contratoId)
                .orElseThrow(() -> new ExcepcionNoEncontrada("Contrato no encontrado"));
        return clausulaDao.save(ClausulaContractual.builder()
                .contrato(contrato).codigo(request.codigo()).descripcion(request.descripcion())
                .tipo(request.tipo()).umbralPorcentaje(request.umbralPorcentaje())
                .accionSugerida(request.accionSugerida() == null ? "REVISION_MANUAL" : request.accionSugerida())
                .activa(request.activa() == null || request.activa()).build());
    }

    private BigDecimal pct(BigDecimal part, BigDecimal total) {
        if (total == null || total.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return part.multiply(BigDecimal.valueOf(100))
                .divide(total, 2, RoundingMode.HALF_UP);
    }

    public record ItemCompliance(Long tdrItemId, String producto, BigDecimal comprometido,
                                 BigDecimal programado, BigDecimal entregado, BigDecimal cumplimientoPct) {}

    public record ClausulaEvaluada(Long id, String codigo, String descripcion, String tipo,
                                   BigDecimal umbralPorcentaje, String accionSugerida,
                                   boolean incumplida, String resultado) {}

    public record TdrCompliance(Long tdrId, String contrato, String entidad,
                                BigDecimal comprometido, BigDecimal programado, BigDecimal entregado,
                                BigDecimal recibido, BigDecimal cumplimientoPct, BigDecimal puntualidadPct,
                                long programaciones, long cumplidas, long vencidas,
                                long recepciones, long incidencias,
                                List<ItemCompliance> items, List<ClausulaEvaluada> clausulas) {}

    public record ClauseRequest(String codigo, String descripcion, String tipo,
                                BigDecimal umbralPorcentaje, String accionSugerida, Boolean activa) {}
}
