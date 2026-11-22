import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle,
  Ban,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  CheckCircle2,
  Columns2,
  Eye,
  Gauge,
  Inbox,
  LayoutGrid,
  List,
  MapPin,
  Package,
  RefreshCw,
  RotateCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  X,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { toastSuccess } from '@/lib/toasts';
import { fetchPoints } from '@/lib/catalogs';
import { formatDate, formatNumber, formatQuantity, stateLabel } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import { DatePicker } from '@/components/DatePicker';
import { useAuth } from '@/store/auth';
import type {
  Contrato,
  EntidadPublica,
  PreviewItem,
  ProgramacionAbastecimiento,
  PuntoEntrega,
  Tdr,
  TdrItem,
} from '@/types';
import {
  Badge,
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
import { ModuleChips, ModulePagination, usePagination } from '@/components/module';
import { FormGrid, FormHero, FormNote, FormSection, FormStats, FormTag } from '@/components/FormKit';
import { FilterDrawer } from '@/components/FilterDrawer';
import { SortableTh, useTableSort } from '@/components/sortable';
import { ScheduleCalendar } from '@/components/ScheduleCalendar';
import '@/styles/modules.css';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'PROGRAMADA', label: 'Programadas' },
  { value: 'REPROGRAMADA', label: 'Reprogramadas' },
  { value: 'EN_EJECUCION', label: 'En ejecución' },
  { value: 'PARCIAL', label: 'Parciales' },
  { value: 'CUMPLIDA', label: 'Cumplidas' },
  { value: 'CANCELADA', label: 'Canceladas' },
];

