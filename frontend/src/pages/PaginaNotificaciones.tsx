import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BellRing,
  Boxes,
  CheckCheck,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock,
  Route,
  Search,
  ShieldAlert,
  Truck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime, formatNumber, formatQuantity } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import { notifyBadgeRefresh, useNotifications } from '@/lib/useNotifications';
import { useAuth } from '@/store/auth';
import type { Despacho, Inventario, Notificacion } from '@/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorAlert,
  Input,
  Spinner,
} from '@/components/ui';
import {
  ModuleChips,
  ModuleHero,
  ModuleKpi,
  ModulePagination,
  usePagination,
} from '@/components/module';
import '@/styles/modules.css';
import '@/styles/notifications.css';

const TYPE_TONES: Record<string, 'brand' | 'amber' | 'red' | 'blue' | 'indigo' | 'slate'> = {
  INFO: 'blue',
  ALERTA: 'amber',
  STOCK: 'amber',
  INCIDENCIA: 'red',
  SOLICITUD: 'brand',
  DESPACHO: 'indigo',
  CONTRACTUAL: 'amber',
};

function typeIcon(tipo: string) {
  switch (tipo) {
    case 'STOCK':
      return Boxes;
    case 'DESPACHO':
      return Route;
    case 'SOLICITUD':
      return ClipboardList;
    case 'INCIDENCIA':
      return AlertTriangle;
    case 'CONTRACTUAL':
      return ShieldAlert;
    default:
      return Bell;
  }
}

