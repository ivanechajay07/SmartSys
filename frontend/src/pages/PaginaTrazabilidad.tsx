import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Info,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, formatQuantity } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import type { IngresoAlmacen, OrdenServicio, SalidaAlmacen } from '@/types';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorAlert,
  Input,
  Spinner,
} from '@/components/ui';
import {
  ModuleHero,
  ModuleKpi,
  ModulePagination,
  usePagination,
} from '@/components/module';
import '@/styles/modules.css';

type Tab = 'orders' | 'entries' | 'exits';

const TABS = [
  { key: 'orders' as const, label: 'Órdenes de servicio', Icon: ClipboardList },
  { key: 'entries' as const, label: 'Ingresos de almacén', Icon: PackageCheck },
  { key: 'exits' as const, label: 'Salidas de almacén', Icon: Truck },
];

const SEARCH_PLACEHOLDER: Record<Tab, string> = {
  orders: 'Buscar cliente, RUC o solicitud',
  entries: 'Buscar guía, proveedor o producto',
  exits: 'Buscar guía, despacho o producto',
};

function productosIngreso(item: IngresoAlmacen): string {
  if (item.detalles.length === 0) return 'Sin detalle';
  return item.detalles
    .map((detalle) => `${detalle.producto} × ${formatQuantity(detalle.cantidad)}`)
    .join(' · ');
}

function productosSalida(item: SalidaAlmacen): string {
  if (item.detalles.length === 0) return 'Sin detalle';
  return item.detalles
    .map((detalle) => `${detalle.producto} × ${formatQuantity(detalle.cantidad)}`)
    .join(' · ');
}

function coincide(values: Array<string | number | undefined | null>, term: string): boolean {
  if (!term) return true;
  return values.some((value) => String(value ?? '').toLowerCase().includes(term));
}

