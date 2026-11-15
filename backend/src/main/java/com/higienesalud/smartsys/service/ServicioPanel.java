package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.service.ServicioCumplimiento;
import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.service.ServicioInventario;
import com.higienesalud.smartsys.model.Inventario;
import com.higienesalud.smartsys.dao.InventarioDao;
import com.higienesalud.smartsys.model.Recepcion;
import com.higienesalud.smartsys.dao.RecepcionDao;
import com.higienesalud.smartsys.model.EstadoReposicion;
import com.higienesalud.smartsys.model.SolicitudReposicion;
import com.higienesalud.smartsys.dao.SolicitudReposicionDao;
import com.higienesalud.smartsys.model.EstadoSolicitud;
import com.higienesalud.smartsys.model.SolicitudMaterial;
import com.higienesalud.smartsys.dao.SolicitudMaterialDao;
import com.higienesalud.smartsys.model.ProgramacionAbastecimiento;
import com.higienesalud.smartsys.dao.ProgramacionDao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ServicioPanel {

    private final InventarioDao inventarioDao;
    private final SolicitudMaterialDao solicitudDao;
    private final SolicitudReposicionDao reposicionDao;
    private final DespachoDao despachoDao;
    private final ProgramacionDao programacionDao;
    private final RecepcionDao recepcionDao;
    private final IncidenciaDespachoDao incidenciaDao;
    private final ServicioCumplimiento ServicioCumplimiento;

    public ServicioPanel(InventarioDao inventarioDao,
                            SolicitudMaterialDao solicitudDao,
                            SolicitudReposicionDao reposicionDao,
                            DespachoDao despachoDao,
                            ProgramacionDao programacionDao,
                            RecepcionDao recepcionDao,
                            IncidenciaDespachoDao incidenciaDao,
                            ServicioCumplimiento ServicioCumplimiento) {
        this.inventarioDao = inventarioDao;
        this.solicitudDao = solicitudDao;
        this.reposicionDao = reposicionDao;
        this.despachoDao = despachoDao;
        this.programacionDao = programacionDao;
        this.recepcionDao = recepcionDao;
        this.incidenciaDao = incidenciaDao;
        this.ServicioCumplimiento = ServicioCumplimiento;
    }

    @Transactional(readOnly = true)
    public Summary summary() {
        List<Inventario> inventario = inventarioDao.findAll();
        List<SolicitudMaterial> solicitudes = solicitudDao.findAll();
        List<Despacho> despachos = despachoDao.findAll();
        List<ProgramacionAbastecimiento> programaciones = programacionDao.findAll();
        List<Recepcion> recepciones = recepcionDao.findAll();
        YearMonth current = YearMonth.now();

        long stockBajo = inventario.stream()
                .filter(i -> i.getStockMinimo().signum() > 0
                        && i.getStockDisponible().compareTo(i.getStockMinimo()) < 0)
                .count();
        long pendientes = solicitudes.stream()
                .filter(s -> s.getEstado() == EstadoSolicitud.PENDIENTE
                        || s.getEstado() == EstadoSolicitud.EN_REVISION).count();
        long aprobadas = solicitudes.stream()
                .filter(s -> s.getEstado() == EstadoSolicitud.PENDIENTE_DESPACHO
                        || s.getEstado() == EstadoSolicitud.PARCIALMENTE_ATENDIDA).count();
        long despachosActivos = despachos.stream()
                .filter(d -> d.getEstado() == EstadoDespacho.BORRADOR
                        || d.getEstado() == EstadoDespacho.EN_PREPARACION
                        || d.getEstado() == EstadoDespacho.PREPARADO
                        || d.getEstado() == EstadoDespacho.EN_RUTA).count();
        long entregasMes = despachos.stream()
                .filter(d -> d.getFecha() != null && YearMonth.from(d.getFecha()).equals(current))
                .filter(d -> d.getEstado() == EstadoDespacho.ENTREGADO
                        || d.getEstado() == EstadoDespacho.ENTREGADO_PARCIAL)
                .count();
        long programacionesMes = programaciones.stream()
                .filter(p -> p.getFechaProgramada() != null
                        && YearMonth.from(p.getFechaProgramada()).equals(current)).count();
        long recepcionesNoConformes = recepciones.stream().filter(r -> !r.isConforme()).count();
        long incidenciasAbiertas = incidenciaDao.findAll().stream()
                .filter(i -> "ABIERTA".equals(i.getEstado())).count();
        BigDecimal cumplimiento = BigDecimal.ZERO;
        List<ServicioCumplimiento.TdrCompliance> compliance = ServicioCumplimiento.summary();
        for (ServicioCumplimiento.TdrCompliance item : compliance) {
            cumplimiento = cumplimiento.add(item.cumplimientoPct());
        }
        long tdrCount = compliance.size();
        BigDecimal promedio = tdrCount == 0 ? BigDecimal.ZERO
                : cumplimiento.divide(BigDecimal.valueOf(tdrCount), 2, RoundingMode.HALF_UP);

        return new Summary(inventario.size(), stockBajo, solicitudes.size(), pendientes, aprobadas,
                despachos.size(), despachosActivos, entregasMes, programacionesMes,
                recepciones.size(), recepcionesNoConformes, incidenciasAbiertas, promedio);
    }

    @Transactional(readOnly = true)
    public Charts charts() {
        List<Despacho> despachos = despachoDao.findAll();
        Map<YearMonth, List<Despacho>> byMonth = despachos.stream()
                .filter(d -> d.getFecha() != null)
                .collect(Collectors.groupingBy(d -> YearMonth.from(d.getFecha())));
        List<MonthlyPoint> monthly = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth month = YearMonth.now().minusMonths(i);
            List<Despacho> list = byMonth.getOrDefault(month, List.of());
            long delivered = list.stream()
                    .filter(d -> d.getEstado() == EstadoDespacho.ENTREGADO
                            || d.getEstado() == EstadoDespacho.ENTREGADO_PARCIAL).count();
            BigDecimal qty = list.stream()
                    .flatMap(d -> d.getDetalles().stream())
                    .map(DetalleDespacho::getCantidadDespachada)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            monthly.add(new MonthlyPoint(month.getMonth().getDisplayName(TextStyle.SHORT, new Locale("es", "PE")),
                    delivered, qty));
        }
        Map<String, Long> requestStates = solicitudDao.findAll().stream()
                .collect(Collectors.groupingBy(s -> s.getEstado().name(), Collectors.counting()));
        Map<String, Long> dispatchStates = despachos.stream()
                .collect(Collectors.groupingBy(d -> d.getEstado().name(), Collectors.counting()));
        Map<String, BigDecimal> productTotals = new LinkedHashMap<>();
        for (Despacho d : despachos) {
            for (DetalleDespacho det : d.getDetalles()) {
                productTotals.merge(det.getProducto().getNombre(), det.getCantidadDespachada(), BigDecimal::add);
            }
        }
        List<ProductTotal> top = productTotals.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .limit(8)
                .map(e -> new ProductTotal(e.getKey(), e.getValue()))
                .toList();
        List<StateCount> requests = requestStates.entrySet().stream()
                .map(e -> new StateCount(e.getKey(), e.getValue())).toList();
        List<StateCount> dispatches = dispatchStates.entrySet().stream()
                .map(e -> new StateCount(e.getKey(), e.getValue())).toList();
        return new Charts(monthly, requests, dispatches, top);
    }

    @Transactional(readOnly = true)
    public List<Inventario> stockAlerts() {
        return inventarioDao.findAll().stream()
                .filter(i -> i.getStockMinimo().signum() > 0
                        && i.getStockDisponible().compareTo(i.getStockMinimo()) < 0)
                .toList();
    }

    public record Summary(long productos, long stockBajo, long solicitudes, long solicitudesPendientes,
                          long solicitudesAprobadas, long despachos, long despachosActivos,
                          long entregasMes, long programacionesMes, long recepciones,
                          long recepcionesNoConformes, long incidenciasAbiertas,
                          BigDecimal cumplimientoPromedio) {}

    public record MonthlyPoint(String mes, long entregas, BigDecimal cantidad) {}
    public record StateCount(String estado, long total) {}
    public record ProductTotal(String producto, BigDecimal cantidad) {}
    public record Charts(List<MonthlyPoint> mensual, List<StateCount> solicitudes,
                         List<StateCount> despachos, List<ProductTotal> topProductos) {}
}
