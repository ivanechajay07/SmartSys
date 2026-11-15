import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileBarChart,
  Gauge,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Truck,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/api';
import { formatDateTime, formatNumber, formatQuantity, stateLabel } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import { ROLE_LABELS, useAuth } from '@/store/auth';
import type { DashboardCharts, DashboardSummary, Inventario } from '@/types';
import { Card, CardHeader, EmptyState, ErrorAlert, Spinner } from '@/components/ui';
import '@/styles/dashboard.css';

const PIE_COLORS = ['#05947a', '#0ea5e9', '#f59e0b', '#ef4444', '#6366f1', '#64748b', '#14b8a6'];

type Tone = 'brand' | 'amber' | 'sky' | 'rose' | 'indigo';

export default function PaginaPanelGeneral() {
  const user = useAuth((state) => state.user);
  const can = useAuth((state) => state.can);
  const summary = useApiQuery<DashboardSummary>(() => api.get('/dashboard/summary').then((r) => r.data));
  const charts = useApiQuery<DashboardCharts>(() => api.get('/dashboard/charts').then((r) => r.data));
  const alerts = useApiQuery<Inventario[]>(() => api.get('/dashboard/stock-alerts').then((r) => r.data));
  const [range, setRange] = useState<'3' | '6'>('6');
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  useEffect(() => {
    if (summary.data || charts.data || alerts.data) {
      setLastUpdated(new Date());
    }
  }, [summary.data, charts.data, alerts.data]);

  const monthly = useMemo(() => charts.data?.mensual ?? [], [charts.data]);
  const ranged = useMemo(() => (range === '3' ? monthly.slice(-3) : monthly), [monthly, range]);
  const totalEntregas = useMemo(
    () => monthly.reduce((sum, point) => sum + Number(point.entregas), 0),
    [monthly],
  );
  const totalCantidad = useMemo(
    () => monthly.reduce((sum, point) => sum + Number(point.cantidad), 0),
    [monthly],
  );
  const average = monthly.length ? Math.round(totalEntregas / monthly.length) : 0;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = user?.nombre?.split(' ')[0] ?? '';
  const dateLabel = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(now);

  const isLoading = summary.loading || charts.loading || alerts.loading;
  const reloadAll = () => {
    summary.reload();
    charts.reload();
    alerts.reload();
  };

  const kpis: {
    label: string;
    value: string;
    hint: string;
    icon: ReactNode;
    tone: Tone;
    badge: string;
    to?: string;
  }[] = summary.data
    ? [
        {
          label: 'Solicitudes pendientes',
          value: formatNumber(summary.data.solicitudesPendientes),
          hint: `${formatNumber(summary.data.solicitudes)} ${
            summary.data.solicitudes === 1 ? 'solicitud registrada' : 'solicitudes registradas'
          }`,
          icon: <ClipboardList className="h-5 w-5" />,
          tone: 'amber',
          badge: 'Por atender',
          to: can('SOLICITUDES', 'ver') ? '/solicitudes' : undefined,
        },
        {
          label: 'Despachos activos',
          value: formatNumber(summary.data.despachosActivos),
          hint: `${formatNumber(summary.data.entregasMes)} ${
            summary.data.entregasMes === 1 ? 'entrega en el mes' : 'entregas en el mes'
          }`,
          icon: <Truck className="h-5 w-5" />,
          tone: 'sky',
          badge: 'En curso',
          to: can('DESPACHOS', 'ver') ? '/despachos' : undefined,
        },
        {
          label: 'Cumplimiento promedio',
          value: `${formatNumber(summary.data.cumplimientoPromedio, 2)}%`,
          hint: 'Promedio de TDR evaluados',
          icon: <TrendingUp className="h-5 w-5" />,
          tone:
            summary.data.cumplimientoPromedio >= 90
              ? 'brand'
              : summary.data.cumplimientoPromedio >= 70
                ? 'amber'
                : 'rose',
          badge:
            summary.data.cumplimientoPromedio >= 90
              ? 'En meta'
              : summary.data.cumplimientoPromedio >= 70
                ? 'En riesgo'
                : 'Crítico',
          to: can('CUMPLIMIENTO', 'ver') ? '/cumplimiento' : undefined,
        },
        {
          label: 'Stock bajo mínimo',
          value: formatNumber(summary.data.stockBajo),
          hint: `${formatNumber(summary.data.productos)} ${
            summary.data.productos === 1 ? 'producto en catálogo' : 'productos en catálogo'
          }`,
          icon: <Boxes className="h-5 w-5" />,
          tone: summary.data.stockBajo > 0 ? 'rose' : 'brand',
          badge: summary.data.stockBajo > 0 ? 'Alerta' : 'Controlado',
          to: can('INVENTARIO', 'ver') ? '/inventario' : undefined,
        },
        {
          label: 'Programaciones del mes',
          value: formatNumber(summary.data.programacionesMes),
          hint: 'Cronograma contractual vigente',
          icon: <CalendarClock className="h-5 w-5" />,
          tone: 'indigo',
          badge: 'Cronograma',
          to: can('PROGRAMACION', 'ver') ? '/programacion' : undefined,
        },
        {
          label: 'Entregas del mes',
          value: formatNumber(summary.data.entregasMes),
          hint: 'Unidades y entregas del periodo',
          icon: <PackageCheck className="h-5 w-5" />,
          tone: 'sky',
          badge: 'Periodo',
          to: can('DESPACHOS', 'ver') ? '/despachos' : undefined,
        },
        {
          label: 'Recepciones no conformes',
          value: formatNumber(summary.data.recepcionesNoConformes),
          hint: `${formatNumber(summary.data.recepciones)} ${
            summary.data.recepciones === 1 ? 'recepción registrada' : 'recepciones registradas'
          }`,
          icon: <AlertTriangle className="h-5 w-5" />,
          tone: 'rose',
          badge: 'Revisión',
          to: can('RECEPCIONES', 'ver') ? '/recepciones' : undefined,
        },
        {
          label: 'Incidencias abiertas',
          value: formatNumber(summary.data.incidenciasAbiertas),
          hint: 'Requieren seguimiento operativo',
          icon: <ClipboardCheck className="h-5 w-5" />,
          tone: 'amber',
          badge: 'Seguimiento',
          to: can('DESPACHOS', 'ver') ? '/despachos' : undefined,
        },
      ]
    : [];

  const actionDefinitions: {
    to: string;
    title: string;
    copy: string;
    icon: ReactNode;
    module: string;
    action: 'ver' | 'crear' | 'editar';
  }[] = [
    {
      to: '/solicitudes',
      title: 'Nueva solicitud',
      copy: 'Registrar un requerimiento de material',
      icon: <ClipboardList className="h-4 w-4" />,
      module: 'SOLICITUDES',
      action: 'crear',
    },
    {
      to: '/programacion',
      title: 'Programar entrega',
      copy: 'Generar cronograma desde el TDR',
      icon: <CalendarClock className="h-4 w-4" />,
      module: 'PROGRAMACION',
      action: 'crear',
    },
    {
      to: '/despachos',
      title: 'Gestionar despachos',
      copy: 'Preparar, asignar y registrar entregas',
      icon: <Truck className="h-4 w-4" />,
      module: 'DESPACHOS',
      action: 'editar',
    },
    {
      to: '/reportes',
      title: 'Abrir reportes',
      copy: 'Exportar indicadores en PDF, Excel o CSV',
      icon: <FileBarChart className="h-4 w-4" />,
      module: 'REPORTES',
      action: 'ver',
    },
  ];

  const quickActions = actionDefinitions.filter((action) => can(action.module, action.action));
  const stockAlertCount = alerts.data?.length ?? 0;

  const compliance = Number(summary.data?.cumplimientoPromedio ?? 0);
  const gaugeColor = compliance >= 90 ? '#05947a' : compliance >= 70 ? '#f59e0b' : '#e11d48';

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero dashboard-reveal">
        <div className="dashboard-hero-main">
          <p className="dashboard-eyebrow">
            <span className="dashboard-live-dot" /> Centro de control · {dateLabel}
          </p>
          <h1 className="dashboard-title">Panel general</h1>
          <p className="dashboard-sub">
            {greeting}{firstName ? `, ${firstName}` : ''}. Pulso operativo en tiempo real de inventario,
            solicitudes, despachos, recepciones y cumplimiento contractual.
          </p>
          <div className="dashboard-hero-actions">
            <span className="dashboard-hero-chip">
              <Gauge className="h-3.5 w-3.5" /> Vista consolidada
            </span>
            <button type="button" onClick={reloadAll} className="dashboard-hero-button-soft" disabled={isLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
            {can('REPORTES', 'ver') && (
              <Link to="/reportes" className="dashboard-hero-button">
                <FileBarChart className="h-3.5 w-3.5" /> Abrir reportes <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        <div className="dashboard-hero-strip">
          <span className="dashboard-strip-live"><i /> Datos en vivo</span>
          <span><Clock className="h-3 w-3" /> Actualizado {formatDateTime(lastUpdated.toISOString())}</span>
          <span>{dateLabel}</span>
          <span>{user ? ROLE_LABELS[user.rol] : 'Sesión corporativa'}</span>
        </div>
      </section>

      {summary.error && <ErrorAlert message={summary.error} onRetry={summary.reload} />}

      {summary.loading && !summary.data ? (
        <Spinner />
      ) : summary.data ? (
        <>
          <div className="dashboard-section-head dashboard-reveal">
            <div>
              <p className="dashboard-section-kicker">Indicadores principales</p>
              <h2>Tablero ejecutivo</h2>
            </div>
            <span className="dashboard-section-meta"><i /> {kpis.length} métricas en vivo</span>
          </div>

          <div className="dashboard-kpi-grid dashboard-kpi-grid-primary">
            {kpis.slice(0, 4).map((kpi, index) => (
              <KpiCard key={kpi.label} {...kpi} delay={`dashboard-reveal-${index + 1}`} />
            ))}
          </div>

          <div className="dashboard-section-head dashboard-section-head-compact dashboard-reveal">
            <div>
              <p className="dashboard-section-kicker">Control operativo</p>
              <h2>Seguimiento del periodo</h2>
            </div>
          </div>

          <div className="dashboard-kpi-grid dashboard-kpi-grid-secondary">
            {kpis.slice(4).map((kpi, index) => (
              <KpiCard
                key={kpi.label}
                {...kpi}
                compact
                delay={`dashboard-reveal-${index + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card className="dashboard-reveal dashboard-reveal-2">
          <CardHeader
            title="Estadísticas lineales"
            subtitle="Tendencia de entregas y unidades movilizadas"
            actions={
              <div className="dashboard-chart-toggle" role="group" aria-label="Rango del gráfico">
                <button
                  type="button"
                  className={range === '3' ? 'is-active' : ''}
                  onClick={() => setRange('3')}
                >
                  3 meses
                </button>
                <button
                  type="button"
                  className={range === '6' ? 'is-active' : ''}
                  onClick={() => setRange('6')}
                >
                  6 meses
                </button>
              </div>
            }
          />
          <div className="card-body">
            {charts.error && <ErrorAlert message={charts.error} onRetry={charts.reload} />}
            {charts.loading && !charts.data ? (
              <Spinner />
            ) : monthly.length === 0 ? (
              <EmptyState title="Sin entregas registradas" description="El gráfico aparecerá con el primer despacho entregado." />
            ) : (
              <>
                <div className="dashboard-chart-legend">
                  <span>
                    <i style={{ background: '#05947a' }} /> Entregas
                  </span>
                  <span>
                    <i style={{ background: '#0ea5e9' }} /> Unidades
                  </span>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ranged} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value) => formatNumber(Number(value))}
                        contentStyle={{
                          borderRadius: 10,
                          border: '1px solid #e2e8f0',
                          fontSize: 12,
                          boxShadow: '0 12px 30px -20px rgba(15,23,42,.3)',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="entregas"
                        name="Entregas"
                        stroke="#05947a"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cantidad"
                        name="Unidades"
                        stroke="#0ea5e9"
                        strokeWidth={2.5}
                        strokeDasharray="5 4"
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="dashboard-chart-footer">
                  <span className="dashboard-chart-stat">
                    <strong>{formatNumber(totalEntregas)}</strong> entregas en 6 meses
                  </span>
                  <span className="dashboard-chart-stat">
                    <strong>{formatQuantity(totalCantidad)}</strong> unidades movilizadas
                  </span>
                  <span className="dashboard-chart-stat">
                    <strong>{formatNumber(average)}</strong> entregas/mes en promedio
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="dashboard-reveal dashboard-reveal-3">
          <CardHeader title="Cumplimiento contractual" subtitle="Indicadores de los TDR evaluados" />
          <div className="card-body">
            <div className="dashboard-gauge-wrap">
              <div
                className="dashboard-gauge"
                style={
                  {
                    '--gauge': `${Math.min(Math.max(compliance, 0), 100)}%`,
                    '--gauge-color': gaugeColor,
                  } as CSSProperties
                }
                role="img"
                aria-label={`Cumplimiento promedio ${formatNumber(compliance, 2)}%`}
              >
                <div className="dashboard-gauge-center">
                  <p className="dashboard-gauge-value">{formatNumber(compliance, 1)}%</p>
                  <p className="dashboard-gauge-label">Cumplimiento</p>
                </div>
              </div>
              <div className="dashboard-gauge-copy">
                <h4>Cumplimiento promedio</h4>
                <p>
                  Calculado desde programaciones, entregas, recepciones e incidencias. Un valor menor a
                  90% requiere revisión de la jefatura.
                </p>
                <div className="dashboard-gauge-legend">
                  <div className="dashboard-gauge-legend-row">
                    <span className="flex items-center gap-2">
                      <span className="dashboard-gauge-legend-dot" /> Programaciones del mes
                    </span>
                    <strong>{formatNumber(summary.data?.programacionesMes ?? 0)}</strong>
                  </div>
                  <div className="dashboard-gauge-legend-row">
                    <span>Recepciones no conformes</span>
                    <strong className="text-rose-600">{formatNumber(summary.data?.recepcionesNoConformes ?? 0)}</strong>
                  </div>
                  <div className="dashboard-gauge-legend-row">
                    <span>Incidencias abiertas</span>
                    <strong className="text-amber-600">{formatNumber(summary.data?.incidenciasAbiertas ?? 0)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="dashboard-reveal dashboard-reveal-3">
          <CardHeader title="Pulso operativo" subtitle="Lectura rápida de la operación" />
          <div className="card-body">
            {summary.data ? (
              <div className="dashboard-pulse-list">
                <PulseRow
                  label="Solicitudes pendientes"
                  value={summary.data.solicitudesPendientes}
                  total={summary.data.solicitudes}
                  tone="amber"
                />
                <PulseRow
                  label="Solicitudes aprobadas"
                  value={summary.data.solicitudesAprobadas}
                  total={summary.data.solicitudes}
                  tone="brand"
                />
                <PulseRow
                  label="Despachos activos"
                  value={summary.data.despachosActivos}
                  total={summary.data.despachos}
                  tone="sky"
                />
                <PulseRow
                  label="Recepciones no conformes"
                  value={summary.data.recepcionesNoConformes}
                  total={summary.data.recepciones}
                  tone="rose"
                />
                <PulseRow
                  label="Stock bajo mínimo"
                  value={summary.data.stockBajo}
                  total={summary.data.productos}
                  tone="indigo"
                />
              </div>
            ) : (
              <Spinner />
            )}
          </div>
        </Card>

        <Card className="dashboard-reveal dashboard-reveal-4">
          <CardHeader title="Solicitudes por estado" subtitle="Distribución actual" />
          <div className="card-body">
            <StatePie
              data={charts.data?.solicitudes ?? []}
              emptyTitle="Sin solicitudes"
              emptyDescription="Aún no hay solicitudes registradas."
            />
          </div>
        </Card>

        <Card className="dashboard-reveal dashboard-reveal-5">
          <CardHeader title="Despachos por estado" subtitle="Flujo de distribución" />
          <div className="card-body">
            <StatePie
              data={charts.data?.despachos ?? []}
              emptyTitle="Sin despachos"
              emptyDescription="Aún no hay despachos registrados."
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card className="dashboard-reveal dashboard-reveal-4">
          <CardHeader title="Top productos despachados" subtitle="Volumen acumulado por producto" />
          <div className="card-body">
            {charts.data?.topProductos?.length ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={charts.data.topProductos}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="producto"
                      width={110}
                      tick={{ fontSize: 10, fill: '#475569' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => formatNumber(Number(value))}
                      contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Bar dataKey="cantidad" name="Cantidad" fill="#34d3ac" radius={[0, 6, 6, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="Sin datos de despacho" description="Los productos aparecerán al registrar entregas." />
            )}
          </div>
        </Card>

        <Card className="dashboard-reveal dashboard-reveal-5">
          <CardHeader title="Acciones rápidas" subtitle="Accesos según tu rol" />
          <div className="card-body">
            {quickActions.length === 0 ? (
              <EmptyState title="Sin acciones disponibles" description="Tu rol solo tiene acceso de consulta." />
            ) : (
              <div className="dashboard-actions-grid">
                {quickActions.map((action) => (
                  <Link key={action.to} to={action.to} className="dashboard-action">
                    <span className="dashboard-action-icon">{action.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="dashboard-action-title">{action.title}</span>
                      <span className="dashboard-action-copy">{action.copy}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="dashboard-alert-card dashboard-reveal dashboard-reveal-6">
        <div className="dashboard-alert-head">
          <div className="dashboard-alert-heading">
            <span className={`dashboard-alert-heading-icon ${stockAlertCount > 0 ? 'is-alert' : 'is-ok'}`}>
              {stockAlertCount > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
            </span>
            <div>
              <p className="dashboard-alert-eyebrow">Monitoreo de inventario</p>
              <h3>Alertas de stock</h3>
              <p>Productos por debajo del mínimo configurado</p>
            </div>
          </div>

          <div className="dashboard-alert-head-actions">
            <span className={`dashboard-alert-count ${stockAlertCount > 0 ? 'is-alert' : 'is-ok'}`}>
              <i /> {stockAlertCount} {stockAlertCount === 1 ? 'alerta' : 'alertas'}
            </span>
            {can('INVENTARIO', 'ver') && (
              <Link to="/inventario" className="dashboard-alert-link">
                Ver inventario <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        {alerts.error && (
          <div className="p-5">
            <ErrorAlert message={alerts.error} onRetry={alerts.reload} />
          </div>
        )}
        {alerts.loading && !alerts.data ? (
          <Spinner />
        ) : alerts.data && alerts.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Unidad</th>
                  <th className="text-right">Disponible</th>
                  <th className="text-right">Mínimo</th>
                  <th className="w-48">Cobertura</th>
                </tr>
              </thead>
              <tbody>
                {alerts.data.map((item) => {
                  const minimum = Number(item.stockMinimo) || 1;
                  const coverage = Math.min(100, Math.round((Number(item.stockDisponible) / minimum) * 100));
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="dashboard-alert-product">
                          <strong>{item.producto.nombre}</strong>
                          <span>{item.producto.codigo}</span>
                        </div>
                      </td>
                      <td className="text-xs">{item.producto.unidadMedida}</td>
                      <td className="text-right font-semibold text-rose-600">
                        {formatQuantity(item.stockDisponible)}
                      </td>
                      <td className="text-right text-xs text-slate-500">{formatQuantity(item.stockMinimo)}</td>
                      <td>
                        <div className="dashboard-alert-bar">
                          <div className="dashboard-alert-bar-track">
                            <div className="dashboard-alert-bar-fill" style={{ width: `${coverage}%` }} />
                          </div>
                          <span className="w-9 text-right text-[10px] font-bold text-rose-600">{coverage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dashboard-stock-empty">
            <div className="dashboard-stock-empty-copy">
              <span className="dashboard-stock-empty-icon">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h4>Inventario saludable</h4>
                <p>Ningún producto está por debajo del mínimo configurado.</p>
              </div>
            </div>
            <div className="dashboard-stock-empty-stats">
              <div>
                <strong>{formatNumber(summary.data?.productos ?? 0)}</strong>
                <span>Productos</span>
              </div>
              <div>
                <strong>0</strong>
                <span>Bajo mínimo</span>
              </div>
              <div>
                <strong>100%</strong>
                <span>Cobertura</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
  delay,
  compact = false,
  badge,
  to,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone: Tone;
  delay: string;
  compact?: boolean;
  badge: string;
  to?: string;
}) {
  const className = [
    'dashboard-kpi',
    `dashboard-kpi-tone-${tone}`,
    compact ? 'dashboard-kpi-compact' : '',
    'dashboard-reveal',
    delay,
    to ? 'dashboard-kpi-clickable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <div className="dashboard-kpi-head">
        <span className="dashboard-kpi-icon">{icon}</span>
        <span className="dashboard-kpi-badge">{badge}</span>
      </div>
      <p className="dashboard-kpi-label">{label}</p>
      <p className="dashboard-kpi-value">{value}</p>
      <div className="dashboard-kpi-foot">
        <p className="dashboard-kpi-hint">{hint}</p>
        {to && (
          <span className="dashboard-kpi-arrow" aria-hidden>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}

function PulseRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: 'brand' | 'amber' | 'sky' | 'rose' | 'indigo';
}) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="dashboard-pulse-row">
      <div className="dashboard-pulse-head">
        <span className="dashboard-pulse-label">{label}</span>
        <span className="dashboard-pulse-value">
          {formatNumber(value)} <span>/ {formatNumber(total)}</span>
        </span>
      </div>
      <div className="dashboard-progress">
        <span className={`dashboard-progress-${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function StatePie({
  data,
  emptyTitle,
  emptyDescription,
}: {
  data: { estado: string; total: number }[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (!data.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  const total = data.reduce((sum, item) => sum + Number(item.total), 0);
  return (
    <div>
      <div className="relative h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="estado" innerRadius={48} outerRadius={72} paddingAngle={2}>
              {data.map((entry, index) => (
                <Cell key={entry.estado} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [formatNumber(Number(value)), stateLabel(String(name))]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold tracking-tight text-slate-900">{formatNumber(total)}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</span>
        </div>
      </div>
      <div className="dashboard-chart-legend justify-center">
        {data.map((entry, index) => (
          <span key={entry.estado}>
            <i style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
            {stateLabel(entry.estado)} · {formatNumber(entry.total)}
          </span>
        ))}
      </div>
    </div>
  );
}
