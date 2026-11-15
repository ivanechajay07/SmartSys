import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  CheckCircle2,
  Eye,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  RefreshCw,
  Route,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { formatDate, formatNumber, formatQuantity } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import type { Despacho, ProgramacionAbastecimiento } from '@/types';
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
} from '@/components/ui';
import { ModulePagination, usePagination } from '@/components/module';
import { FormGrid, FormHero, FormNote, FormSection, FormStats, FormTag } from '@/components/FormKit';
import '@/styles/modules.css';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'BORRADOR', label: 'Borradores' },
  { value: 'PREPARADO', label: 'Preparados' },
  { value: 'EN_RUTA', label: 'En ruta' },
  { value: 'ENTREGADO', label: 'Entregados' },
  { value: 'ENTREGADO_PARCIAL', label: 'Parciales' },
  { value: 'CANCELADO', label: 'Cancelados' },
];

export default function PaginaDespachos() {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const can = useAuth((state) => state.can);
  const canCreate = can('DESPACHOS', 'crear');

  const [estado, setEstado] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [createOpen, setCreateOpen] = useState(false);

  const dispatches = useApiQuery<Despacho[]>(() => api.get('/dispatches').then((r) => r.data));

  const data = useMemo(() => dispatches.data ?? [], [dispatches.data]);

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
      const matchesState = !estado || item.estado === estado;
      const matchesTerm =
        !term ||
        item.codigo.toLowerCase().includes(term) ||
        item.entidad.razonSocial.toLowerCase().includes(term) ||
        item.puntoEntrega.nombre.toLowerCase().includes(term) ||
        (item.transportista?.nombres ?? '').toLowerCase().includes(term);
      return matchesState && matchesTerm;
    });
  }, [data, estado, search]);

  const pagination = usePagination(filtered, 8, `${search}|${estado}|${view}`);

  return (
    <div className="mod-page">
      <section className="mod-hero mod-reveal">
        <div className="mod-hero-content">
          <div>
            <p className="mod-eyebrow">
              <span className="mod-live-dot" /> Distribución y trazabilidad
            </p>
            <h1 className="mod-title">Despachos</h1>
            <p className="mod-sub">
              Preparación, asignación de transporte, salida, entrega y trazabilidad de cada envío.
              Abre un despacho para registrar su ciclo completo.
            </p>
          </div>
          <div className="mod-hero-actions">
            <button
              type="button"
              onClick={dispatches.reload}
              className="mod-hero-button-soft"
              disabled={dispatches.loading}
            >
              <RefreshCw className={clsx('h-3.5 w-3.5', dispatches.loading && 'animate-spin')} /> Actualizar
            </button>
            {canCreate && (
              <button type="button" onClick={() => setCreateOpen(true)} className="mod-hero-button">
                <Plus className="h-3.5 w-3.5" /> Nuevo despacho
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="En ruta"
          value={formatNumber(counts.EN_RUTA ?? 0)}
          hint="Viajes en ejecución"
          icon={<Route className="h-5 w-5" />}
          tone="sky"
          active={estado === 'EN_RUTA'}
          onClick={() => setEstado(estado === 'EN_RUTA' ? '' : 'EN_RUTA')}
          delay="mod-reveal-1"
        />
        <KpiCard
          label="Preparados"
          value={formatNumber(counts.PREPARADO ?? 0)}
          hint="Listos para salir"
          icon={<Truck className="h-5 w-5" />}
          tone="amber"
          active={estado === 'PREPARADO'}
          onClick={() => setEstado(estado === 'PREPARADO' ? '' : 'PREPARADO')}
          delay="mod-reveal-2"
        />
        <KpiCard
          label="Entregados"
          value={formatNumber((counts.ENTREGADO ?? 0) + (counts.ENTREGADO_PARCIAL ?? 0))}
          hint="Entregas completadas"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="brand"
          active={estado === 'ENTREGADO'}
          onClick={() => setEstado(estado === 'ENTREGADO' ? '' : 'ENTREGADO')}
          delay="mod-reveal-3"
        />
        <KpiCard
          label="Cancelados"
          value={formatNumber(counts.CANCELADO ?? 0)}
          hint="Despachos anulados"
          icon={<XCircle className="h-5 w-5" />}
          tone="rose"
          active={estado === 'CANCELADO'}
          onClick={() => setEstado(estado === 'CANCELADO' ? '' : 'CANCELADO')}
          delay="mod-reveal-4"
        />
      </div>

      <Card className="mod-reveal mod-reveal-2">
        <div className="mod-toolbar">
          <div className="mod-toolbar-top">
            <div>
              <h3 className="text-base font-bold text-slate-800">Bandeja de despachos ({filtered.length})</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Abre un despacho para gestionar su ciclo, incidencias, evidencias y recepción.
              </p>
            </div>

            <div className="mod-toolbar-controls">
              <div className="mod-search">
                <Search className="mod-search-icon h-4 w-4" />
                <Input
                  className="pl-9"
                  placeholder="Buscar código, entidad, punto o transportista"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="mod-view-toggle" role="group" aria-label="Modo de visualización">
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

          <div className="mod-chips" role="tablist" aria-label="Filtrar por estado">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value || 'ALL'}
                type="button"
                role="tab"
                aria-selected={estado === filter.value}
                className={clsx('mod-chip', estado === filter.value && 'is-active')}
                onClick={() => setEstado(filter.value)}
              >
                {filter.label}
                <span className="mod-chip-count">{counts[filter.value] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {dispatches.error && (
          <div className="p-5">
            <ErrorAlert message={dispatches.error} onRetry={dispatches.reload} />
          </div>
        )}

        {dispatches.loading && !dispatches.data ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Sin despachos"
            description={
              data.length
                ? 'Ningún despacho coincide con los filtros actuales.'
                : 'Cree un despacho a partir de una programación vigente.'
            }
            action={
              canCreate && (
                <Button variant="soft" onClick={() => setCreateOpen(true)}>
                  <Truck className="h-4 w-4" /> Nuevo despacho
                </Button>
              )
            }
          />
        ) : view === 'grid' ? (
          <div className="mod-grid">
            {pagination.pageItems.map((item) => {
              const qty = (item.detalles ?? []).reduce(
                (sum, det) => sum + Number(det.cantidadComprometida),
                0,
              );
              return (
                <button
                  key={item.id}
                  type="button"
                  className="mod-card"
                  onClick={() => navigate(`/despachos/${item.id}`)}
                >
                  <div>
                    <div className="mod-card-top">
                      <span className="mod-code">{item.codigo}</span>
                      <StatusBadge estado={item.estado} />
                    </div>
                    <p className="mod-card-title">{item.entidad.razonSocial}</p>
                    <p className="mod-card-sub">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      {item.puntoEntrega.nombre}
                    </p>
                  </div>
                  <div>
                    <div className="mod-card-metrics">
                      <div>
                        <span>Comprometido</span>
                        <strong>{formatQuantity(qty)}</strong>
                      </div>
                      <div>
                        <span>Transportista</span>
                        <strong className="text-xs">
                          {item.transportista ? item.transportista.apellidos : 'Sin asignar'}
                        </strong>
                      </div>
                    </div>
                    <div className="mod-card-footer mt-3">
                      <span>{formatDate(item.fecha)}</span>
                      <span>Guía {item.numeroGuia ?? '-'}</span>
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
                  <th>Fecha</th>
                  <th>Entidad / punto</th>
                  <th>Transportista</th>
                  <th>Guía</th>
                  <th className="text-right">Comprometido</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((item) => (
                  <tr
                    key={item.id}
                    className="mod-row"
                    onClick={() => navigate(`/despachos/${item.id}`)}
                  >
                    <td>
                      <span className="mod-code">{item.codigo}</span>
                    </td>
                    <td className="whitespace-nowrap text-xs">{formatDate(item.fecha)}</td>
                    <td>
                      <p className="font-semibold text-slate-800">{item.entidad.razonSocial}</p>
                      <p className="text-xs text-slate-400">{item.puntoEntrega.nombre}</p>
                    </td>
                    <td className="text-xs">
                      {item.transportista
                        ? `${item.transportista.nombres} ${item.transportista.apellidos}`
                        : 'Sin asignar'}
                    </td>
                    <td className="text-xs">{item.numeroGuia ?? '-'}</td>
                    <td className="text-right font-semibold">
                      {formatQuantity(
                        (item.detalles ?? []).reduce((sum, det) => sum + Number(det.cantidadComprometida), 0),
                      )}
                    </td>
                    <td>
                      <StatusBadge estado={item.estado} />
                    </td>
                    <td className="text-right" onClick={(event) => event.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/despachos/${item.id}`)}>
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

      <CreateDispatchModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        responsableId={user?.id ?? 0}
        onCreated={(id) => navigate(`/despachos/${id}`)}
      />
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
  tone: 'brand' | 'amber' | 'sky' | 'rose';
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

function CreateDispatchModal({
  open,
  onClose,
  responsableId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  responsableId: number;
  onCreated: (id: number) => void;
}) {
  const [schedules, setSchedules] = useState<ProgramacionAbastecimiento[]>([]);
  const [scheduleId, setScheduleId] = useState<number>(0);
  const [cantidad, setCantidad] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    api
      .get<ProgramacionAbastecimiento[]>('/schedules')
      .then(({ data }) => {
        const openSchedules = data.filter(
          (item) => item.estado !== 'CANCELADA' && item.estado !== 'CUMPLIDA' && Number(item.saldoPendiente) > 0,
        );
        setSchedules(openSchedules);
        setScheduleId(openSchedules[0]?.id ?? 0);
        setCantidad(openSchedules[0] ? String(openSchedules[0].saldoPendiente) : '');
      })
      .catch((err) => setError(apiErrorMessage(err)));
  }, [open]);

  const selected = schedules.find((item) => item.id === Number(scheduleId));
  const pendingBalance = Number(selected?.saldoPendiente) || 0;
  const dispatchQuantity = Number(cantidad) || 0;
  const remaining = Math.max(0, pendingBalance - dispatchQuantity);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<Despacho>('/dispatches', {
        programacionId: scheduleId,
        responsableId,
        cantidad: Number(cantidad),
      });
      onCreated(data.id);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Nuevo despacho"
      subtitle="Genera la orden de salida desde una programación confirmada."
      icon={<Truck className="h-4 w-4" />}
      tone="brand"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} loading={loading} disabled={!scheduleId || !cantidad}>
            <Truck className="h-4 w-4" /> Crear despacho
          </Button>
        </>
      }
    >
      <div className="fk-form">
        {error && <ErrorAlert message={error} />}

        <FormHero
          tone="sky"
          icon={<Truck className="h-6 w-6" />}
          eyebrow={<><Route className="h-3 w-3" /> Salida de almacén</>}
          title={selected?.producto.nombre ?? 'Orden de salida'}
          subtitle={
            selected
              ? `${selected.entidad.razonSocial} · ${formatDate(selected.fechaProgramada)}`
              : 'Selecciona una programación con saldo pendiente'
          }
          tags={
            selected ? (
              <>
                <FormTag icon={<MapPin className="h-3 w-3" />} tone="ok">
                  {selected.puntoEntrega?.nombre ?? 'Punto de entrega'}
                </FormTag>
                <FormTag>
                  Saldo: {formatQuantity(selected.saldoPendiente)} {selected.producto.unidadMedida}
                </FormTag>
              </>
            ) : undefined
          }
          aside={
            selected ? (
              <FormStats
                items={[
                  { label: 'Saldo', value: formatQuantity(pendingBalance) },
                  { label: 'A despachar', value: formatQuantity(dispatchQuantity) },
                  { label: 'Restante', value: formatQuantity(remaining) },
                ]}
              />
            ) : undefined
          }
        />

        {schedules.length === 0 && !error ? (
          <FormNote icon={<Route className="h-3.5 w-3.5" />} tone="warn">
            No hay programaciones con saldo pendiente. Genere y confirme una programación primero.
          </FormNote>
        ) : (
          <>
            <FormSection
              icon={<Route className="h-4 w-4" />}
              title="Programación de origen"
              description="Solo se muestran programaciones abiertas con saldo pendiente"
            >
              <Field label="Programación">
                <Select
                  value={scheduleId}
                  onChange={(event) => {
                    const id = Number(event.target.value);
                    setScheduleId(id);
                    const schedule = schedules.find((item) => item.id === id);
                    setCantidad(schedule ? String(schedule.saldoPendiente) : '');
                  }}
                >
                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {formatDate(schedule.fechaProgramada)} · {schedule.entidad.razonSocial} · {schedule.producto.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
            </FormSection>

            <FormSection
              icon={<Truck className="h-4 w-4" />}
              title="Cantidad a despachar"
              description="El stock se reserva automáticamente al crear el despacho"
            >
              <FormGrid>
                <Field label="Cantidad">
                  <Input type="number" min={0.001} step="0.001" value={cantidad} onChange={(event) => setCantidad(event.target.value)} />
                </Field>
                <Field label="Unidad de medida">
                  <Input value={selected?.producto.unidadMedida ?? ''} disabled readOnly />
                </Field>
              </FormGrid>

              {selected && (
                <FormStats
                  className="fk-gap-top"
                  items={[
                    { label: 'Saldo pendiente', value: formatQuantity(pendingBalance) },
                    { label: 'A despachar', value: formatQuantity(dispatchQuantity) },
                    { label: 'Saldo restante', value: formatQuantity(remaining) },
                  ]}
                />
              )}

              <FormNote icon={<Truck className="h-3.5 w-3.5" />} tone="warn">
                El sistema reserva el stock automáticamente. La reserva se libera al entregar parcialmente o cancelar.
              </FormNote>
            </FormSection>
          </>
        )}
      </div>
    </Modal>
  );
}
