import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime, formatNumber, formatQuantity } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import type { Recepcion } from '@/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorAlert,
  Input,
  Modal,
  Spinner,
} from '@/components/ui';
import {
  ModuleChips,
  ModuleHero,
  ModuleKpi,
  ModulePagination,
  ModuleViewToggle,
  useResponsiveView,
  usePagination,
} from '@/components/module';
import { FormHero, FormNote, FormSection, FormStats, FormTag } from '@/components/FormKit';
import { SortableTh, useTableSort } from '@/components/sortable';
import '@/styles/modules.css';

const CONFORMITY_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'SI', label: 'Conformes' },
  { value: 'NO', label: 'No conformes' },
];

export default function PaginaRecepciones() {
  const navigate = useNavigate();
  const receptions = useApiQuery<Recepcion[]>(() => api.get('/receptions').then((r) => r.data));
  const [search, setSearch] = useState('');
  const [conformity, setConformity] = useState('');
  const [view, setView] = useResponsiveView('table');
  const [selected, setSelected] = useState<Recepcion | null>(null);

  const data = useMemo(() => receptions.data ?? [], [receptions.data]);

  const counts = useMemo(() => {
    const conformes = data.filter((item) => item.conforme).length;
    return {
      '': data.length,
      SI: conformes,
      NO: data.length - conformes,
    } as Record<string, number>;
  }, [data]);

  const rate = data.length ? (counts.SI / data.length) * 100 : 0;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((item) => {
      const matchesConformity =
        !conformity || (conformity === 'SI' ? item.conforme : !item.conforme);
      const matchesTerm =
        !term ||
        item.recibidoPor.toLowerCase().includes(term) ||
        item.despacho.codigo.toLowerCase().includes(term) ||
        item.despacho.entidad.razonSocial.toLowerCase().includes(term) ||
        item.despacho.puntoEntrega.nombre.toLowerCase().includes(term);
      return matchesConformity && matchesTerm;
    });
  }, [data, search, conformity]);

  const sorting = useTableSort(filtered, {
    despacho: (item) => item.despacho.codigo,
    entidad: (item) => item.despacho.entidad.razonSocial,
    recibidoPor: (item) => item.recibidoPor,
    fecha: (item) => new Date(item.fechaHora).getTime(),
    recibido: (item) => totals(item).received,
    rechazado: (item) => totals(item).rejected,
    conformidad: (item) => Number(item.conforme),
  });
  const pagination = usePagination(
    sorting.rows,
    8,
    `${search}|${conformity}|${sorting.sort?.key ?? ''}|${sorting.sort?.dir ?? ''}`,
  );

  const totals = (item: Recepcion) => ({
    received: item.detalles.reduce((sum, det) => sum + Number(det.cantidadRecibida), 0),
    rejected: item.detalles.reduce((sum, det) => sum + Number(det.cantidadRechazada), 0),
  });

  return (
    <div className="mod-page">
      <ModuleHero
        eyebrow="Conformidad y evidencia"
        title="Recepciones en punto de entrega"
        description="Registro de lo recibido, cantidades rechazadas y evidencia de la entrega. Cada recepción queda vinculada al despacho y al responsable que firmó."
        actions={
          <button
            type="button"
            onClick={receptions.reload}
            className="mod-hero-button-soft"
            disabled={receptions.loading}
          >
            <RefreshCw className={clsx('h-3.5 w-3.5', receptions.loading && 'animate-spin')} /> Actualizar
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <ModuleKpi
          label="Recepciones"
          value={formatNumber(data.length)}
          hint="Actas registradas"
          icon={<PackageCheck className="h-5 w-5" />}
          tone="brand"
          active={conformity === ''}
          onClick={() => setConformity('')}
          delay="mod-reveal-1"
        />
        <ModuleKpi
          label="Conformes"
          value={formatNumber(counts.SI)}
          hint="Sin observaciones"
          icon={<BadgeCheck className="h-5 w-5" />}
          tone="sky"
          active={conformity === 'SI'}
          onClick={() => setConformity(conformity === 'SI' ? '' : 'SI')}
          delay="mod-reveal-2"
        />
        <ModuleKpi
          label="No conformes"
          value={formatNumber(counts.NO)}
          hint="Con rechazo o incidencia"
          icon={<XCircle className="h-5 w-5" />}
          tone="rose"
          active={conformity === 'NO'}
          onClick={() => setConformity(conformity === 'NO' ? '' : 'NO')}
          delay="mod-reveal-3"
        />
        <ModuleKpi
          label="Tasa de conformidad"
          value={`${formatNumber(rate, 2)}%`}
          hint="Sobre el total recibido"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="indigo"
          delay="mod-reveal-4"
        />
      </div>

      <Card className="mod-reveal mod-reveal-2">
        <div className="mod-toolbar">
          <div className="mod-toolbar-top">
            <div>
              <h3 className="text-base font-bold text-slate-800">Actas de recepción ({filtered.length})</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Abre un acta para revisar el detalle recibido y las cantidades rechazadas.
              </p>
            </div>

            <div className="mod-toolbar-controls">
              <div className="mod-search">
                <Search className="mod-search-icon h-4 w-4" />
                <Input
                  className="pl-9"
                  placeholder="Buscar despacho, entidad o receptor"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <ModuleViewToggle value={view} onChange={setView} />
            </div>
          </div>

          <ModuleChips
            filters={CONFORMITY_FILTERS}
            value={conformity}
            onChange={setConformity}
            counts={counts}
            ariaLabel="Filtrar por conformidad"
          />
        </div>

        {receptions.error && (
          <div className="p-5">
            <ErrorAlert message={receptions.error} onRetry={receptions.reload} />
          </div>
        )}

        {receptions.loading && !receptions.data ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Sin recepciones"
            description="Las recepciones se registran desde el detalle de cada despacho entregado."
          />
        ) : view === 'grid' ? (
          <div className="mod-grid">
            {pagination.pageItems.map((item) => {
              const { received, rejected } = totals(item);
              return (
                <button key={item.id} type="button" className="mod-card" onClick={() => setSelected(item)}>
                  <div>
                    <div className="mod-card-top">
                      <span className="mod-code">{item.despacho.codigo}</span>
                      <Badge tone={item.conforme ? 'green' : 'red'}>
                        {item.conforme ? 'Conforme' : 'No conforme'}
                      </Badge>
                    </div>
                    <p className="mod-card-title">{item.despacho.entidad.razonSocial}</p>
                    <p className="mod-card-sub">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      {item.despacho.puntoEntrega.nombre}
                    </p>
                  </div>
                  <div>
                    <div className="mod-card-metrics">
                      <div>
                        <span>Recibido</span>
                        <strong>{formatQuantity(received)}</strong>
                      </div>
                      <div>
                        <span>Rechazado</span>
                        <strong className={rejected > 0 ? 'text-rose-600' : undefined}>{formatQuantity(rejected)}</strong>
                      </div>
                    </div>
                    <div className="mod-card-footer mt-3">
                      <span>{item.recibidoPor}</span>
                      <span>{formatDateTime(item.fechaHora)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-pro">
              <thead>
                <tr>
                  <SortableTh label="Despacho" column="despacho" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Entidad / punto" column="entidad" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Recibido por" column="recibidoPor" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Fecha" column="fecha" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Recibido" column="recibido" className="text-right" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Rechazado" column="rechazado" className="text-right" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Conformidad" column="conformidad" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <th />
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((item) => {
                  const { received, rejected } = totals(item);
                  return (
                    <tr key={item.id} className="mod-row" onClick={() => setSelected(item)}>
                      <td>
                        <span className="mod-code">{item.despacho.codigo}</span>
                      </td>
                      <td>
                        <p className="font-semibold text-slate-800">{item.despacho.entidad.razonSocial}</p>
                        <p className="text-xs text-slate-400">{item.despacho.puntoEntrega.nombre}</p>
                      </td>
                      <td className="text-xs">{item.recibidoPor}</td>
                      <td className="whitespace-nowrap text-xs">{formatDateTime(item.fechaHora)}</td>
                      <td className="text-right font-semibold">{formatQuantity(received)}</td>
                      <td className={clsx('text-right', rejected > 0 && 'font-semibold text-rose-600')}>
                        {formatQuantity(rejected)}
                      </td>
                      <td>
                        <Badge tone={item.conforme ? 'green' : 'red'}>
                          {item.conforme ? 'Conforme' : 'No conforme'}
                        </Badge>
                      </td>
                      <td className="text-right" onClick={(event) => event.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => setSelected(item)}>
                          <Eye className="h-4 w-4" /> Ver
                        </Button>
                      </td>
                    </tr>
                  );
                })}
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

      <Modal
        open={Boolean(selected)}
        title="Detalle de recepción"
        subtitle="Acta de recepción y control de conformidad."
        icon={<ClipboardCheck className="h-4 w-4" />}
        tone={selected?.conforme ? 'brand' : 'rose'}
        onClose={() => setSelected(null)}
        size="lg"
        footer={
          selected && (
            <Button variant="secondary" onClick={() => navigate(`/despachos/${selected.despacho.id}`)}>
              <PackageCheck className="h-4 w-4" /> Ir al despacho
            </Button>
          )
        }
      >
        {selected && (
          <div className="fk-form">
            <FormHero
              tone={selected.conforme ? 'brand' : 'rose'}
              icon={selected.conforme ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              eyebrow={<><ClipboardCheck className="h-3 w-3" /> Acta de recepción</>}
              title={selected.despacho.codigo}
              subtitle={`${selected.despacho.entidad.razonSocial} · ${selected.despacho.puntoEntrega.nombre}`}
              tags={
                <>
                  <FormTag tone={selected.conforme ? 'ok' : 'warn'}>
                    {selected.conforme ? 'Conforme' : 'No conforme'}
                  </FormTag>
                  <FormTag>{selected.estado}</FormTag>
                  <FormTag>{formatDateTime(selected.fechaHora)}</FormTag>
                </>
              }
              aside={
                <FormStats
                  items={[
                    { label: 'Recibidas', value: formatQuantity(totals(selected).received) },
                    { label: 'Rechazadas', value: formatQuantity(totals(selected).rejected) },
                    { label: 'Productos', value: selected.detalles.length },
                  ]}
                />
              }
            />

            {!selected.conforme && (
              <FormNote icon={<AlertTriangle className="h-3.5 w-3.5" />} tone="warn">
                Acta marcada como <strong>no conforme</strong>. Revisa las cantidades rechazadas y las
                observaciones antes de cerrar el caso con el despacho.
              </FormNote>
            )}

            <FormSection
              icon={<FileText className="h-4 w-4" />}
              title="Datos del acta"
              description="Trazabilidad del despacho, responsable y documento de identidad"
            >
              <div className="fk-info-grid">
                <div className="fk-info">
                  <span>Despacho</span>
                  <strong>{selected.despacho.codigo}</strong>
                </div>
                <div className="fk-info">
                  <span>Entidad</span>
                  <strong>{selected.despacho.entidad.razonSocial}</strong>
                </div>
                <div className="fk-info">
                  <span>Punto de entrega</span>
                  <strong>{selected.despacho.puntoEntrega.nombre}</strong>
                </div>
                <div className="fk-info">
                  <span>Recibido por</span>
                  <strong>{selected.recibidoPor}</strong>
                </div>
                <div className="fk-info">
                  <span>Documento</span>
                  <strong>{selected.documentoIdentidad ?? '—'}</strong>
                </div>
                <div className="fk-info">
                  <span>Registrado por</span>
                  <strong>{selected.usuario.nombres} {selected.usuario.apellidos}</strong>
                </div>
                <div className="fk-info fk-info-wide">
                  <span>Observaciones</span>
                  <strong>{selected.observaciones ?? 'Sin observaciones registradas'}</strong>
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={<Package className="h-4 w-4" />}
              title="Productos recibidos"
              description="Detalle de cantidades conformes y rechazadas"
              actions={<Badge tone={selected.conforme ? 'green' : 'red'}>{selected.detalles.length} {selected.detalles.length === 1 ? 'ítem' : 'ítems'}</Badge>}
            >
              <div className="fk-table-wrap">
                <table className="table table-pro">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className="text-right">Recibida</th>
                      <th className="text-right">Rechazada</th>
                      <th>Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.detalles.map((det) => (
                      <tr key={det.id}>
                        <td>
                          <p className="font-medium text-slate-700">{det.producto.nombre}</p>
                          <p className="text-xs text-slate-400">{det.producto.unidadMedida}</p>
                        </td>
                        <td className="text-right">{formatQuantity(det.cantidadRecibida)}</td>
                        <td className={clsx('text-right', Number(det.cantidadRechazada) > 0 && 'font-semibold text-rose-600')}>
                          {formatQuantity(det.cantidadRechazada)}
                        </td>
                        <td className="text-xs text-slate-500">{det.observaciones ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td className="text-right">{formatQuantity(totals(selected).received)}</td>
                      <td className="text-right">{formatQuantity(totals(selected).rejected)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </FormSection>
          </div>
        )}
      </Modal>
    </div>
  );
}