export default function PaginaTrazabilidad() {
  const [tab, setTab] = useState<Tab>('orders');
  const [search, setSearch] = useState('');
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  const orders = useApiQuery<OrdenServicio[]>(() => api.get('/service-orders').then((r) => r.data));
  const entries = useApiQuery<IngresoAlmacen[]>(() => api.get('/warehouse/entries').then((r) => r.data));
  const exits = useApiQuery<SalidaAlmacen[]>(() => api.get('/warehouse/exits').then((r) => r.data));

  const term = search.trim().toLowerCase();

  const filteredOrders = useMemo(
    () => (orders.data ?? []).filter((item) => coincide(
      [item.id, item.clienteNombre, item.clienteRuc, item.tipoServicio, item.estado, item.solicitudCodigo],
      term,
    )),
    [orders.data, term],
  );

  const filteredEntries = useMemo(
    () => (entries.data ?? []).filter((item) => coincide(
      [item.id, item.guia, item.proveedor, item.usuario, item.observacion, productosIngreso(item)],
      term,
    )),
    [entries.data, term],
  );

  const filteredExits = useMemo(
    () => (exits.data ?? []).filter((item) => coincide(
      [item.id, item.guia, item.tipoEntrega, item.usuario, item.despachoCodigo, productosSalida(item)],
      term,
    )),
    [exits.data, term],
  );

  const ordersPagination = usePagination(filteredOrders, 8, term);
  const entriesPagination = usePagination(filteredEntries, 8, term);
  const exitsPagination = usePagination(filteredExits, 8, term);

  const reloadAll = () => {
    orders.reload();
    entries.reload();
    exits.reload();
  };

  const loading = tab === 'orders' ? orders.loading : tab === 'entries' ? entries.loading : exits.loading;
  const error = tab === 'orders' ? orders.error : tab === 'entries' ? entries.error : exits.error;
  const retry = tab === 'orders' ? orders.reload : tab === 'entries' ? entries.reload : exits.reload;
  const filtered = tab === 'orders' ? filteredOrders : tab === 'entries' ? filteredEntries : filteredExits;

  return (
    <div className="mod-page">
      <ModuleHero
        eyebrow="Control de movimientos"
        title="Trazabilidad"
        description="Órdenes de servicio, ingresos y salidas de almacén con sus detalles, proveedor y usuario responsable. Consulte el origen de cada solicitud y el despacho asociado a cada salida."
        actions={
          <button type="button" onClick={reloadAll} className="mod-hero-button-soft" disabled={loading}>
            <RefreshCw className={clsx('h-3.5 w-3.5', loading && 'animate-spin')} /> Actualizar
          </button>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-3">
        <ModuleKpi
          label="Órdenes de servicio"
          value={orders.data?.length ?? 0}
          hint="Generadas desde solicitudes"
          icon={<ClipboardList className="h-5 w-5" />}
          tone="brand"
          active={tab === 'orders'}
          onClick={() => setTab('orders')}
          delay="mod-reveal-1"
        />
        <ModuleKpi
          label="Ingresos de almacén"
          value={entries.data?.length ?? 0}
          hint="Con proveedor y detalle"
          icon={<PackageCheck className="h-5 w-5" />}
          tone="sky"
          active={tab === 'entries'}
          onClick={() => setTab('entries')}
          delay="mod-reveal-2"
        />
        <ModuleKpi
          label="Salidas de almacén"
          value={exits.data?.length ?? 0}
          hint="Generadas desde despachos"
          icon={<Truck className="h-5 w-5" />}
          tone="amber"
          active={tab === 'exits'}
          onClick={() => setTab('exits')}
          delay="mod-reveal-3"
        />
      </div>

      <div className="mod-callout">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        <span>
          Vista de solo lectura. Las órdenes se generan al crear solicitudes, los ingresos desde
          Inventario y las salidas desde Despachos. Aquí solo se consolidan para consulta y auditoría.
        </span>
      </div>

      <div className="mod-tabs mod-reveal mod-reveal-2">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={clsx(tab === key && 'is-active')}
            onClick={() => {
              setTab(key);
              setSearch('');
              setExpandedEntry(null);
            }}
          >
            <Icon className="h-4 w-4" /> {label}
            <span className="mod-tabs-count">
              {key === 'orders' && (orders.data?.length ?? 0)}
              {key === 'entries' && (entries.data?.length ?? 0)}
              {key === 'exits' && (exits.data?.length ?? 0)}
            </span>
          </button>
        ))}
      </div>

      <Card className="mod-reveal mod-reveal-2">
        <div className="mod-toolbar">
          <div className="mod-toolbar-top">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {tab === 'orders' && 'Órdenes de servicio'}
                {tab === 'entries' && 'Ingresos de almacén'}
                {tab === 'exits' && 'Salidas de almacén'}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {filtered.length} registro{filtered.length === 1 ? '' : 's'} encontrado{filtered.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="mod-search">
              <Search className="mod-search-icon h-4 w-4" />
              <Input
                className="pl-9"
                placeholder={SEARCH_PLACEHOLDER[tab]}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {error ? (
        <Card>
          <div className="p-5">
            <ErrorAlert message={error} onRetry={retry} />
          </div>
        </Card>
      ) : loading ? (
        <Spinner />
      ) : tab === 'orders' ? (
        <Card>
          <CardHeader title={`Órdenes de servicio (${filteredOrders.length})`} />
          {filteredOrders.length === 0 ? (
            <EmptyState
              title="Sin órdenes de servicio"
              description={term
                ? 'Ninguna orden coincide con la búsqueda.'
                : 'Cada nueva solicitud de material genera automáticamente una orden de servicio.'}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Cliente</th>
                      <th>RUC</th>
                      <th>Servicio</th>
                      <th>Fecha</th>
                      <th>Solicitud</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersPagination.pageItems.map((item) => (
                      <tr key={item.id}>
                        <td className="font-mono text-xs text-slate-500">#{item.id}</td>
                        <td className="font-medium text-slate-800">{item.clienteNombre}</td>
                        <td className="font-mono text-xs">{item.clienteRuc}</td>
                        <td className="text-xs">{item.tipoServicio ?? '-'}</td>
                        <td className="whitespace-nowrap text-xs">{formatDate(item.fechaServicio)}</td>
                        <td className="font-mono text-xs text-slate-600">{item.solicitudCodigo ?? '-'}</td>
                        <td><Badge tone={item.estado === 'ACTIVO' ? 'green' : 'slate'}>{item.estado}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ModulePagination
                page={ordersPagination.page}
                pageCount={ordersPagination.pageCount}
                total={ordersPagination.total}
                from={ordersPagination.from}
                to={ordersPagination.to}
                pageSize={ordersPagination.pageSize}
                onPageChange={ordersPagination.setPage}
              />
            </>
          )}
        </Card>
      ) : tab === 'entries' ? (
        <Card>
          <CardHeader title={`Ingresos de almacén (${filteredEntries.length})`} />
          {filteredEntries.length === 0 ? (
            <EmptyState
              title="Sin ingresos de almacén"
              description={term
                ? 'Ningún ingreso coincide con la búsqueda.'
                : 'Los ingresos registrados en Inventario aparecerán aquí con su guía y proveedor.'}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th aria-label="Detalle" />
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Guía</th>
                      <th>Proveedor</th>
                      <th>Productos</th>
                      <th>Usuario</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entriesPagination.pageItems.map((item) => (
                      <Fragment key={item.id}>
                        <tr>
                          <td className="w-8">
                            <button
                              type="button"
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                              aria-label={expandedEntry === item.id ? 'Ocultar detalle' : 'Ver detalle'}
                              onClick={() => setExpandedEntry(expandedEntry === item.id ? null : item.id)}
                            >
                              {expandedEntry === item.id
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="font-mono text-xs text-slate-500">#{item.id}</td>
                          <td className="whitespace-nowrap text-xs">{formatDate(item.fecha)}</td>
                          <td className="font-mono text-xs">{item.guia ?? '-'}</td>
                          <td className="text-xs">{item.proveedor ?? 'Sin proveedor'}</td>
                          <td className="max-w-[280px] text-xs text-slate-600">{productosIngreso(item)}</td>
                          <td className="text-xs">{item.usuario || '-'}</td>
                          <td>
                            <Badge tone={item.estado ? 'green' : 'slate'}>
                              {item.estado ? 'Activo' : 'Anulado'}
                            </Badge>
                          </td>
                        </tr>
                        {expandedEntry === item.id && (
                          <tr>
                            <td colSpan={8} className="bg-slate-50/70">
                              {item.detalles.length === 0 ? (
                                <p className="text-xs text-slate-400">Sin detalle de productos.</p>
                              ) : (
                                <table className="table">
                                  <thead>
                                    <tr>
                                      <th>Código</th>
                                      <th>Producto</th>
                                      <th className="text-right">Cantidad</th>
                                      <th>Lote</th>
                                      <th>Vencimiento</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.detalles.map((detalle) => (
                                      <tr key={detalle.id}>
                                        <td className="font-mono text-xs text-slate-500">{detalle.codigoProducto}</td>
                                        <td className="text-xs font-medium">{detalle.producto}</td>
                                        <td className="text-right text-xs">{formatQuantity(detalle.cantidad)}</td>
                                        <td className="text-xs">{detalle.lote ?? '-'}</td>
                                        <td className="whitespace-nowrap text-xs">
                                          {detalle.fechaVencimiento ? formatDate(detalle.fechaVencimiento) : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <ModulePagination
                page={entriesPagination.page}
                pageCount={entriesPagination.pageCount}
                total={entriesPagination.total}
                from={entriesPagination.from}
                to={entriesPagination.to}
                pageSize={entriesPagination.pageSize}
                onPageChange={entriesPagination.setPage}
              />
            </>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader title={`Salidas de almacén (${filteredExits.length})`} />
          {filteredExits.length === 0 ? (
            <EmptyState
              title="Sin salidas de almacén"
              description={term
                ? 'Ninguna salida coincide con la búsqueda.'
                : 'Cada despacho genera una salida de almacén con su guía y detalle.'}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Guía</th>
                      <th>Tipo</th>
                      <th>Despacho</th>
                      <th>Productos</th>
                      <th>Usuario</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exitsPagination.pageItems.map((item) => (
                      <tr key={item.id}>
                        <td className="font-mono text-xs text-slate-500">#{item.id}</td>
                        <td className="whitespace-nowrap text-xs">{formatDate(item.fecha)}</td>
                        <td className="font-mono text-xs">{item.guia ?? '-'}</td>
                        <td className="text-xs">{item.tipoEntrega ?? '-'}</td>
                        <td className="whitespace-nowrap text-xs">
                          {item.despachoId ? (
                            <Link
                              to={`/despachos/${item.despachoId}`}
                              className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-brand-700 hover:underline"
                            >
                              {item.despachoCodigo ?? `#${item.despachoId}`}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="max-w-[260px] text-xs text-slate-600">{productosSalida(item)}</td>
                        <td className="text-xs">{item.usuario || '-'}</td>
                        <td>
                          <Badge tone={item.estado ? 'green' : 'slate'}>
                            {item.estado ? 'Activo' : 'Anulado'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ModulePagination
                page={exitsPagination.page}
                pageCount={exitsPagination.pageCount}
                total={exitsPagination.total}
                from={exitsPagination.from}
                to={exitsPagination.to}
                pageSize={exitsPagination.pageSize}
                onPageChange={exitsPagination.setPage}
              />
            </>
          )}
        </Card>
      )}
    </div>
  );
}
