package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.service.ServicioCumplimiento;
import com.higienesalud.smartsys.model.Despacho;
import com.higienesalud.smartsys.dao.DespachoDao;
import com.higienesalud.smartsys.model.DetalleDespacho;
import com.higienesalud.smartsys.model.IncidenciaDespacho;
import com.higienesalud.smartsys.dao.IncidenciaDespachoDao;
import com.higienesalud.smartsys.model.Inventario;
import com.higienesalud.smartsys.dao.InventarioDao;
import com.higienesalud.smartsys.model.MovimientoInventario;
import com.higienesalud.smartsys.dao.MovimientoInventarioDao;
import com.higienesalud.smartsys.model.ProgramacionAbastecimiento;
import com.higienesalud.smartsys.dao.ProgramacionDao;
import com.higienesalud.smartsys.model.DetalleRecepcion;
import com.higienesalud.smartsys.model.Recepcion;
import com.higienesalud.smartsys.dao.RecepcionDao;
import com.higienesalud.smartsys.model.SolicitudReposicion;
import com.higienesalud.smartsys.dao.SolicitudReposicionDao;
import com.higienesalud.smartsys.model.SolicitudMaterial;
import com.higienesalud.smartsys.dao.SolicitudMaterialDao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class ServicioReportes {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final InventarioDao inventarioDao;
    private final MovimientoInventarioDao movimientoDao;
    private final SolicitudMaterialDao solicitudDao;
    private final SolicitudReposicionDao reposicionDao;
    private final DespachoDao despachoDao;
    private final ProgramacionDao programacionDao;
    private final RecepcionDao recepcionDao;
    private final IncidenciaDespachoDao incidenciaDao;
    private final ServicioCumplimiento ServicioCumplimiento;
    private final ReporteInventarioDao reporteInventarioDao;

    public ServicioReportes(InventarioDao inventarioDao,
                         MovimientoInventarioDao movimientoDao,
                         SolicitudMaterialDao solicitudDao,
                         SolicitudReposicionDao reposicionDao,
                         DespachoDao despachoDao,
                         ProgramacionDao programacionDao,
                         RecepcionDao recepcionDao,
                         IncidenciaDespachoDao incidenciaDao,
                         ServicioCumplimiento ServicioCumplimiento,
                         ReporteInventarioDao reporteInventarioDao) {
        this.inventarioDao = inventarioDao;
        this.movimientoDao = movimientoDao;
        this.solicitudDao = solicitudDao;
        this.reposicionDao = reposicionDao;
        this.despachoDao = despachoDao;
        this.programacionDao = programacionDao;
        this.recepcionDao = recepcionDao;
        this.incidenciaDao = incidenciaDao;
        this.ServicioCumplimiento = ServicioCumplimiento;
        this.reporteInventarioDao = reporteInventarioDao;
    }

    public List<ReportDefinition> catalog() {
        return List.of(
                new ReportDefinition("inventario", "Inventario actual", "Stock físico, reservado y disponible por producto"),
                new ReportDefinition("movimientos", "Movimientos de inventario", "Ingresos, salidas, ajustes y mermas"),
                new ReportDefinition("solicitudes", "Solicitudes de material", "Solicitudes con estado y solicitante"),
                new ReportDefinition("despachos", "Despachos", "Despachos por entidad, punto y estado"),
                new ReportDefinition("entregas", "Entregas por producto", "Cantidades entregadas por despacho"),
                new ReportDefinition("incumplimientos", "Incumplimientos de programación", "Programaciones vencidas o parciales"),
                new ReportDefinition("reposiciones", "Reposiciones", "Solicitudes de reposición y montos"),
                new ReportDefinition("consumo-entidad", "Consumo por entidad", "Cantidades entregadas agrupadas por entidad y producto"),
                new ReportDefinition("programacion", "Programación de abastecimiento", "Cronograma comprometido vs entregado"),
                new ReportDefinition("recepciones", "Recepciones", "Conformidad de recepciones en punto de entrega"),
                new ReportDefinition("incidencias", "Incidencias", "Incidencias reportadas en despachos"),
                new ReportDefinition("cumplimiento-tdr", "Cumplimiento de TDR", "Indicadores de cumplimiento y puntualidad")
        );
    }

    @Transactional
    public void registrar(String key, String formato, LocalDate desde, LocalDate hasta, Usuario usuario) {
        reporteInventarioDao.save(ReporteInventario.builder()
                .usuario(usuario)
                .tipoReporte(key)
                .fechaDesde(desde)
                .fechaHasta(hasta)
                .formato(formato)
                .fechaGeneracion(LocalDate.now())
                .build());
    }

    @Transactional(readOnly = true)
    public List<HistorialReporte> historial() {
        return reporteInventarioDao.findTop20ByOrderByFechaGeneracionDescIdDesc().stream()
                .map(r -> new HistorialReporte(r.getId(), r.getTipoReporte(), r.getFormato(),
                        r.getFechaDesde(), r.getFechaHasta(), r.getFechaGeneracion(),
                        r.getUsuario().getNombres() + " " + r.getUsuario().getApellidos()))
                .toList();
    }

    @Transactional(readOnly = true)
    public DatosReporte generate(String key, LocalDate desde, LocalDate hasta) {
        return switch (key) {
            case "inventario" -> inventory();
            case "movimientos" -> movements(desde, hasta);
            case "solicitudes" -> requests(desde, hasta);
            case "despachos" -> dispatches(desde, hasta);
            case "entregas" -> deliveries(desde, hasta);
            case "incumplimientos" -> nonCompliance(desde, hasta);
            case "reposiciones" -> replenishments(desde, hasta);
            case "consumo-entidad" -> consumptionByEntity(desde, hasta);
            case "programacion" -> schedules(desde, hasta);
            case "recepciones" -> receptions(desde, hasta);
            case "incidencias" -> incidents(desde, hasta);
            case "cumplimiento-tdr" -> tdrCompliance();
            default -> throw new IllegalArgumentException("Reporte no soportado: " + key);
        };
    }

    private DatosReporte inventory() {
        List<List<String>> rows = new ArrayList<>();
        for (Inventario i : inventarioDao.findAll()) {
            rows.add(row(i.getProducto().getCodigo(), i.getProducto().getNombre(),
                    i.getProducto().getUnidadMedida(), i.getStockFisico(), i.getStockReservado(),
                    i.getStockDisponible(), i.getStockMinimo()));
        }
        return new DatosReporte("inventario", "Inventario actual",
                List.of("Código", "Producto", "Unidad", "Stock físico", "Reservado", "Disponible", "Mínimo"), rows);
    }

    private DatosReporte movements(LocalDate desde, LocalDate hasta) {
        List<List<String>> rows = new ArrayList<>();
        for (MovimientoInventario m : movimientoDao.findAllByOrderByFechaDesc()) {
            if (!inRange(m.getFecha().toLocalDate(), desde, hasta)) continue;
            rows.add(row(m.getFecha().format(DATETIME), m.getProducto().getNombre(), m.getTipo().name(),
                    m.getCantidad(), m.getSaldoResultante(), nvl(m.getReferencia()),
                    m.getUsuario() == null ? "" : m.getUsuario().getEmail()));
        }
        return new DatosReporte("movimientos", "Movimientos de inventario",
                List.of("Fecha", "Producto", "Tipo", "Cantidad", "Saldo", "Referencia", "Usuario"), rows);
    }

    private DatosReporte requests(LocalDate desde, LocalDate hasta) {
        List<List<String>> rows = new ArrayList<>();
        for (SolicitudMaterial s : solicitudDao.findAllByOrderByFechaSolicitudDesc()) {
            if (!inRange(s.getFechaSolicitud().toLocalDate(), desde, hasta)) continue;
            rows.add(row(s.getCodigo(), s.getFechaSolicitud().format(DATETIME),
                    s.getEntidad().getRazonSocial(), s.getPuntoEntrega().getNombre(),
                    s.getSolicitante().getNombres() + " " + s.getSolicitante().getApellidos(),
                    s.getEstado().name(), nvl(s.getMotivoRechazo())));
        }
        return new DatosReporte("solicitudes", "Solicitudes de material",
                List.of("Código", "Fecha", "Entidad", "Punto", "Solicitante", "Estado", "Motivo rechazo"), rows);
    }

    private DatosReporte dispatches(LocalDate desde, LocalDate hasta) {
        List<List<String>> rows = new ArrayList<>();
        for (Despacho d : despachoDao.findAllByOrderByFechaDesc()) {
            if (!inRange(d.getFecha(), desde, hasta)) continue;
            rows.add(row(d.getCodigo(), d.getFecha().format(DATE), d.getEntidad().getRazonSocial(),
                    d.getPuntoEntrega().getNombre(), d.getEstado().name(),
                    d.getTransportista() == null ? "" : d.getTransportista().getNombres(),
                    d.getVehiculo() == null ? "" : d.getVehiculo().getPlaca()));
        }
        return new DatosReporte("despachos", "Despachos",
                List.of("Código", "Fecha", "Entidad", "Punto", "Estado", "Transportista", "Vehículo"), rows);
    }

    private DatosReporte deliveries(LocalDate desde, LocalDate hasta) {
        List<List<String>> rows = new ArrayList<>();
        for (Despacho d : despachoDao.findAllByOrderByFechaDesc()) {
            if (!inRange(d.getFecha(), desde, hasta)) continue;
            for (DetalleDespacho det : d.getDetalles()) {
                if (det.getCantidadDespachada().signum() == 0) continue;
                rows.add(row(d.getCodigo(), d.getFecha().format(DATE), d.getPuntoEntrega().getNombre(),
                        det.getProducto().getNombre(), det.getCantidadComprometida(),
                        det.getCantidadDespachada()));
            }
        }
        return new DatosReporte("entregas", "Entregas por producto",
                List.of("Despacho", "Fecha", "Punto", "Producto", "Comprometido", "Entregado"), rows);
    }

    private DatosReporte nonCompliance(LocalDate desde, LocalDate hasta) {
        List<List<String>> rows = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (ProgramacionAbastecimiento p : programacionDao.findAllByOrderByFechaProgramadaAsc()) {
            if (!inRange(p.getFechaProgramada(), desde, hasta)) continue;
            boolean late = p.getFechaProgramada().isBefore(today)
                    && !p.getEstado().name().equals("CUMPLIDA")
                    && !p.getEstado().name().equals("CANCELADA");
            boolean partial = p.getSaldoPendiente().signum() > 0
                    && !p.getEstado().name().equals("CANCELADA");
            if (late || partial) {
                rows.add(row(String.valueOf(p.getId()), p.getEntidad().getRazonSocial(),
                        p.getProducto().getNombre(), p.getFechaProgramada().format(DATE),
                        p.getCantidadComprometida(), p.getCantidadEntregada(), p.getSaldoPendiente(),
                        p.getEstado().name()));
            }
        }
        return new DatosReporte("incumplimientos", "Incumplimientos de programación",
                List.of("ID", "Entidad", "Producto", "Fecha", "Comprometido", "Entregado", "Saldo", "Estado"), rows);
    }

    private DatosReporte replenishments(LocalDate desde, LocalDate hasta) {
        List<List<String>> rows = new ArrayList<>();
        for (SolicitudReposicion r : reposicionDao.findAllByOrderByFechaSolicitudDesc()) {
            if (!inRange(r.getFechaSolicitud().toLocalDate(), desde, hasta)) continue;
            rows.add(row(r.getCodigo(), r.getFechaSolicitud().format(DATETIME),
                    r.getSolicitante().getNombres() + " " + r.getSolicitante().getApellidos(),
                    r.getEstado().name(), r.getMontoEstimado(), nvl(r.getProveedorSugerido()),
                    nvl(r.getReferenciaPresupuesto())));
        }
        return new DatosReporte("reposiciones", "Reposiciones",
                List.of("Código", "Fecha", "Solicitante", "Estado", "Monto estimado", "Proveedor", "Presupuesto"), rows);
    }

    private DatosReporte consumptionByEntity(LocalDate desde, LocalDate hasta) {
        Map<String, BigDecimal> totals = new LinkedHashMap<>();
        for (Despacho d : despachoDao.findAll()) {
            if (!inRange(d.getFecha(), desde, hasta)) continue;
            for (DetalleDespacho det : d.getDetalles()) {
                String key = d.getEntidad().getRazonSocial() + "|" + det.getProducto().getNombre();
                totals.merge(key, det.getCantidadDespachada(), BigDecimal::add);
            }
        }
        List<List<String>> rows = new ArrayList<>();
        totals.forEach((k, v) -> {
            String[] parts = k.split("\\|");
            rows.add(row(parts[0], parts[1], v));
        });
        return new DatosReporte("consumo-entidad", "Consumo por entidad",
                List.of("Entidad", "Producto", "Cantidad entregada"), rows);
    }

    private DatosReporte schedules(LocalDate desde, LocalDate hasta) {
        List<List<String>> rows = new ArrayList<>();
        for (ProgramacionAbastecimiento p : programacionDao.findAllByOrderByFechaProgramadaAsc()) {
            if (!inRange(p.getFechaProgramada(), desde, hasta)) continue;
            rows.add(row(String.valueOf(p.getId()), p.getEntidad().getRazonSocial(),
                    p.getPuntoEntrega().getNombre(), p.getProducto().getNombre(),
                    p.getFechaProgramada().format(DATE), p.getCantidadProgramada(),
                    p.getCantidadEntregada(), p.getSaldoPendiente(), p.getEstado().name()));
        }
        return new DatosReporte("programacion", "Programación de abastecimiento",
                List.of("ID", "Entidad", "Punto", "Producto", "Fecha", "Programado", "Entregado", "Saldo", "Estado"), rows);
    }

    private DatosReporte receptions(LocalDate desde, LocalDate hasta) {
        List<List<String>> rows = new ArrayList<>();
        for (Recepcion r : recepcionDao.findAllByOrderByFechaHoraDesc()) {
            if (!inRange(r.getFechaHora().toLocalDate(), desde, hasta)) continue;
            String productos = r.getDetalles().stream()
                    .map(d -> d.getProducto().getNombre() + " (" + d.getCantidadRecibida() + ")")
                    .reduce((a, b) -> a + "; " + b).orElse("");
            rows.add(row(String.valueOf(r.getId()), r.getDespacho().getCodigo(),
                    r.getFechaHora().format(DATETIME), r.getRecibidoPor(), r.getEstado(),
                    String.valueOf(r.isConforme()), productos, nvl(r.getObservaciones())));
        }
        return new DatosReporte("recepciones", "Recepciones",
                List.of("ID", "Despacho", "Fecha", "Recibido por", "Estado", "Conforme", "Productos", "Observaciones"), rows);
    }

    private DatosReporte incidents(LocalDate desde, LocalDate hasta) {
        List<List<String>> rows = new ArrayList<>();
        for (Despacho d : despachoDao.findAll()) {
            for (IncidenciaDespacho i : incidenciaDao.findByDespachoIdOrderByFechaDesc(d.getId())) {
                if (!inRange(i.getFecha().toLocalDate(), desde, hasta)) continue;
                rows.add(row(i.getFecha().format(DATETIME), d.getCodigo(), i.getTipo(),
                        i.getDescripcion(), i.getEstado(),
                        i.getUsuario().getNombres() + " " + i.getUsuario().getApellidos()));
            }
        }
        rows.sort(Comparator.comparing(r -> r.get(0), Comparator.reverseOrder()));
        return new DatosReporte("incidencias", "Incidencias",
                List.of("Fecha", "Despacho", "Tipo", "Descripción", "Estado", "Usuario"), rows);
    }

    private DatosReporte tdrCompliance() {
        List<List<String>> rows = new ArrayList<>();
        for (ServicioCumplimiento.TdrCompliance c : ServicioCumplimiento.summary()) {
            rows.add(row(String.valueOf(c.tdrId()), c.contrato(), c.entidad(), c.comprometido(),
                    c.programado(), c.entregado(), c.recibido(), c.cumplimientoPct(),
                    c.puntualidadPct(), c.programaciones(), c.cumplidas(), c.vencidas(),
                    c.recepciones(), c.incidencias()));
        }
        return new DatosReporte("cumplimiento-tdr", "Cumplimiento de TDR",
                List.of("TDR", "Contrato", "Entidad", "Comprometido", "Programado", "Entregado", "Recibido",
                        "Cumplimiento %", "Puntualidad %", "Programaciones", "Cumplidas", "Vencidas",
                        "Recepciones", "Incidencias"), rows);
    }

    private List<String> row(Object... values) {
        List<String> row = new ArrayList<>();
        for (Object value : values) {
            if (value == null) {
                row.add("");
            } else if (value instanceof BigDecimal bd) {
                row.add(bd.stripTrailingZeros().toPlainString());
            } else {
                row.add(String.valueOf(value));
            }
        }
        return row;
    }

    private boolean inRange(LocalDate date, LocalDate desde, LocalDate hasta) {
        if (date == null) return desde == null && hasta == null;
        if (desde != null && date.isBefore(desde)) return false;
        if (hasta != null && date.isAfter(hasta)) return false;
        return true;
    }

    private String nvl(String value) {
        return value == null ? "" : value;
    }

    public record ReportDefinition(String key, String nombre, String descripcion) {}

    public record HistorialReporte(Long id, String tipo, String formato, LocalDate desde,
                                   LocalDate hasta, LocalDate generado, String usuario) {}
}
