import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clsx from 'clsx';
import {
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Eye,
  LayoutGrid,
  List,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { toastSuccess } from '@/lib/toasts';
import { useMasterCatalogs, fetchPoints } from '@/lib/catalogs';
import { formatDateTime, formatNumber, formatQuantity } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import type { EstadoSolicitud, PuntoEntrega, SolicitudMaterial } from '@/types';
import {
  Button,
  Card,
  EmptyState,
  ErrorAlert,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from '@/components/ui';
import { ModulePagination, usePagination } from '@/components/module';
import { FormGrid, FormHero, FormNote, FormSection, FormStats, FormTag } from '@/components/FormKit';
import '@/styles/requests.css';
import '@/styles/modules.css';

const schema = z.object({
  entidadId: z.coerce.number().int().positive('Seleccione una entidad'),
  puntoEntregaId: z.coerce.number().int().positive('Seleccione un punto de entrega'),
  justificacion: z.string().min(10, 'Describa la justificación (mínimo 10 caracteres)'),
  items: z
    .array(
      z.object({
        productoId: z.coerce.number().int().positive('Seleccione un producto'),
        cantidad: z.coerce.number().positive('La cantidad debe ser mayor a cero'),
      }),
    )
    .min(1, 'Agregue al menos un producto'),
});

type RequestForm = z.infer<typeof schema>;
type RequestFormInput = z.input<typeof schema>;
type ViewMode = 'table' | 'grid';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'EN_REVISION', label: 'En revisión' },
  { value: 'PENDIENTE_DESPACHO', label: 'Aprobadas' },
  { value: 'PARCIALMENTE_ATENDIDA', label: 'Parciales' },
  { value: 'DESPACHADA', label: 'Despachadas' },
  { value: 'RECHAZADA', label: 'Rechazadas' },
];