export default function PaginaProgramacion() {
  const can = useAuth((state) => state.can);
  const canManage = can('PROGRAMACION', 'crear') || can('PROGRAMACION', 'editar');

  const [estado, setEstado] = useState('');
  const [entidadId, setEntidadId] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'split' | 'table' | 'grid' | 'calendar'>('split');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<ProgramacionAbastecimiento | null>(null);

  const schedules = useApiQuery<ProgramacionAbastecimiento[]>(
    () =>
      api
        .get('/schedules', {
          params: {
            estado: estado || undefined,
            entidadId: entidadId || undefined,
          },
        })
        .then((r) => r.data),
    [estado, entidadId],
  );
  const entities = useApiQuery<EntidadPublica[]>(() => api.get('/entities').then((r) => r.data));

  const data = useMemo(() => schedules.data ?? [], [schedules.data]);

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
      const matchesTerm =
        !term ||
        item.entidad.razonSocial.toLowerCase().includes(term) ||
        item.puntoEntrega.nombre.toLowerCase().includes(term) ||
        item.producto.nombre.toLowerCase().includes(term) ||
        item.contrato.codigo.toLowerCase().includes(term);
      return matchesTerm;
    });
  }, [data, search]);

  const pagination = usePagination(filtered, 8, `${search}|${estado}|${entidadId}|${view}`);
  const hasFilters = Boolean(search.trim() || entidadId || estado);
  const splitItems = useMemo(
    () => (selectedDay
      ? filtered.filter((item) => item.fechaProgramada?.slice(0, 10) === selectedDay)
      : filtered),
    [filtered, selectedDay],
  );
  const splitPagination = usePagination(
    splitItems,
    8,
    `${search}|${estado}|${entidadId}|${selectedDay}`,
  );

  return (
    <div className="mod-page">
      <section className="mod-hero mod-reveal">
        <div className="mod-hero-content">
          <div>
            <p className="mod-eyebrow">
              <span className="mod-live-dot" /> Cronograma contractual
            </p>
            <h1 className="mod-title">Programación de abastecimiento</h1>
            <p className="mod-sub">
              Generación del cronograma a partir de la frecuencia definida en el TDR. Previsualiza,
              confirma, reprograma o cancela cada entrega comprometida.
            </p>
          </div>
          <div className="mod-hero-actions">
            <button
              type="button"
              onClick={schedules.reload}
              className="mod-hero-button-soft"
              disabled={schedules.loading}
            >
              <RefreshCw className={clsx('h-3.5 w-3.5', schedules.loading && 'animate-spin')} /> Actualizar
            </button>
            {canManage && (
              <button type="button" onClick={() => setCreateOpen(true)} className="mod-hero-button">
                <CalendarPlus className="h-3.5 w-3.5" /> Generar programación
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-3.5 grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Programadas"
          value={formatNumber((counts.PROGRAMADA ?? 0) + (counts.REPROGRAMADA ?? 0))}
          hint="Entregas comprometidas"
          icon={<CalendarClock className="h-5 w-5" />}
          tone="brand"
          active={estado === 'PROGRAMADA'}
          onClick={() => setEstado(estado === 'PROGRAMADA' ? '' : 'PROGRAMADA')}
          delay="mod-reveal-1"
        />
        <KpiCard
          label="En ejecución"
          value={formatNumber(counts.EN_EJECUCION ?? 0)}
          hint="Entregas en curso"
          icon={<MapPin className="h-5 w-5" />}
          tone="sky"
          active={estado === 'EN_EJECUCION'}
          onClick={() => setEstado(estado === 'EN_EJECUCION' ? '' : 'EN_EJECUCION')}
          delay="mod-reveal-2"
        />
        <KpiCard
          label="Cumplidas"
          value={formatNumber(counts.CUMPLIDA ?? 0)}
          hint="Entregas completadas"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="indigo"
          active={estado === 'CUMPLIDA'}
          onClick={() => setEstado(estado === 'CUMPLIDA' ? '' : 'CUMPLIDA')}
          delay="mod-reveal-3"
        />
        <KpiCard
          label="Parciales"
          value={formatNumber(counts.PARCIAL ?? 0)}
          hint="Con saldo pendiente"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="amber"
          active={estado === 'PARCIAL'}
          onClick={() => setEstado(estado === 'PARCIAL' ? '' : 'PARCIAL')}
          delay="mod-reveal-4"
        />
      </div>

      <Card className="mod-reveal mod-reveal-2">
        <div className="mod-toolbar mod-toolbar-schedule">
          <div className="mod-toolbar-top">
            <div className="mod-toolbar-heading">
              <p className="mod-toolbar-eyebrow">Programación de entregas</p>
              <h3>
                Cronograma <span className="mod-toolbar-count">{filtered.length}</span>
              </h3>
              <p className="mod-toolbar-sub">
                Abre una programación para reprogramar o cancelar la entrega.
              </p>
            </div>

            <div className="mod-toolbar-meta">
              <span>
                Mostrando <strong>{filtered.length}</strong> de {schedules.data?.length ?? 0}
              </span>
              {hasFilters && (
                <button
                  type="button"
                  className="mod-toolbar-clear"
                  onClick={() => {
                    setSearch('');
                    setEntidadId('');
                    setEstado('');
                  }}
                >
                  <X className="h-3 w-3" /> Limpiar filtros
                </button>
              )}
            </div>
          </div>

          <div className="mod-toolbar-filters">
            <button
              type="button"
              className="btn btn-secondary btn-sm sm:hidden"
              onClick={() => setFiltersOpen(true)}
              aria-label="Abrir filtros de programación"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros
              {(search || entidadId || estado) && (
                <span className="rounded-full bg-brand-700 px-1.5 text-[10px] text-white">
                  {[search, entidadId, estado].filter(Boolean).length}
                </span>
              )}
            </button>
            <div className="mod-search hidden sm:flex">
              <Search className="mod-search-icon h-4 w-4" />
              <Input
                className="pl-9"
                placeholder="Buscar entidad, punto o producto"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select
              className="mod-entity-filter hidden sm:block"
              value={entidadId}
              onChange={(event) => setEntidadId(event.target.value)}
            >
              <option value="">Todas las entidades</option>
              {(entities.data ?? []).map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.razonSocial}
                </option>
              ))}
            </Select>

            <div className="mod-view-toggle" role="group" aria-label="Modo de visualización">
              <button
                type="button"
                className={clsx(view === 'split' && 'is-active')}
                onClick={() => setView('split')}
              >
                <Columns2 className="h-3.5 w-3.5" /> Calendario + tabla
              </button>
              <button
                type="button"
                className={clsx(view === 'calendar' && 'is-active')}
                onClick={() => setView('calendar')}
              >
                <CalendarDays className="h-3.5 w-3.5" /> Calendario
              </button>
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

          <div className="hidden sm:block">
            <ModuleChips
              filters={STATUS_FILTERS}
              value={estado}
              onChange={setEstado}
              counts={counts}
              ariaLabel="Filtrar por estado"
            />
          </div>
        </div>

        {schedules.error && (
          <div className="p-5">
            <ErrorAlert message={schedules.error} onRetry={schedules.reload} />
          </div>
        )}

        {schedules.loading && !schedules.data ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Sin programaciones"
            description="Genere el cronograma desde los ítems del TDR del contrato."
            action={
              canManage && (
                <Button variant="soft" onClick={() => setCreateOpen(true)}>
                  <CalendarRange className="h-4 w-4" /> Generar programación
                </Button>
              )
            }
          />
        ) : view === 'split' ? (
          <div className="programacion-split">
            <div className="programacion-table-panel">
              <div className="programacion-table-head">
                <div>
                  <p className="programacion-side-eyebrow">
                    {selectedDay ? 'Día seleccionado' : 'Cronograma visible'}
                  </p>
                  <h3 className="programacion-side-title">
                    {selectedDay ? formatDate(selectedDay) : 'Todas las entregas'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDay && (
                    <button type="button" className="programacion-side-clear" onClick={() => setSelectedDay(null)}>
                      Ver todas
                    </button>
                  )}
                  <Badge tone="brand">{splitItems.length}</Badge>
                </div>
              </div>

              {splitItems.length === 0 ? (
                <div className="programacion-side-empty">
                  <Inbox className="h-5 w-5" />
                  <span>
                    {selectedDay
                      ? 'No hay entregas programadas para este día.'
                      : 'No hay entregas que coincidan con los filtros.'}
                  </span>
                </div>
              ) : (
                <>
                  <ScheduleTable compact items={splitPagination.pageItems} onSelect={setSelected} />
                  <ModulePagination
                    page={splitPagination.page}
                    pageCount={splitPagination.pageCount}
                    total={splitPagination.total}
                    from={splitPagination.from}
                    to={splitPagination.to}
                    pageSize={splitPagination.pageSize}
                    onPageChange={splitPagination.setPage}
                  />
                </>
              )}
            </div>
            <div className="programacion-calendar-panel">
              <ScheduleCalendar
                schedules={filtered}
                canManage={canManage}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                showSelectedPanel={false}
                compact
                onSelect={setSelected}
                onRescheduled={(message) => {
                  toastSuccess(message);
                  schedules.reload();
                }}
              />
            </div>
          </div>
        ) : view === 'calendar' ? (
          <ScheduleCalendar
            schedules={filtered}
            canManage={canManage}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onSelect={setSelected}
            onRescheduled={(message) => {
              toastSuccess(message);
              schedules.reload();
            }}
          />
        ) : view === 'grid' ? (
          <div className="mod-grid">
            {pagination.pageItems.map((item) => (
              <button key={item.id} type="button" className="mod-card" onClick={() => setSelected(item)}>
                <div>
                  <div className="mod-card-top">
                    <span className="mod-code">{formatDate(item.fechaProgramada)}</span>
                    <StatusBadge estado={item.estado} />
                  </div>
                  <p className="mod-card-title">{item.producto.nombre}</p>
                  <p className="mod-card-sub">
                    {item.entidad.razonSocial} · {item.puntoEntrega.nombre}
                  </p>
                </div>
                <div>
                  <div className="mod-card-metrics">
                    <div>
                      <span>Programado</span>
                      <strong>{formatQuantity(item.cantidadProgramada)}</strong>
                    </div>
                    <div>
                      <span>Saldo</span>
                      <strong>{formatQuantity(item.saldoPendiente)}</strong>
                    </div>
                  </div>
                  <div className="mod-card-footer mt-3">
                    <span>Contrato {item.contrato.codigo}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <ScheduleTable items={pagination.pageItems} onSelect={setSelected} />
        )}

        {view !== 'calendar' && view !== 'split' && (
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

      <GenerateScheduleModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(count) => {
          setCreateOpen(false);
          const message = `Se generaron ${count} entregas programadas.`;
          toastSuccess(message);
          schedules.reload();
        }}
      />

      <ScheduleDetail
        schedule={selected}
        canManage={canManage}
        onClose={() => setSelected(null)}
        onUpdated={() => {
          schedules.reload();
          setSelected(null);
        }}
      />

      <FilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={() => setFiltersOpen(false)}
        onClear={() => {
          setSearch('');
          setEntidadId('');
          setEstado('');
        }}
        activeCount={[search, entidadId, estado].filter(Boolean).length}
        title="Filtros de programación"
      >
        <Field label="Buscar">
          <Input
            placeholder="Entidad, punto o producto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
        <Field label="Entidad">
          <Select value={entidadId} onChange={(event) => setEntidadId(event.target.value)}>
            <option value="">Todas las entidades</option>
            {(entities.data ?? []).map((entity) => (
              <option key={entity.id} value={entity.id}>{entity.razonSocial}</option>
            ))}
          </Select>
        </Field>
        <div>
          <p className="label">Estado</p>
          <ModuleChips
            filters={STATUS_FILTERS}
            value={estado}
            onChange={setEstado}
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

function ScheduleTable({
  items,
  onSelect,
  compact = false,
}: {
  items: ProgramacionAbastecimiento[];
  onSelect: (schedule: ProgramacionAbastecimiento) => void;
  compact?: boolean;
}) {
  const sorting = useTableSort(items, {
    fecha: (item) => new Date(item.fechaProgramada).getTime(),
    entidad: (item) => item.entidad.razonSocial,
    producto: (item) => item.producto.nombre,
    programado: (item) => Number(item.cantidadProgramada),
    entregado: (item) => Number(item.cantidadEntregada),
    saldo: (item) => Number(item.saldoPendiente),
    estado: (item) => item.estado,
  });

  return (
    <div className="overflow-x-auto">
      <table className="table table-pro">
        <thead>
          <tr>
            <SortableTh label="Fecha" column="fecha" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
            <SortableTh label="Entidad / punto" column="entidad" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
            <SortableTh label="Producto" column="producto" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
            {!compact && <SortableTh label="Programado" column="programado" className="text-right" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />}
            {!compact && <SortableTh label="Entregado" column="entregado" className="text-right" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />}
            <SortableTh label="Saldo" column="saldo" className="text-right" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
            <SortableTh label="Estado" column="estado" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
            <th />
          </tr>
        </thead>
        <tbody>
          {sorting.rows.map((item) => (
            <tr key={item.id} className="mod-row" onClick={() => onSelect(item)}>
              <td className="whitespace-nowrap font-semibold text-slate-800">
                {formatDate(item.fechaProgramada)}
              </td>
              <td>
                <p className="font-semibold text-slate-800">{item.entidad.razonSocial}</p>
                <p className="text-xs text-slate-400">{item.puntoEntrega.nombre}</p>
              </td>
              <td>
                <p className="text-slate-700">{item.producto.nombre}</p>
                <p className="text-xs text-slate-400">{item.producto.unidadMedida}</p>
              </td>
              {!compact && <td className="text-right">{formatQuantity(item.cantidadProgramada)}</td>}
              {!compact && <td className="text-right">{formatQuantity(item.cantidadEntregada)}</td>}
              <td className="text-right font-semibold">{formatQuantity(item.saldoPendiente)}</td>
              <td>
                <StatusBadge estado={item.estado} />
              </td>
              <td className="text-right" onClick={(event) => event.stopPropagation()}>
                <Button variant="ghost" size="sm" onClick={() => onSelect(item)}>
                  <Eye className="h-4 w-4" /> Ver
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GenerateScheduleModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (count: number) => void;
}) {
  const [contracts, setContracts] = useState<Contrato[]>([]);
  const [tdrs, setTdrs] = useState<Tdr[]>([]);
  const [items, setItems] = useState<TdrItem[]>([]);
  const [points, setPoints] = useState<PuntoEntrega[]>([]);
  const [contractId, setContractId] = useState<number>(0);
  const [tdrId, setTdrId] = useState<number>(0);
  const [itemId, setItemId] = useState<number>(0);
  const [pointId, setPointId] = useState<number>(0);
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setError(null);
    setTdrs([]);
    setItems([]);
    setPoints([]);
    api
      .get<Contrato[]>('/contracts')
      .then(({ data }) => {
        setContracts(data);
        setContractId(data[0]?.id ?? 0);
      })
      .catch((err) => setError(apiErrorMessage(err)));
  }, [open]);

  useEffect(() => {
    if (!contractId) return;
    const contract = contracts.find((item) => item.id === Number(contractId));
    setPreview(null);
    setItems([]);
    setTdrId(0);
    api
      .get<Tdr[]>(`/contracts/${contractId}/tdrs`)
      .then(({ data }) => {
        setTdrs(data);
        setTdrId(data[0]?.id ?? 0);
      })
      .catch((err) => setError(apiErrorMessage(err)));
    if (contract) {
      fetchPoints(contract.entidad.id)
        .then((data) => {
          setPoints(data);
          setPointId(data[0]?.id ?? 0);
        })
        .catch(() => setPoints([]));
    }
  }, [contractId, contracts]);

  useEffect(() => {
    if (!tdrId) return;
    setPreview(null);
    api
      .get<TdrItem[]>(`/tdrs/${tdrId}/items`)
      .then(({ data }) => {
        setItems(data);
        setItemId(data[0]?.id ?? 0);
      })
      .catch((err) => setError(apiErrorMessage(err)));
  }, [tdrId]);

  const loadPreview = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.get<PreviewItem[]>('/schedules/preview', {
        params: { tdrItemId: itemId, puntoId: pointId },
      });
      setPreview(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<ProgramacionAbastecimiento[]>('/schedules/confirm', {
        tdrItemId: itemId,
        puntoId: pointId,
        items: preview,
      });
      onCreated(data.length);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = items.find((item) => item.id === Number(itemId));
  const selectedContract = contracts.find((contract) => contract.id === Number(contractId));
  const selectedPoint = points.find((point) => point.id === Number(pointId));
  const previewCount = preview?.length ?? 0;
  const previewTotal = preview?.reduce((total, item) => total + Number(item.cantidad), 0) ?? 0;

  return (
    <Modal
      open={open}
      title="Generar programación desde TDR"
      subtitle="Convierte el compromiso del TDR en un cronograma de entregas."
      icon={<CalendarPlus className="h-4 w-4" />}
      tone="indigo"
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="soft" onClick={loadPreview} loading={loading} disabled={!itemId || !pointId}>
            Previsualizar fechas
          </Button>
          <Button onClick={confirm} loading={loading} disabled={!preview || preview.length === 0}>
            Confirmar {preview ? `(${preview.length})` : ''}
          </Button>
        </>
      }
    >
      <div className="fk-form">
        {error && <ErrorAlert message={error} />}

        <FormHero
          tone="indigo"
          icon={<CalendarPlus className="h-6 w-6" />}
          eyebrow={<><CalendarRange className="h-3 w-3" /> Cronograma de abastecimiento</>}
          title={selectedItem?.producto.nombre ?? 'Detalle del cronograma'}
          subtitle={
            selectedContract
              ? `${selectedContract.codigo} · ${selectedContract.entidad.razonSocial}`
              : 'Selecciona contrato, TDR, ítem y punto de entrega'
          }
          tags={
            <>
              {selectedPoint && <FormTag icon={<MapPin className="h-3 w-3" />} tone="ok">{selectedPoint.nombre}</FormTag>}
              {selectedItem && <FormTag>{selectedItem.frecuencia}</FormTag>}
              {selectedItem && (
                <FormTag>
                  {formatQuantity(selectedItem.cantidadPorEntrega)} {selectedItem.unidad} por periodo
                </FormTag>
              )}
            </>
          }
          aside={
            selectedItem ? (
              <FormStats
                items={[
                  { label: 'Compromiso', value: formatQuantity(selectedItem.cantidadTotal) },
                  { label: 'Por periodo', value: formatQuantity(selectedItem.cantidadPorEntrega) },
                  { label: 'Entregas', value: previewCount || '—' },
                ]}
              />
            ) : undefined
          }
        />

        <FormSection
          icon={<Package className="h-4 w-4" />}
          title="Origen del compromiso"
          description="Contrato, versión del TDR, ítem y punto de entrega"
        >
          <FormGrid>
            <Field label="Contrato">
              <Select value={contractId} onChange={(event) => setContractId(Number(event.target.value))}>
                <option value={0}>Seleccione contrato</option>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.codigo} - {contract.entidad.razonSocial}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Versión de TDR">
              <Select value={tdrId} onChange={(event) => setTdrId(Number(event.target.value))}>
                <option value={0}>Seleccione TDR</option>
                {tdrs.map((tdr) => (
                  <option key={tdr.id} value={tdr.id}>
                    {tdr.version} · vigencia {formatDate(tdr.fechaVigencia)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ítem del TDR">
              <Select value={itemId} onChange={(event) => setItemId(Number(event.target.value))}>
                <option value={0}>Seleccione item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.producto.nombre} · {item.frecuencia} · {formatQuantity(item.cantidadPorEntrega)} {item.unidad}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Punto de entrega">
              <Select value={pointId} onChange={(event) => setPointId(Number(event.target.value))}>
                <option value={0}>Seleccione punto</option>
                {points.map((point) => (
                  <option key={point.id} value={point.id}>{point.nombre}</option>
                ))}
              </Select>
            </Field>
          </FormGrid>

          {selectedItem && (
            <FormStats
              className="fk-gap-top"
              items={[
                { label: 'Compromiso total', value: `${formatQuantity(selectedItem.cantidadTotal)} ${selectedItem.unidad}` },
                { label: 'Entrega por periodo', value: formatQuantity(selectedItem.cantidadPorEntrega) },
                { label: 'Frecuencia', value: selectedItem.frecuencia },
              ]}
            />
          )}
        </FormSection>

        {preview && (
          <FormSection
            icon={<CalendarRange className="h-4 w-4" />}
            title="Cronograma propuesto"
            description="Fechas y cantidades que se generarán al confirmar"
            actions={<Badge tone="brand">{previewCount} entregas</Badge>}
          >
            <div className="fk-table-wrap">
              <table className="table table-pro">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha programada</th>
                    <th className="text-right">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((item, index) => (
                    <tr key={`${item.fecha}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{formatDate(item.fecha)}</td>
                      <td className="text-right">{formatQuantity(item.cantidad)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>Total programado</td>
                    <td className="text-right">{formatQuantity(previewTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </FormSection>
        )}

        <FormNote icon={<Gauge className="h-3.5 w-3.5" />} tone="ok">
          La confirmación genera el cronograma y bloquea la generación duplicada para el mismo ítem y punto de entrega.
        </FormNote>
      </div>
    </Modal>
  );
}

function ScheduleDetail({
  schedule,
  canManage,
  onClose,
  onUpdated,
}: {
  schedule: ProgramacionAbastecimiento | null;
  canManage: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [fecha, setFecha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFecha(schedule?.fechaProgramada ?? '');
    setMotivo('');
    setError(null);
  }, [schedule]);

  if (!schedule) return null;

  const action = async (path: string, body: Record<string, unknown>) => {
    setError(null);
    setLoading(true);
    try {
      await api.post(`/schedules/${schedule.id}/${path}`, body);
      toastSuccess('Programación actualizada.');
      onUpdated();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const editable = canManage && schedule.estado !== 'CANCELADA' && schedule.estado !== 'CUMPLIDA';
  const programada = Number(schedule.cantidadProgramada);
  const entregada = Number(schedule.cantidadEntregada);
  const pct = programada > 0 ? Math.min(100, Math.round((entregada / programada) * 100)) : 0;

  const sumarDias = (days: number) => {
    const base = fecha ? new Date(`${fecha}T00:00:00`) : new Date();
    base.setDate(base.getDate() + days);
    const year = base.getFullYear();
    const month = String(base.getMonth() + 1).padStart(2, '0');
    const day = String(base.getDate()).padStart(2, '0');
    setFecha(`${year}-${month}-${day}`);
  };

  return (
    <Modal
      open={Boolean(schedule)}
      title={`Programación #${schedule.id}`}
      subtitle={`${schedule.producto.nombre} · ${schedule.entidad.razonSocial}`}
      icon={<CalendarClock className="h-4 w-4" />}
      onClose={onClose}
      size="xl"
    >
      <div className="schedule-detail">
        <div className="schedule-detail-hero">
          <span className="schedule-detail-icon">
            <Package className="h-6 w-6" />
          </span>
          <div className="schedule-detail-hero-copy">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge estado={schedule.estado} />
              <span className="text-[11px] font-medium text-slate-400">
                Contrato {schedule.contrato.codigo}
              </span>
            </div>
            <h3>{schedule.producto.nombre}</h3>
            <p>
              <Building2 className="h-3.5 w-3.5" /> {schedule.entidad.razonSocial}
              <MapPin className="ml-3 h-3.5 w-3.5" /> {schedule.puntoEntrega.nombre}
            </p>
          </div>
          <div className="schedule-detail-date">
            <CalendarDays className="h-4 w-4" />
            <strong>{formatDate(schedule.fechaProgramada)}</strong>
            <span>{schedule.fechaLimite ? `Límite ${formatDate(schedule.fechaLimite)}` : 'Fecha comprometida'}</span>
          </div>
        </div>

        <div className="schedule-detail-kpis">
          <div>
            <Package className="h-4 w-4" />
            <span>Programado</span>
            <strong>{formatQuantity(schedule.cantidadProgramada)} {schedule.producto.unidadMedida}</strong>
          </div>
          <div>
            <CheckCircle2 className="h-4 w-4" />
            <span>Entregado</span>
            <strong>{formatQuantity(schedule.cantidadEntregada)}</strong>
          </div>
          <div>
            <TrendingUp className="h-4 w-4" />
            <span>Saldo pendiente</span>
            <strong>{formatQuantity(schedule.saldoPendiente)}</strong>
          </div>
          <div>
            <Gauge className="h-4 w-4" />
            <span>Avance</span>
            <strong>{pct}%</strong>
          </div>
        </div>

        <div className="schedule-detail-progress" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>

        {schedule.motivo && (
          <div className="schedule-detail-note">
            <AlertTriangle className="h-4 w-4" />
            <span><strong>Motivo registrado:</strong> {schedule.motivo}</span>
          </div>
        )}

        {error && <ErrorAlert message={error} />}

        {editable ? (
          <div className="schedule-detail-actions">
            <div className="schedule-action-card">
              <div className="schedule-action-head">
                <span className="schedule-action-icon is-brand"><RotateCw className="h-4 w-4" /></span>
                <div>
                  <p>Reprogramar entrega</p>
                  <span>Mueva la fecha comprometida sin perder el historial.</span>
                </div>
              </div>

              <div className="schedule-quick-dates">
                {[7, 15, 30].map((days) => (
                  <button key={days} type="button" onClick={() => sumarDias(days)}>
                    +{days} días
                  </button>
                ))}
              </div>

              <Field label="Nueva fecha">
                <DatePicker value={fecha} onChange={setFecha} />
              </Field>
              <Field label="Motivo" className="mt-2">
                <Input value={motivo} onChange={(event) => setMotivo(event.target.value)} placeholder="Motivo del cambio" />
              </Field>
              <Button
                className="mt-3 w-full"
                size="sm"
                loading={loading}
                disabled={!fecha}
                onClick={() => action('reschedule', { fecha, motivo })}
              >
                <RotateCw className="h-4 w-4" /> Guardar reprogramación
              </Button>
            </div>

            <div className="schedule-action-card is-danger">
              <div className="schedule-action-head">
                <span className="schedule-action-icon is-danger"><Ban className="h-4 w-4" /></span>
                <div>
                  <p>Cancelar programación</p>
                  <span>Libere la entrega comprometida y registre el motivo.</span>
                </div>
              </div>
              <Field label="Motivo de cancelación">
                <Textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} />
              </Field>
              <Button
                className="mt-3 w-full"
                variant="danger"
                size="sm"
                loading={loading}
                disabled={motivo.trim().length < 3}
                onClick={() => action('cancel', { motivo })}
              >
                <Ban className="h-4 w-4" /> Cancelar entrega
              </Button>
            </div>
          </div>
        ) : (
          <div className="schedule-detail-note">
            <CheckCircle2 className="h-4 w-4" />
            <span>Esta programación está {stateLabel(schedule.estado).toLowerCase()} y no admite cambios.</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