export default function PaginaNotificaciones() {
  const user = useAuth((state) => state.user);
  const navigate = useNavigate();
  const { unread: globalUnread, setUnread } = useNotifications();

  const list = useApiQuery<Notificacion[]>(() => api.get('/notifications').then((r) => r.data));
  const alerts = useApiQuery<Inventario[]>(() => api.get('/dashboard/stock-alerts').then((r) => r.data));
  const assignments = useApiQuery<Despacho[]>(() => api.get('/mobile/assignments').then((r) => r.data));

  const [tab, setTab] = useState<'NOTIF' | 'ALERT' | 'ASSIGN'>('NOTIF');
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notifications = useMemo(() => list.data ?? [], [list.data]);
  const alertItems = useMemo(() => alerts.data ?? [], [alerts.data]);
  const assignmentItems = useMemo(() => assignments.data ?? [], [assignments.data]);

  const unread = notifications.filter((item) => !item.leida).length;
  const read = notifications.length - unread;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return notifications.filter((item) => {
      const matchesFilter =
        !filter || (filter === 'UNREAD' ? !item.leida : item.leida);
      const matchesTerm =
        !term ||
        item.titulo.toLowerCase().includes(term) ||
        item.mensaje.toLowerCase().includes(term) ||
        item.tipo.toLowerCase().includes(term);
      return matchesFilter && matchesTerm;
    });
  }, [notifications, filter, search]);

  const pagination = usePagination(filtered, 8, `${filter}|${search}|${tab}`);

  const syncUnread = (nextUnread: number) => {
    setUnread(nextUnread);
  };

  const markRead = async (item: Notificacion) => {
    if (item.leida) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/notifications/${item.id}/read`);
      list.setData((items) => items?.map((row) => (row.id === item.id ? { ...row, leida: true } : row)) ?? null);
      syncUnread(Math.max(0, unread - 1));
      notifyBadgeRefresh();
    } catch {
      setError('No se pudo actualizar la notificación.');
    } finally {
      setBusy(false);
    }
  };

  const markAll = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/notifications/read-all');
      list.setData((items) => items?.map((row) => ({ ...row, leida: true })) ?? null);
      syncUnread(0);
      notifyBadgeRefresh();
    } catch {
      setError('No se pudieron marcar las notificaciones.');
    } finally {
      setBusy(false);
    }
  };

  const openNotification = async (item: Notificacion) => {
    await markRead(item);
    const tipo = item.tipo.toUpperCase();
    if (tipo === 'STOCK') navigate('/inventario');
    else if (tipo === 'DESPACHO') navigate('/despachos');
    else if (tipo === 'SOLICITUD') navigate('/solicitudes');
    else if (tipo === 'CONTRACTUAL') navigate('/cumplimiento');
  };

  const filterOptions = [
    { value: '', label: 'Todas' },
    { value: 'UNREAD', label: 'Sin leer' },
    { value: 'READ', label: 'Leídas' },
  ];

  return (
    <div className="mod-page">
      <ModuleHero
        eyebrow="Actividad y alertas"
        title="Centro de notificaciones"
        description={`Bandeja de ${user?.nombre ?? 'usuario'} con alertas de stock, movimientos de despacho, solicitudes y compromisos contractuales. Prioriza lo no leído y actúa desde un solo lugar.`}
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                list.reload();
                alerts.reload();
                assignments.reload();
              }}
              className="mod-hero-button-soft"
              disabled={list.loading}
            >
              <Bell className="h-3.5 w-3.5" /> Actualizar
            </button>
            <button
              type="button"
              onClick={markAll}
              className="mod-hero-button"
              disabled={busy || unread === 0}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas leídas
            </button>
          </>
        }
      />

      {error && <ErrorAlert message={error} />}

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <ModuleKpi
          label="Sin leer"
          value={formatNumber(unread)}
          hint={`${formatNumber(globalUnread)} en toda la sesión`}
          icon={<BellRing className="h-5 w-5" />}
          tone={unread > 0 ? 'rose' : 'brand'}
          active={tab === 'NOTIF' && filter === 'UNREAD'}
          onClick={() => {
            setTab('NOTIF');
            setFilter('UNREAD');
          }}
          delay="mod-reveal-1"
        />
        <ModuleKpi
          label="Notificaciones"
          value={formatNumber(notifications.length)}
          hint={`${read} leídas · ${unread} pendientes`}
          icon={<Bell className="h-5 w-5" />}
          tone="brand"
          active={tab === 'NOTIF' && filter === ''}
          onClick={() => {
            setTab('NOTIF');
            setFilter('');
          }}
          delay="mod-reveal-2"
        />
        <ModuleKpi
          label="Alertas de stock"
          value={formatNumber(alertItems.length)}
          hint="Productos bajo mínimo"
          icon={<Boxes className="h-5 w-5" />}
          tone="amber"
          active={tab === 'ALERT'}
          onClick={() => setTab('ALERT')}
          delay="mod-reveal-3"
        />
        <ModuleKpi
          label="Asignaciones"
          value={formatNumber(assignmentItems.length)}
          hint="Rutas activas para ti"
          icon={<Truck className="h-5 w-5" />}
          tone="indigo"
          active={tab === 'ASSIGN'}
          onClick={() => setTab('ASSIGN')}
          delay="mod-reveal-4"
        />
      </div>

      <div className="mod-tabs mod-reveal mod-reveal-2">
        <button type="button" className={clsx(tab === 'NOTIF' && 'is-active')} onClick={() => setTab('NOTIF')}>
          <Bell className="h-4 w-4" /> Notificaciones
          <span className="mod-tabs-count">{notifications.length}</span>
        </button>
        <button type="button" className={clsx(tab === 'ALERT' && 'is-active')} onClick={() => setTab('ALERT')}>
          <Boxes className="h-4 w-4" /> Alertas
          <span className="mod-tabs-count">{alertItems.length}</span>
        </button>
        <button type="button" className={clsx(tab === 'ASSIGN' && 'is-active')} onClick={() => setTab('ASSIGN')}>
          <Route className="h-4 w-4" /> Asignaciones
          <span className="mod-tabs-count">{assignmentItems.length}</span>
        </button>
      </div>

      <Card className="notif-panel mod-reveal mod-reveal-2">
        <div className="mod-toolbar">
          <div className="mod-toolbar-top">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {tab === 'NOTIF'
                  ? `Notificaciones (${filtered.length})`
                  : tab === 'ALERT'
                    ? `Alertas de stock (${alertItems.length})`
                    : `Asignaciones activas (${assignmentItems.length})`}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {tab === 'NOTIF'
                  ? 'Haz clic en una notificación para abrir el módulo relacionado y marcarla como leída.'
                  : tab === 'ALERT'
                    ? 'Productos por debajo del stock mínimo configurado.'
                    : 'Despachos asignados a tu usuario para ejecución en ruta.'}
              </p>
            </div>

            {tab === 'NOTIF' && (
              <div className="mod-toolbar-controls">
                <div className="mod-search">
                  <Search className="mod-search-icon h-4 w-4" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar título, mensaje o tipo"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {tab === 'NOTIF' && (
            <ModuleChips
              filters={filterOptions}
              value={filter}
              onChange={setFilter}
              counts={{ '': notifications.length, UNREAD: unread, READ: read }}
              ariaLabel="Filtrar notificaciones"
            />
          )}
        </div>

        {list.error && (
          <div className="p-5">
            <ErrorAlert message={list.error} onRetry={list.reload} />
          </div>
        )}
        {alerts.error && tab === 'ALERT' && (
          <div className="p-5">
            <ErrorAlert message={alerts.error} onRetry={alerts.reload} />
          </div>
        )}
        {assignments.error && tab === 'ASSIGN' && (
          <div className="p-5">
            <ErrorAlert message={assignments.error} onRetry={assignments.reload} />
          </div>
        )}

        {tab === 'NOTIF' ? (
          list.loading && !list.data ? (
            <Spinner />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Sin notificaciones"
              description="Las alertas de stock, despachos y cumplimiento aparecerán aquí."
            />
          ) : (
            <div className="notif-list">
              {pagination.pageItems.map((item) => {
                const Icon = typeIcon(item.tipo);
                return (
                  <article
                    key={item.id}
                    className={clsx('notif-item', !item.leida && 'is-unread')}
                  >
                    <span className={clsx('notif-icon', `is-${TYPE_TONES[item.tipo] ?? 'slate'}`)}>
                      <Icon className="h-4 w-4" />
                    </span>

                    <div className="notif-copy">
                      <div className="notif-head">
                        <p>{item.titulo}</p>
                        <Badge tone={TYPE_TONES[item.tipo] ?? 'slate'}>{item.tipo}</Badge>
                        {!item.leida && <span className="notif-dot" aria-label="Sin leer" />}
                      </div>
                      <p className="notif-message">{item.mensaje}</p>
                      <div className="notif-meta">
                        <span><Clock className="h-3 w-3" /> {formatDateTime(item.fecha)}</span>
                        {item.rolDestino && <span>{item.rolDestino}</span>}
                      </div>
                    </div>

                    <div className="notif-actions">
                      {!item.leida && (
                        <button
                          type="button"
                          className="notif-mark"
                          disabled={busy}
                          onClick={() => markRead(item)}
                        >
                          <Circle className="h-3 w-3" /> Marcar leída
                        </button>
                      )}
                      <button
                        type="button"
                        className="notif-open"
                        aria-label="Abrir notificación"
                        onClick={() => openNotification(item)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : tab === 'ALERT' ? (
          alerts.loading && !alerts.data ? (
            <Spinner />
          ) : alertItems.length === 0 ? (
            <EmptyState
              title="Sin alertas de stock"
              description="Todos los productos están por encima del mínimo configurado."
            />
          ) : (
            <div className="notif-list">
              {alertItems.map((item) => {
                const available = Number(item.stockDisponible);
                const minimum = Number(item.stockMinimo);
                const ratio = minimum > 0 ? Math.min(100, Math.round((available / minimum) * 100)) : 0;
                return (
                  <article key={item.id} className="notif-item is-unread">
                    <span className="notif-icon is-amber">
                      <Boxes className="h-4 w-4" />
                    </span>
                    <div className="notif-copy">
                      <div className="notif-head">
                        <p>{item.producto.nombre}</p>
                        <Badge tone="amber">Reponer</Badge>
                      </div>
                      <p className="notif-message">
                        Disponible {formatQuantity(item.stockDisponible)} · mínimo {formatQuantity(item.stockMinimo)} {item.producto.unidadMedida}
                      </p>
                      <div className="notif-stock">
                        <div className="notif-stock-bar">
                          <span style={{ width: `${ratio}%` }} />
                        </div>
                        <strong>{ratio}%</strong>
                      </div>
                    </div>
                    <div className="notif-actions">
                      <button type="button" className="notif-open" onClick={() => navigate('/inventario')}>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : assignments.loading && !assignments.data ? (
          <Spinner />
        ) : assignmentItems.length === 0 ? (
          <EmptyState
            title="Sin asignaciones activas"
            description="Cuando la jefatura te asigne un despacho, aparecerá en este centro."
          />
        ) : (
          <div className="notif-list">
            {assignmentItems.map((item) => (
              <article key={item.id} className="notif-item">
                <span className="notif-icon is-indigo">
                  <Route className="h-4 w-4" />
                </span>
                <div className="notif-copy">
                  <div className="notif-head">
                    <p>{item.codigo} · {item.entidad.razonSocial}</p>
                    <Badge tone={item.estado === 'EN_RUTA' ? 'amber' : 'indigo'}>
                      {item.estado.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                  <p className="notif-message">{item.puntoEntrega.nombre} · {item.puntoEntrega.direccion ?? 'Sin dirección'}</p>
                  <div className="notif-meta">
                    <span>{formatNumber(item.detalles.length)} productos</span>
                    <span>
                      {formatQuantity(
                        item.detalles.reduce((sum, det) => sum + Number(det.cantidadComprometida), 0),
                      )} unidades
                    </span>
                  </div>
                </div>
                <div className="notif-actions">
                  <button type="button" className="notif-open" onClick={() => navigate('/ruta-movil')}>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {tab === 'NOTIF' && (
          <ModulePagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            total={pagination.total}
            from={pagination.from}
            to={pagination.to}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
          />
        )}
      </Card>

      <div className="mod-callout">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <span>
          Las notificaciones se generan automáticamente por el sistema. Úsalas como alerta temprana;
          la decisión operativa final corresponde al responsable del módulo.
        </span>
      </div>
    </div>
  );
}
