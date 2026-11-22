import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clsx from 'clsx';
import {
  BadgeDollarSign,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  Package,
  Plus,
  RefreshCcw,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { toastSuccess } from '@/lib/toasts';
import { formatDateTime, formatMoney, formatNumber, formatQuantity } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import type { Producto, SolicitudReposicion } from '@/types';
import {
  Button,
  Card,
  DetailRow,
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
import { ModuleChips, ModulePagination, ModuleViewToggle, usePagination, useResponsiveView } from '@/components/module';
import { FormGrid, FormHero, FormNote, FormSection, FormStats, FormTag } from '@/components/FormKit';
import { FilterDrawer } from '@/components/FilterDrawer';
import { SortableTh, useTableSort } from '@/components/sortable';
import '@/styles/modules.css';

const schema = z.object({
  justificacion: z.string().min(10, 'Describa la justificación (mínimo 10 caracteres)'),
  montoEstimado: z.coerce.number().nonnegative().optional(),
  referenciaPresupuesto: z.string().optional(),
  proveedorSugerido: z.string().optional(),
  items: z
    .array(
      z.object({
        productoId: z.coerce.number().int().positive('Seleccione un producto'),
        cantidad: z.coerce.number().positive('La cantidad debe ser mayor a cero'),
        observacion: z.string().optional(),
      }),
    )
    .min(1, 'Agregue al menos un producto'),
});

type ReplenishmentForm = z.infer<typeof schema>;
type ReplenishmentFormInput = z.input<typeof schema>;

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'BORRADOR', label: 'Borradores' },
  { value: 'PENDIENTE_APROBACION', label: 'Pendientes' },
  { value: 'APROBADA', label: 'Aprobadas' },
  { value: 'RECHAZADA', label: 'Rechazadas' },
  { value: 'ATENDIDA', label: 'Atendidas' },
];