export default function PaginaSolicitudes() {
  const user = useAuth((state) => state.user);
  const can = useAuth((state) => state.can);
  const canCreate = can('SOLICITUDES', 'crear');
  const canManage = can('SOLICITUDES', 'editar');

  const list = useApiQuery<SolicitudMaterial[]>(() => api.get('/requests').then((r) => r.data));
  const { entities, products } = useMasterCatalogs();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = useState<ViewMode>('table');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<SolicitudMaterial | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const data = useMemo(() => list.data ?? [], [list.data]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { '': data.length };
    for (const filter of STATUS_FILTERS) {
      if (!filter.value) continue;
      map[filter.value] = data.filter((item) => item.estado === filter.value).length;
    }
    return map;
  }, [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((item) => {
      const matchesStatus = !status || item.estado === status;
      const matchesTerm =
        !term ||
        item.codigo.toLowerCase().includes(term) ||
        item.entidad.razonSocial.toLowerCase().includes(term) ||
        item.puntoEntrega.nombre.toLowerCase().includes(term) ||
        item.justificacion.toLowerCase().includes(term) ||
        `${item.solicitante.nombres} ${item.solicitante.apellidos}`.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [data, search, status]);

  const pagination = usePagination(filtered, 8, `${search}|${status}|${view}`);

  const totalUnits = useMemo(
    () =>
      data.reduce(
        (sum, item) =>
          sum + (item.detalles ?? []).reduce((inner, det) => inner + Number(det.cantidadSolicitada), 0),
        0,
      ),
    [data],
  );

  const notify = (message: string) => {
    toastSuccess(message);
  };

  const openDetail = (item: SolicitudMaterial) => {
    setSelected(item);
    setDetailOpen(true);
    setRejectOpen(false);
    setMotivo('');
    setActionError(null);
  };

  const runAction = async (action: () => Promise<SolicitudMaterial>, message: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await action();
      setSelected(updated);
      list.reload();
      setRejectOpen(false);
      setMotivo('');
      notify(message);
    } catch (error) {
      setActionError(apiErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const toggleStatusFilter = (next: string) => {
    setStatus((current) => (current === next ? '' : next));
  };

  return (
    <div className="requests-page">
      <section className="requests-hero requests-reveal">
        <div className="requests-hero-content">
          <div>
            <p className="requests-eyebrow">
              <span className="requests-live-dot" /> Abastecimiento y reservas
            </p>
            <h1 className="requests-title">Solicitudes de material</h1>
            <p className="requests-sub">
              Registro y aprobación de requerimientos operativos. Al aprobar una solicitud, el
              sistema reserva automáticamente el stock disponible para su despacho.
            </p>
          </div>
          <div className="requests-hero-actions">
            <button
              type="button"
              onClick={list.reload}
              className="requests-hero-button-soft"
              disabled={list.loading}
            >
              <RefreshCw className={clsx('h-3.5 w-3.5', list.loading && 'animate-spin')} /> Actualizar
            </button>
            {canCreate && (
              <button type="button" onClick={() => setCreateOpen(true)} className="requests-hero-button">
                <Plus className="h-3.5 w-3.5" /> Nueva solicitud
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiFilterCard
          label="Solicitudes"
          value={formatNumber(data.length)}
          hint={`${formatQuantity(totalUnits)} unidades solicitadas`}
          icon={<ClipboardList className="h-5 w-5" />}
          tone="brand"
          active={status === ''}
          onClick={() => setStatus('')}
          delay="requests-reveal-1"
        />
        <KpiFilterCard
          label="En revisión"
          value={formatNumber(counts.EN_REVISION ?? 0)}
          hint="Esperando decisión de jefatura"
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
          active={status === 'EN_REVISION'}
          onClick={() => toggleStatusFilter('EN_REVISION')}
          delay="requests-reveal-2"
        />
        <KpiFilterCard
          label="Pendientes de despacho"
          value={formatNumber(counts.PENDIENTE_DESPACHO ?? 0)}
          hint="Aprobadas con stock reservado"
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="sky"
          active={status === 'PENDIENTE_DESPACHO'}
          onClick={() => toggleStatusFilter('PENDIENTE_DESPACHO')}
          delay="requests-reveal-3"
        />
        <KpiFilterCard
          label="Despachadas"
          value={formatNumber((counts.DESPACHADA ?? 0) + (counts.PARCIALMENTE_ATENDIDA ?? 0))}
          hint={`${formatNumber(counts.PENDIENTE ?? 0)} en borrador`}
          icon={<Package className="h-5 w-5" />}
          tone="indigo"
          active={status === 'DESPACHADA'}
          onClick={() => toggleStatusFilter('DESPACHADA')}
          delay="requests-reveal-4"
        />
      </div>

      <Card className="requests-reveal requests-reveal-2">
        <div className="requests-toolbar">
          <div className="requests-toolbar-top">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Bandeja de solicitudes ({filtered.length})
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Haz clic en cualquier solicitud para revisar el detalle o ejecutar acciones.
              </p>
            </div>

            <div className="requests-toolbar-controls">
              <div className="requests-search">
                <Search className="requests-search-icon h-4 w-4" />
                <Input
                  className="pl-9"
                  placeholder="Buscar código, entidad, punto o solicitante"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="requests-view-toggle" role="group" aria-label="Modo de visualización">
                <button
                  type="button"
                  className={clsx(view === 'table' && 'is-active')}
                  onClick={() => setView('table')}
                >
                  <List className="h-3.5 w-3.5" /> Tabla
                </button>
                <button
                  type="button"
                  className={clsx(view === 'grid' && 'is-active')}
                  onClick={() => setView('grid')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Tarjetas
                </button>
              </div>
            </div>
          </div>

          <div className="requests-chips" role="tablist" aria-label="Filtrar por estado">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value || 'ALL'}
                type="button"
                role="tab"
                aria-selected={status === filter.value}
                className={clsx('requests-chip', status === filter.value && 'is-active')}
                onClick={() => setStatus(filter.value)}
              >
                {filter.label}
                <span className="requests-chip-count">{counts[filter.value] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {list.error && (
          <div className="p-5">
            <ErrorAlert message={list.error} onRetry={list.reload} />
          </div>
        )}

        {list.loading && !list.data ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Sin solicitudes"
            description={
              data.length
                ? 'Ningún registro coincide con los filtros actuales.'
                : 'Cree la primera solicitud de material.'
            }
            action={
              canCreate && (
                <Button variant="soft" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> Nueva solicitud
                </Button>
              )
            }
          />
        ) : view === 'grid' ? (
          <div className="requests-grid">
            {pagination.pageItems.map((item) => {
              const qty = (item.detalles ?? []).reduce((sum, det) => sum + Number(det.cantidadSolicitada), 0);
              const approved = (item.detalles ?? []).reduce((sum, det) => sum + Number(det.cantidadAprobada), 0);
              return (
                <button
                  key={item.id}
                  type="button"
                  className="requests-card"
                  onClick={() => openDetail(item)}
                >
                  <div>
                    <div className="requests-card-top">
                      <span className="requests-code">{item.codigo}</span>
                      <StatusBadge estado={item.estado} />
                    </div>
                    <p className="requests-card-entity">{item.entidad.razonSocial}</p>
                    <p className="requests-card-point">{item.puntoEntrega.nombre}</p>
                    <p className="requests-card-quote mt-3">{item.justificacion}</p>
                  </div>

                  <div>
                    <div className="requests-card-metrics">
                      <div>
                        <span>Ítems</span>
                        <strong>{item.detalles?.length ?? 0} productos</strong>
                      </div>
                      <div>
                        <span>Cantidad</span>
                        <strong>
                          {formatQuantity(qty)} {approved > 0 ? `(${formatQuantity(approved)} aprob.)` : ''}
                        </strong>
                      </div>
                    </div>
                    <div className="requests-card-footer mt-3">
                      <span className="requests-user">
                        <span className="requests-avatar">
                          {item.solicitante.nombres.slice(0, 1)}
                          {item.solicitante.apellidos.slice(0, 1)}
                        </span>
                        <span className="truncate">
                          {item.solicitante.nombres} {item.solicitante.apellidos}
                        </span>
                      </span>
                      <span className="whitespace-nowrap">{formatDateTime(item.fechaSolicitud)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Entidad / punto</th>
                  <th>Solicitante</th>
                  <th>Fecha</th>
                  <th className="text-center">Ítems</th>
                  <th className="text-right">Cantidad</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((item) => (
                  <tr
                    key={item.id}
                    className="requests-row"
                    onClick={() => openDetail(item)}
                  >
                    <td>
                      <span className="requests-code">{item.codigo}</span>
                    </td>
                    <td>
                      <p className="font-semibold text-slate-800">{item.entidad.razonSocial}</p>
                      <p className="text-xs text-slate-400">{item.puntoEntrega.nombre}</p>
                    </td>
                    <td className="text-xs">
                      <span className="requests-user">
                        <span className="requests-avatar">
                          {item.solicitante.nombres.slice(0, 1)}
                          {item.solicitante.apellidos.slice(0, 1)}
                        </span>
                        <span>
                          {item.solicitante.nombres} {item.solicitante.apellidos}
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-xs">{formatDateTime(item.fechaSolicitud)}</td>
                    <td className="text-center font-semibold">{item.detalles?.length ?? 0}</td>
                    <td className="text-right font-semibold">
                      {formatQuantity(
                        (item.detalles ?? []).reduce((sum, det) => sum + Number(det.cantidadSolicitada), 0),
                      )}
                    </td>
                    <td>
                      <StatusBadge estado={item.estado} />
                    </td>
                    <td className="text-right" onClick={(event) => event.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => openDetail(item)}>
                        <Eye className="h-4 w-4" /> Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ModulePagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          total={pagination.total}
          from={pagination.from}
          to={pagination.to}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setPage}
        />
      </Card>

      <CreateRequestModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        entities={entities.data ?? []}
        products={products.data ?? []}
        onCreated={() => {
          setCreateOpen(false);
          list.reload();
          notify('Solicitud registrada correctamente.');
        }}
      />

      <Modal
        open={detailOpen}
        title={selected ? `Solicitud ${selected.codigo}` : 'Solicitud'}
        onClose={() => setDetailOpen(false)}
        size="lg"
        footer={
          selected && (
            <>
              {selected.estado === 'PENDIENTE' && canCreate && (
                <Button
                  loading={actionLoading}
                  onClick={() =>
                    runAction(
                      () => api.post(`/requests/${selected.id}/submit`).then((r) => r.data),
                      'Solicitud enviada a revisión.',
                    )
                  }
                >
                  <Send className="h-4 w-4" /> Enviar a revisión
                </Button>
              )}
              {selected.estado === 'EN_REVISION' && canManage && (
                <>
                  <Button variant="danger" onClick={() => setRejectOpen(true)} disabled={actionLoading}>
                    <X className="h-4 w-4" /> Rechazar
                  </Button>
                  <Button
                    loading={actionLoading}
                    onClick={() =>
                      runAction(
                        () => api.post(`/requests/${selected.id}/approve`).then((r) => r.data),
                        'Solicitud aprobada y stock reservado.',
                      )
                    }
                  >
                    <Check className="h-4 w-4" /> Aprobar y reservar
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge estado={selected.estado} />
              <span className="text-xs text-slate-400">
                Registrada {formatDateTime(selected.fechaSolicitud)}
              </span>
            </div>

            <RequestStepper estado={selected.estado} />

            {actionError && <ErrorAlert message={actionError} />}

            <dl className="requests-detail-grid">
              <div className="requests-detail-tile">
                <dt>
                  <Building2 className="h-3.5 w-3.5" /> Entidad
                </dt>
                <dd>{selected.entidad.razonSocial}</dd>
              </div>
              <div className="requests-detail-tile">
                <dt>
                  <MapPin className="h-3.5 w-3.5" /> Punto de entrega
                </dt>
                <dd>{selected.puntoEntrega.nombre}</dd>
              </div>
              <div className="requests-detail-tile">
                <dt>
                  <UserRound className="h-3.5 w-3.5" /> Solicitante
                </dt>
                <dd>
                  {selected.solicitante.nombres} {selected.solicitante.apellidos}
                </dd>
              </div>
              <div className="requests-detail-tile">
                <dt>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Aprobación
                </dt>
                <dd>
                  {selected.aprobadoPor
                    ? `${selected.aprobadoPor.nombres} ${selected.aprobadoPor.apellidos} · ${formatDateTime(selected.fechaAprobacion)}`
                    : 'Pendiente de resolución'}
                </dd>
              </div>
              <div className="requests-detail-tile sm:col-span-2">
                <dt>Justificación</dt>
                <dd className="font-medium">{selected.justificacion}</dd>
              </div>
              {selected.motivoRechazo && (
                <div className="requests-detail-tile sm:col-span-2">
                  <dt className="text-rose-600">Motivo de rechazo</dt>
                  <dd className="text-rose-600">{selected.motivoRechazo}</dd>
                </div>
              )}
            </dl>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="text-right">Solicitado</th>
                    <th className="text-right">Aprobado</th>
                    <th className="text-right">Despachado</th>
                    <th>Atención</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.detalles.map((det) => {
                    const base = Number(det.cantidadAprobada) || Number(det.cantidadSolicitada) || 1;
                    const pct = Math.min(100, Math.round((Number(det.cantidadDespachada) / base) * 100));
                    return (
                      <tr key={det.id}>
                        <td>
                          <p className="font-semibold text-slate-800">{det.producto.nombre}</p>
                          <p className="text-xs text-slate-400">
                            {det.producto.codigo} · {det.producto.unidadMedida}
                          </p>
                        </td>
                        <td className="text-right">{formatQuantity(det.cantidadSolicitada)}</td>
                        <td className="text-right font-semibold">{formatQuantity(det.cantidadAprobada)}</td>
                        <td className="text-right">{formatQuantity(det.cantidadDespachada)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="requests-item-bar">
                              <span style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {rejectOpen && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <Field label="Motivo de rechazo">
                  <Textarea
                    value={motivo}
                    onChange={(event) => setMotivo(event.target.value)}
                    placeholder="Detalle el motivo"
                  />
                </Field>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setRejectOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={actionLoading}
                    disabled={motivo.trim().length < 3}
                    onClick={() =>
                      runAction(
                        () => api.post(`/requests/${selected.id}/reject`, { motivo }).then((r) => r.data),
                        'Solicitud rechazada.',
                      )
                    }
                  >
                    Confirmar rechazo
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400">
              {selected.estado === 'EN_REVISION' && selected.solicitante.id === user?.id
                ? 'El solicitante no puede aprobar su propia solicitud; otro usuario con rol de jefatura debe hacerlo.'
                : 'La aprobación reserva stock del inventario central y habilita el despacho.'}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* --------------------------------------------------------------- Components */

function KpiFilterCard({
  label,
  value,
  hint,
  icon,
  tone,
  active,
  onClick,
  delay,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone: 'brand' | 'amber' | 'sky' | 'indigo';
  active: boolean;
  onClick: () => void;
  delay: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        `requests-kpi requests-kpi-tone-${tone} requests-reveal ${delay}`,
        active && 'is-active',
      )}
    >
      <div className="requests-kpi-icon">{icon}</div>
      <p className="requests-kpi-label">{label}</p>
      <p className="requests-kpi-value">{value}</p>
      <p className="requests-kpi-hint">{hint}</p>
    </button>
  );
}

function RequestStepper({ estado }: { estado: EstadoSolicitud }) {
  if (estado === 'RECHAZADA') {
    return (
      <div className="requests-stepper">
        <div className="requests-step is-done">
          <span className="requests-step-dot">1</span>
          <span className="requests-step-label">Borrador</span>
        </div>
        <div className="requests-step is-done">
          <span className="requests-step-dot">2</span>
          <span className="requests-step-label">En revisión</span>
        </div>
        <div className="requests-step is-rejected sm:col-span-2">
          <span className="requests-step-dot">×</span>
          <span className="requests-step-label">Solicitud rechazada</span>
        </div>
      </div>
    );
  }

  const steps: { key: EstadoSolicitud[]; label: string }[] = [
    { key: ['PENDIENTE'], label: 'Borrador' },
    { key: ['EN_REVISION'], label: 'Revisión' },
    { key: ['APROBADA', 'PENDIENTE_DESPACHO', 'PARCIALMENTE_ATENDIDA'], label: 'Reserva y despacho' },
    { key: ['DESPACHADA'], label: 'Atendida' },
  ];

  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.key.includes(estado)),
  );

  return (
    <div className="requests-stepper">
      {steps.map((step, index) => {
        const done = index < currentIndex || estado === 'DESPACHADA';
        const current = index === currentIndex && estado !== 'DESPACHADA';
        return (
          <div
            key={step.label}
            className={clsx('requests-step', done && 'is-done', current && 'is-current')}
          >
            <span className="requests-step-dot">{done ? '✓' : index + 1}</span>
            <span className="requests-step-label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function CreateRequestModal({
  open,
  onClose,
  entities,
  products,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  entities: { id: number; razonSocial: string }[];
  products: { id: number; nombre: string; codigo: string; unidadMedida: string }[];
  onCreated: () => void;
}) {
  const [points, setPoints] = useState<PuntoEntrega[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RequestFormInput, unknown, RequestForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      entidadId: 0,
      puntoEntregaId: 0,
      justificacion: '',
      items: [{ productoId: 0, cantidad: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const entityId = watch('entidadId');
  const watchedItems = watch('items');

  const totalUnits = useMemo(
    () =>
      (watchedItems ?? []).reduce((sum, item) => sum + (Number(item?.cantidad) || 0), 0),
    [watchedItems],
  );

  useEffect(() => {
    if (!open) return;
    reset({
      entidadId: entities[0]?.id ?? 0,
      puntoEntregaId: 0,
      justificacion: '',
      items: [{ productoId: products[0]?.id ?? 0, cantidad: 1 }],
    });
    setServerError(null);
  }, [open, entities, products, reset]);

  useEffect(() => {
    if (!entityId) {
      setPoints([]);
      return;
    }
    fetchPoints(Number(entityId)).then(setPoints).catch(() => setPoints([]));
  }, [entityId]);

  const onSubmit = async (values: RequestForm) => {
    setServerError(null);
    try {
      await api.post('/requests', values);
      onCreated();
    } catch (error) {
      setServerError(apiErrorMessage(error));
    }
  };

  const pointId = watch('puntoEntregaId');
  const justificacion = watch('justificacion') ?? '';
  const selectedEntity = entities.find((entity) => entity.id === Number(entityId));
  const selectedPoint = points.find((point) => point.id === Number(pointId));

  return (
    <Modal
      open={open}
      title="Nueva solicitud de material"
      subtitle="Define el destino, sustenta la necesidad y agrega los productos."
      icon={<ClipboardList className="h-4 w-4" />}
      tone="brand"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="request-form" loading={isSubmitting}>
            <ClipboardList className="h-4 w-4" /> Registrar solicitud
          </Button>
        </>
      }
    >
      <form id="request-form" onSubmit={handleSubmit(onSubmit)} className="fk-form" noValidate>
        {serverError && <ErrorAlert message={serverError} />}

        <FormHero
          tone="brand"
          icon={<ClipboardList className="h-6 w-6" />}
          eyebrow={<><Send className="h-3 w-3" /> Requerimiento operativo</>}
          title={selectedEntity?.razonSocial ?? 'Requerimiento de material'}
          subtitle={selectedPoint?.nombre ?? 'Selecciona la entidad y el punto de entrega'}
          tags={
            <>
              <FormTag icon={<Package className="h-3 w-3" />} tone="ok">
                {fields.length} {fields.length === 1 ? 'producto' : 'productos'}
              </FormTag>
              <FormTag>{formatQuantity(totalUnits)} unidades</FormTag>
              {selectedPoint && <FormTag icon={<MapPin className="h-3 w-3" />}>{selectedPoint.nombre}</FormTag>}
            </>
          }
          aside={
            <FormStats
              items={[
                { label: 'Productos', value: fields.length },
                { label: 'Unidades', value: formatQuantity(totalUnits) },
                { label: 'Puntos', value: selectedPoint ? 1 : 0 },
              ]}
            />
          }
        />

        <FormSection
          icon={<MapPin className="h-4 w-4" />}
          title="Destino de la entrega"
          description="Entidad pública y punto donde se recibirá el material"
        >
          <FormGrid>
            <Field label="Entidad pública" error={errors.entidadId?.message}>
              <Select {...register('entidadId')}>
                <option value={0}>Seleccione entidad</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.razonSocial}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Punto de entrega" error={errors.puntoEntregaId?.message}>
              <Select {...register('puntoEntregaId')}>
                <option value={0}>Seleccione punto</option>
                {points.map((point) => (
                  <option key={point.id} value={point.id}>
                    {point.nombre}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
        </FormSection>

        <FormSection
          icon={<ClipboardCheck className="h-4 w-4" />}
          title="Justificación"
          description="Detalle la necesidad operativa del punto de entrega"
        >
          <Field label="Motivo de la solicitud" error={errors.justificacion?.message}>
            <Textarea
              placeholder="Detalle la necesidad operativa, el área solicitante y el uso previsto del material"
              {...register('justificacion')}
            />
          </Field>
        </FormSection>

        <FormSection
          icon={<Package className="h-4 w-4" />}
          title="Productos solicitados"
          description="Agrega cada producto y la cantidad requerida"
          actions={
            <Button
              type="button"
              variant="soft"
              size="sm"
              onClick={() => append({ productoId: products[0]?.id ?? 0, cantidad: 1 })}
            >
              <Plus className="h-3.5 w-3.5" /> Agregar producto
            </Button>
          }
        >
          {errors.items?.message && <p className="cu-error">{errors.items.message}</p>}
          <div className="fk-items">
            {fields.map((field, index) => (
              <div key={field.id} className="fk-item">
                <span className="fk-item-index">{index + 1}</span>
                <div className="fk-item-fields">
                  <Field label={`Producto ${index + 1}`} error={errors.items?.[index]?.productoId?.message}>
                    <Select {...register(`items.${index}.productoId` as const)}>
                      <option value={0}>Seleccione producto</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.codigo} - {product.nombre} ({product.unidadMedida})
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Cantidad" error={errors.items?.[index]?.cantidad?.message}>
                    <Input
                      type="number"
                      min={0.001}
                      step="0.001"
                      {...register(`items.${index}.cantidad` as const)}
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  className="fk-item-remove"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  aria-label={`Quitar producto ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </FormSection>

        <FormNote icon={<ClipboardCheck className="h-3.5 w-3.5" />} tone="warn">
          {justificacion
            ? 'La solicitud será evaluada por logística. Verifica cantidades y punto de entrega antes de registrar.'
            : 'La solicitud será evaluada por logística. Recuerda justificar la necesidad operativa.'}
        </FormNote>
      </form>
    </Modal>
  );
}