export default function PaginaReposiciones() {
  const can = useAuth((state) => state.can);
  const canCreate = can('REPOSICIONES', 'crear');
  const canApprove = can('REPOSICIONES', 'editar');

  const list = useApiQuery<SolicitudReposicion[]>(() => api.get('/replenishments').then((r) => r.data));
  const products = useApiQuery<Producto[]>(() => api.get('/products').then((r) => r.data));

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = useResponsiveView('table');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<SolicitudReposicion | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
        item.justificacion.toLowerCase().includes(term) ||
        `${item.solicitante.nombres} ${item.solicitante.apellidos}`.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [data, search, status]);

  const sorting = useTableSort(filtered, {
    codigo: (item) => item.codigo,
    justificacion: (item) => item.justificacion,
    solicitante: (item) => `${item.solicitante.nombres} ${item.solicitante.apellidos}`,
    fecha: (item) => new Date(item.fechaSolicitud).getTime(),
    monto: (item) => Number(item.montoEstimado ?? 0),
    estado: (item) => item.estado,
  });
  const pagination = usePagination(
    sorting.rows,
    8,
    `${search}|${status}|${view}|${sorting.sort?.key ?? ''}|${sorting.sort?.dir ?? ''}`,
  );

  const notify = (message: string) => {
    toastSuccess(message);
  };

  const openDetail = (item: SolicitudReposicion) => {
    setSelected(item);
    setRejectOpen(false);
    setMotivo('');
    setActionError(null);
  };

  const runAction = async (path: string, body?: unknown, message?: string) => {
    if (!selected) return;
    setBusy(true);
    setActionError(null);
    try {
      const { data: updated } = await api.post<SolicitudReposicion>(
        `/replenishments/${selected.id}${path}`,
        body,
      );
      setSelected(updated);
      setRejectOpen(false);
      setMotivo('');
      list.reload();
      if (message) notify(message);
    } catch (error) {
      setActionError(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mod-page">
      <section className="mod-hero mod-reveal">
        <div className="mod-hero-content">
          <div>
            <p className="mod-eyebrow">
              <span className="mod-live-dot" /> Compras y reposición
            </p>
            <h1 className="mod-title">Reposiciones de stock</h1>
            <p className="mod-sub">
              Solicitudes internas de compra o reposición. Al aprobar, se registra la referencia y
              queda lista para su atención y posterior ingreso al inventario.
            </p>
          </div>
          <div className="mod-hero-actions">
            <button
              type="button"
              onClick={list.reload}
              className="mod-hero-button-soft"
              disabled={list.loading}
            >
              <RefreshCcw className={clsx('h-3.5 w-3.5', list.loading && 'animate-spin')} /> Actualizar
            </button>
            {canCreate && (
              <button type="button" onClick={() => setCreateOpen(true)} className="mod-hero-button">
                <Plus className="h-3.5 w-3.5" /> Nueva reposición
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <KpiCard
          label="Total"
          value={formatNumber(data.length)}
          hint="Reposiciones registradas"
          icon={<Package className="h-5 w-5" />}
          tone="brand"
          active={status === ''}
          onClick={() => setStatus('')}
          delay="mod-reveal-1"
        />
        <KpiCard
          label="Pendientes"
          value={formatNumber(counts.PENDIENTE_APROBACION ?? 0)}
          hint="Esperando aprobación"
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
          active={status === 'PENDIENTE_APROBACION'}
          onClick={() => setStatus(status === 'PENDIENTE_APROBACION' ? '' : 'PENDIENTE_APROBACION')}
          delay="mod-reveal-2"
        />
        <KpiCard
          label="Aprobadas"
          value={formatNumber(counts.APROBADA ?? 0)}
          hint="Listas para atención"
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="sky"
          active={status === 'APROBADA'}
          onClick={() => setStatus(status === 'APROBADA' ? '' : 'APROBADA')}
          delay="mod-reveal-3"
        />
        <KpiCard
          label="Atendidas"
          value={formatNumber(counts.ATENDIDA ?? 0)}
          hint="Compras concluidas"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="indigo"
          active={status === 'ATENDIDA'}
          onClick={() => setStatus(status === 'ATENDIDA' ? '' : 'ATENDIDA')}
          delay="mod-reveal-4"
        />
      </div>

      <Card className="mod-reveal mod-reveal-2">
        <div className="mod-toolbar">
          <div className="mod-toolbar-top">
            <div>
              <h3 className="text-base font-bold text-slate-800">Bandeja de reposiciones ({filtered.length})</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Haz clic en cualquier registro para revisar el detalle o ejecutar acciones.
              </p>
            </div>

            <div className="mod-toolbar-controls">
              <button
                type="button"
                className="btn btn-secondary btn-sm sm:hidden"
                onClick={() => setFiltersOpen(true)}
                aria-label="Abrir filtros de reposiciones"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros
                {status && <span className="rounded-full bg-brand-700 px-1.5 text-[10px] text-white">1</span>}
              </button>
              <div className="mod-search">
                <Search className="mod-search-icon h-4 w-4" />
                <Input
                  className="pl-9"
                  placeholder="Buscar código, justificación o solicitante"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <ModuleViewToggle value={view} onChange={setView} />
            </div>
          </div>

          <div className="hidden sm:block">
            <ModuleChips
              filters={STATUS_FILTERS}
              value={status}
              onChange={setStatus}
              counts={counts}
              ariaLabel="Filtrar por estado"
            />
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
            title="Sin reposiciones"
            description="Registre una solicitud cuando el stock disponible no cubra la operación."
            action={
              canCreate && (
                <Button variant="soft" onClick={() => setCreateOpen(true)}>
                  <RefreshCcw className="h-4 w-4" /> Nueva reposición
                </Button>
              )
            }
          />
        ) : view === 'grid' ? (
          <div className="mod-grid">
            {pagination.pageItems.map((item) => (
              <button key={item.id} type="button" className="mod-card" onClick={() => openDetail(item)}>
                <div>
                  <div className="mod-card-top">
                    <span className="mod-code">{item.codigo}</span>
                    <StatusBadge estado={item.estado} />
                  </div>
                  <p className="mod-card-title">{item.solicitante.nombres} {item.solicitante.apellidos}</p>
                  <p className="mod-card-sub">{item.justificacion}</p>
                </div>
                <div>
                  <div className="mod-card-metrics">
                    <div>
                      <span>Ítems</span>
                      <strong>{item.detalles.length} productos</strong>
                    </div>
                    <div>
                      <span>Monto</span>
                      <strong>{formatMoney(item.montoEstimado)}</strong>
                    </div>
                  </div>
                  <div className="mod-card-footer mt-3">
                    <span>{formatDateTime(item.fechaSolicitud)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-pro">
              <thead>
                <tr>
                  <SortableTh label="Código" column="codigo" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Justificación" column="justificacion" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Solicitante" column="solicitante" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Fecha" column="fecha" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Monto est." column="monto" className="text-right" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Estado" column="estado" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <th />
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((item) => (
                  <tr key={item.id} className="mod-row" onClick={() => openDetail(item)}>
                    <td>
                      <span className="mod-code">{item.codigo}</span>
                    </td>
                    <td className="max-w-xs truncate text-xs text-slate-600">{item.justificacion}</td>
                    <td className="text-xs">{item.solicitante.nombres} {item.solicitante.apellidos}</td>
                    <td className="whitespace-nowrap text-xs">{formatDateTime(item.fechaSolicitud)}</td>
                    <td className="text-right text-xs">{formatMoney(item.montoEstimado)}</td>
                    <td><StatusBadge estado={item.estado} /></td>
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

      <CreateReplenishmentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        products={products.data ?? []}
        onCreated={() => {
          setCreateOpen(false);
          list.reload();
          notify('Reposición registrada correctamente.');
        }}
      />

      <Modal
        open={Boolean(selected)}
        title={selected ? `Reposición ${selected.codigo}` : 'Reposición'}
        onClose={() => setSelected(null)}
        size="lg"
        footer={
          selected && (
            <>
              {selected.estado === 'BORRADOR' && canCreate && (
                <Button loading={busy} onClick={() => runAction('/submit', undefined, 'Enviada a aprobación.')}>
                  <Send className="h-4 w-4" /> Enviar a aprobación
                </Button>
              )}
              {selected.estado === 'PENDIENTE_APROBACION' && canApprove && (
                <>
                  <Button variant="danger" disabled={busy} onClick={() => setRejectOpen(true)}>
                    <X className="h-4 w-4" /> Rechazar
                  </Button>
                  <Button loading={busy} onClick={() => runAction('/approve', undefined, 'Reposición aprobada.')}>
                    <Check className="h-4 w-4" /> Aprobar
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge estado={selected.estado} />
              <span className="text-xs text-slate-400">{formatDateTime(selected.fechaSolicitud)}</span>
            </div>

            {actionError && <ErrorAlert message={actionError} />}

            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4 py-2">
              <DetailRow label="Solicitante">{selected.solicitante.nombres} {selected.solicitante.apellidos}</DetailRow>
              <DetailRow label="Justificación">{selected.justificacion}</DetailRow>
              <DetailRow label="Monto estimado">{formatMoney(selected.montoEstimado)}</DetailRow>
              <DetailRow label="Referencia presupuestal">{selected.referenciaPresupuesto ?? '-'}</DetailRow>
              <DetailRow label="Proveedor sugerido">{selected.proveedorSugerido ?? '-'}</DetailRow>
              {selected.aprobador && (
                <DetailRow label="Resuelto por">
                  {selected.aprobador.nombres} {selected.aprobador.apellidos} · {formatDateTime(selected.fechaResolucion)}
                </DetailRow>
              )}
              {selected.motivoRechazo && <DetailRow label="Motivo de rechazo">{selected.motivoRechazo}</DetailRow>}
            </dl>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="table table-pro">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="text-right">Cantidad</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.detalles.map((det) => (
                    <tr key={det.id}>
                      <td>
                        <p className="font-medium text-slate-700">{det.producto.nombre}</p>
                        <p className="text-xs text-slate-400">{det.producto.codigo} · {det.producto.unidadMedida}</p>
                      </td>
                      <td className="text-right">{formatQuantity(det.cantidad)}</td>
                      <td className="text-xs text-slate-500">{det.observacion ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rejectOpen && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                <Field label="Motivo de rechazo">
                  <Textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} />
                </Field>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setRejectOpen(false)}>Cancelar</Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={busy}
                    disabled={motivo.trim().length < 3}
                    onClick={() => runAction('/reject', { motivo }, 'Reposición rechazada.')}
                  >
                    Confirmar rechazo
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <FilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={() => setFiltersOpen(false)}
        onClear={() => {
          setStatus('');
          setSearch('');
        }}
        activeCount={status ? 1 : 0}
        title="Filtros de reposiciones"
      >
        <Field label="Buscar">
          <Input
            placeholder="Código, justificación o solicitante"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
        <div>
          <p className="label">Estado</p>
          <ModuleChips
            filters={STATUS_FILTERS}
            value={status}
            onChange={setStatus}
            counts={counts}
            ariaLabel="Filtrar por estado"
          />
        </div>
      </FilterDrawer>
    </div>
  );
}

function KpiCard({
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
  icon: React.ReactNode;
  tone: 'brand' | 'amber' | 'sky' | 'indigo';
  active: boolean;
  onClick: () => void;
  delay: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(`mod-kpi mod-kpi-tone-${tone} mod-reveal ${delay}`, active && 'is-active')}
    >
      <div className="mod-kpi-icon">{icon}</div>
      <p className="mod-kpi-label">{label}</p>
      <p className="mod-kpi-value">{value}</p>
      <p className="mod-kpi-hint">{hint}</p>
    </button>
  );
}

function CreateReplenishmentModal({
  open,
  onClose,
  products,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  products: Producto[];
  onCreated: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReplenishmentFormInput, unknown, ReplenishmentForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      justificacion: '',
      items: [{ productoId: 0, cantidad: 1, observacion: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (!open) return;
    reset({
      justificacion: '',
      montoEstimado: undefined,
      referenciaPresupuesto: '',
      proveedorSugerido: '',
      items: [{ productoId: products[0]?.id ?? 0, cantidad: 1, observacion: '' }],
    });
    setServerError(null);
  }, [open, products, reset]);

  const onSubmit = async (values: ReplenishmentForm) => {
    setServerError(null);
    try {
      await api.post('/replenishments', {
        ...values,
        montoEstimado: values.montoEstimado || null,
      });
      onCreated();
    } catch (error) {
      setServerError(apiErrorMessage(error));
    }
  };

  const watchedItems = watch('items') ?? [];
  const estimatedAmount = watch('montoEstimado');
  const justification = watch('justificacion') ?? '';
  const totalUnits = watchedItems.reduce((total, item) => total + (Number(item.cantidad) || 0), 0);

  return (
    <Modal
      open={open}
      title="Nueva solicitud de reposición"
      subtitle="Sustenta la necesidad y detalla los productos a reponer."
      icon={<RefreshCcw className="h-4 w-4" />}
      tone="amber"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="replenishment-form" loading={isSubmitting}>
            <RefreshCcw className="h-4 w-4" /> Registrar
          </Button>
        </>
      }
    >
      <form id="replenishment-form" className="fk-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <ErrorAlert message={serverError} />}

        <FormHero
          tone="amber"
          icon={<RefreshCcw className="h-6 w-6" />}
          eyebrow={<><ClipboardCheck className="h-3 w-3" /> Abastecimiento interno</>}
          title={watchedItems.length > 1 ? `${watchedItems.length} productos a reponer` : 'Detalle de la reposición'}
          subtitle={justification || 'Sustenta la necesidad operativa y agrega los productos requeridos'}
          tags={
            <>
              <FormTag icon={<Package className="h-3 w-3" />} tone="ok">
                {watchedItems.length} {watchedItems.length === 1 ? 'producto' : 'productos'}
              </FormTag>
              <FormTag>{formatQuantity(totalUnits)} unidades</FormTag>
              {Boolean(estimatedAmount) && (
                <FormTag icon={<BadgeDollarSign className="h-3 w-3" />}>
                  {formatMoney(Number(estimatedAmount))}
                </FormTag>
              )}
            </>
          }
          aside={
            <FormStats
              items={[
                { label: 'Productos', value: watchedItems.length },
                { label: 'Unidades', value: formatQuantity(totalUnits) },
                { label: 'Monto', value: estimatedAmount ? formatMoney(Number(estimatedAmount)) : '—' },
              ]}
            />
          }
        />

        <FormSection
          icon={<ClipboardCheck className="h-4 w-4" />}
          title="Justificación"
          description="Explica el motivo y el sustento operativo de la reposición"
        >
          <Field label="Motivo de la reposición" error={errors.justificacion?.message}>
            <Textarea placeholder="Detalle la necesidad operativa, el área solicitante y el sustento de la reposición" {...register('justificacion')} />
          </Field>
        </FormSection>

        <FormSection
          icon={<BadgeDollarSign className="h-4 w-4" />}
          title="Presupuesto"
          description="Monto estimado y referencia para la aprobación"
        >
          <FormGrid cols={3}>
            <Field label="Monto estimado (PEN)" error={errors.montoEstimado?.message}>
              <Input type="number" min={0} step="0.01" placeholder="0.00" {...register('montoEstimado')} />
            </Field>
            <Field label="Referencia presupuestal">
              <Input placeholder="Ej. RP-2026-018" {...register('referenciaPresupuesto')} />
            </Field>
            <Field label="Proveedor sugerido">
              <Input placeholder="Razón social opcional" {...register('proveedorSugerido')} />
            </Field>
          </FormGrid>
        </FormSection>

        <FormSection
          icon={<Package className="h-4 w-4" />}
          title="Productos solicitados"
          description="Agrega cada producto y la cantidad requerida"
          actions={
            <Button type="button" variant="soft" size="sm" onClick={() => append({ productoId: products[0]?.id ?? 0, cantidad: 1, observacion: '' })}>
              <Plus className="h-3.5 w-3.5" /> Agregar
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
                        <option key={product.id} value={product.id}>{product.codigo} - {product.nombre}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Cantidad" error={errors.items?.[index]?.cantidad?.message}>
                    <Input type="number" min={0.001} step="0.001" {...register(`items.${index}.cantidad` as const)} />
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
          La solicitud pasa a revisión. El monto y la referencia presupuestal ayudan a priorizar la aprobación.
        </FormNote>
      </form>
    </Modal>
  );
}
