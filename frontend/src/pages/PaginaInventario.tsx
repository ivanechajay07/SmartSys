import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowDownUp,
  Boxes,
  Layers,
  PackagePlus,
  RefreshCw,
  Search,
  Settings2,
  Warehouse,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { toastSuccess } from '@/lib/toasts';
import { formatDateTime, formatNumber, formatQuantity, stateLabel } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import type { Inventario, MovimientoInventario, Producto, Proveedor, TipoMovimiento } from '@/types';
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
import {
  ModuleChips,
  ModuleHero,
  ModuleKpi,
  ModulePagination,
  ModuleViewToggle,
  usePagination,
} from '@/components/module';
import { FormGrid, FormHero, FormNote, FormSection, FormStats, FormTag } from '@/components/FormKit';
import '@/styles/modules.css';

type Tab = 'stock' | 'movements';
type ModalKind = 'entry' | 'adjustment' | null;

const MOVEMENT_TYPES: TipoMovimiento[] = ['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'MERMA'];

const MOVEMENT_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'INGRESO', label: 'Ingresos' },
  { value: 'SALIDA', label: 'Salidas' },
  { value: 'AJUSTE', label: 'Ajustes' },
  { value: 'MERMA', label: 'Mermas' },
];

export default function PaginaInventario() {
  const can = useAuth((state) => state.can);
  const canAdjust = can('INVENTARIO', 'crear') || can('INVENTARIO', 'editar');

  const [tab, setTab] = useState<Tab>('stock');
  const [search, setSearch] = useState('');
  const [movementSearch, setMovementSearch] = useState('');
  const [movementType, setMovementType] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [modal, setModal] = useState<ModalKind>(null);

  const stock = useApiQuery<Inventario[]>(() => api.get('/inventory').then((r) => r.data));
  const movements = useApiQuery<MovimientoInventario[]>(() => api.get('/inventory/movements').then((r) => r.data));
  const products = useApiQuery<Producto[]>(() => api.get('/products').then((r) => r.data));

  const stockData = useMemo(() => stock.data ?? [], [stock.data]);
  const movementData = useMemo(() => movements.data ?? [], [movements.data]);

  const lowCount = stockData.filter((item) => Number(item.stockDisponible) < Number(item.stockMinimo)).length;
  const reserved = stockData.reduce((sum, item) => sum + Number(item.stockReservado), 0);

  const filteredStock = useMemo(() => {
    const term = search.trim().toLowerCase();
    return stockData.filter((item) => {
      const matchesTerm =
        !term ||
        item.producto.nombre.toLowerCase().includes(term) ||
        item.producto.codigo.toLowerCase().includes(term) ||
        (item.producto.categoria ?? '').toLowerCase().includes(term);
      const matchesLow = !lowOnly || Number(item.stockDisponible) < Number(item.stockMinimo);
      return matchesTerm && matchesLow;
    });
  }, [stockData, search, lowOnly]);

  const movementCounts = useMemo(() => {
    const map: Record<string, number> = { '': movementData.length };
    for (const item of movementData) {
      map.INGRESO = (map.INGRESO ?? 0) + (item.tipo === 'INGRESO' ? 1 : 0);
      map.SALIDA = (map.SALIDA ?? 0) + (item.tipo === 'SALIDA' ? 1 : 0);
      map.AJUSTE = (map.AJUSTE ?? 0) + (item.tipo.startsWith('AJUSTE') ? 1 : 0);
      map.MERMA = (map.MERMA ?? 0) + (item.tipo === 'MERMA' ? 1 : 0);
    }
    return map;
  }, [movementData]);

  const filteredMovements = useMemo(() => {
    const term = movementSearch.trim().toLowerCase();
    return movementData.filter((item) => {
      const matchesType =
        !movementType ||
        (movementType === 'AJUSTE' ? item.tipo.startsWith('AJUSTE') : item.tipo === movementType);
      const matchesTerm =
        !term ||
        item.producto.nombre.toLowerCase().includes(term) ||
        item.producto.codigo.toLowerCase().includes(term) ||
        (item.referencia ?? '').toLowerCase().includes(term) ||
        `${item.usuario?.nombres ?? ''} ${item.usuario?.apellidos ?? ''}`.toLowerCase().includes(term);
      return matchesType && matchesTerm;
    });
  }, [movementData, movementSearch, movementType]);

  const stockPagination = usePagination(filteredStock, 8, `${search}|${lowOnly}|${view}`);
  const movementPagination = usePagination(
    filteredMovements,
    10,
    `${movementSearch}|${movementType}`,
  );

  const onSaved = (message: string) => {
    setModal(null);
    toastSuccess(message);
    stock.reload();
    movements.reload();
  };

  return (
    <div className="mod-page">
      <ModuleHero
        eyebrow="Control de existencias"
        title="Inventario central"
        description="Stock físico, reservado y disponible, con ingresos, ajustes y trazabilidad completa de cada movimiento del almacén."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                stock.reload();
                movements.reload();
              }}
              className="mod-hero-button-soft"
              disabled={stock.loading || movements.loading}
            >
              <RefreshCw className={clsx('h-3.5 w-3.5', (stock.loading || movements.loading) && 'animate-spin')} /> Actualizar
            </button>
            {canAdjust && (
              <>
                <button type="button" onClick={() => setModal('adjustment')} className="mod-hero-button-soft">
                  <Settings2 className="h-3.5 w-3.5" /> Ajuste
                </button>
                <button type="button" onClick={() => setModal('entry')} className="mod-hero-button">
                  <PackagePlus className="h-3.5 w-3.5" /> Ingreso
                </button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <ModuleKpi
          label="Productos en stock"
          value={formatNumber(stockData.length)}
          hint="Registros de inventario"
          icon={<Warehouse className="h-5 w-5" />}
          tone="brand"
          active={tab === 'stock' && !lowOnly}
          onClick={() => {
            setTab('stock');
            setLowOnly(false);
          }}
          delay="mod-reveal-1"
        />
        <ModuleKpi
          label="Bajo mínimo"
          value={formatNumber(lowCount)}
          hint="Requieren reposición"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="rose"
          active={tab === 'stock' && lowOnly}
          onClick={() => {
            setTab('stock');
            setLowOnly(!lowOnly);
          }}
          delay="mod-reveal-2"
        />
        <ModuleKpi
          label="Unidades reservadas"
          value={formatQuantity(reserved)}
          hint="Comprometidas en despachos"
          icon={<Layers className="h-5 w-5" />}
          tone="amber"
          delay="mod-reveal-3"
        />
        <ModuleKpi
          label="Movimientos"
          value={formatNumber(movementData.length)}
          hint="Historial trazable"
          icon={<ArrowDownUp className="h-5 w-5" />}
          tone="indigo"
          active={tab === 'movements'}
          onClick={() => setTab('movements')}
          delay="mod-reveal-4"
        />
      </div>

      <div className="mod-tabs mod-reveal mod-reveal-2">
        <button type="button" className={clsx(tab === 'stock' && 'is-active')} onClick={() => setTab('stock')}>
          <Boxes className="h-4 w-4" /> Stock
          <span className="mod-tabs-count">{stockData.length}</span>
        </button>
        <button type="button" className={clsx(tab === 'movements' && 'is-active')} onClick={() => setTab('movements')}>
          <ArrowDownUp className="h-4 w-4" /> Movimientos
          <span className="mod-tabs-count">{movementData.length}</span>
        </button>
      </div>

      {tab === 'stock' ? (
        <Card className="mod-reveal mod-reveal-2">
          <div className="mod-toolbar">
            <div className="mod-toolbar-top">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Stock por producto ({filteredStock.length})
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Disponible = físico − reservado. Los productos bajo mínimo se resaltan en rojo.
                </p>
              </div>

              <div className="mod-toolbar-controls">
                <div className="mod-search">
                  <Search className="mod-search-icon h-4 w-4" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar producto, código o categoría"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <ModuleViewToggle value={view} onChange={setView} />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <ModuleChips
                filters={[
                  { value: '', label: 'Todo el stock' },
                  { value: 'LOW', label: 'Bajo mínimo' },
                ]}
                value={lowOnly ? 'LOW' : ''}
                onChange={(value) => setLowOnly(value === 'LOW')}
                counts={{ '': stockData.length, LOW: lowCount }}
                ariaLabel="Filtrar stock"
              />
              <span className="text-[11px] font-semibold text-slate-400">
                {formatQuantity(stockData.reduce((sum, item) => sum + Number(item.stockDisponible), 0))} unidades disponibles
              </span>
            </div>
          </div>

          {stock.error && (
            <div className="p-5">
              <ErrorAlert message={stock.error} onRetry={stock.reload} />
            </div>
          )}

          {stock.loading && !stock.data ? (
            <Spinner />
          ) : filteredStock.length === 0 ? (
            <EmptyState
              title="Sin registros de stock"
              description="Registre productos e ingresos para habilitar el inventario."
            />
          ) : view === 'grid' ? (
            <div className="mod-grid">
              {stockPagination.pageItems.map((item) => {
                const low = Number(item.stockDisponible) < Number(item.stockMinimo);
                return (
                  <div key={item.id} className="mod-card">
                    <div>
                      <div className="mod-card-top">
                        <span className="mod-code">{item.producto.codigo}</span>
                        <Badge tone={low ? 'red' : 'green'}>{low ? 'Bajo mínimo' : 'Normal'}</Badge>
                      </div>
                      <p className="mod-card-title">{item.producto.nombre}</p>
                      <p className="mod-card-sub">
                        {item.producto.categoria ?? 'Sin categoría'} · {item.producto.unidadMedida}
                      </p>
                    </div>
                    <div className="mod-card-metrics">
                      <div>
                        <span>Físico</span>
                        <strong>{formatQuantity(item.stockFisico)}</strong>
                      </div>
                      <div>
                        <span>Reservado</span>
                        <strong>{formatQuantity(item.stockReservado)}</strong>
                      </div>
                      <div>
                        <span>Disponible</span>
                        <strong className={low ? 'text-rose-600' : undefined}>{formatQuantity(item.stockDisponible)}</strong>
                      </div>
                      <div>
                        <span>Mínimo</span>
                        <strong>{formatQuantity(item.stockMinimo)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Unidad</th>
                    <th className="text-right">Físico</th>
                    <th className="text-right">Reservado</th>
                    <th className="text-right">Disponible</th>
                    <th className="text-right">Mínimo</th>
                    <th>Alerta</th>
                  </tr>
                </thead>
                <tbody>
                  {stockPagination.pageItems.map((item) => {
                    const low = Number(item.stockDisponible) < Number(item.stockMinimo);
                    return (
                      <tr key={item.id}>
                        <td>
                          <p className="font-semibold text-slate-800">{item.producto.nombre}</p>
                          <p className="text-xs text-slate-400">{item.producto.codigo}</p>
                        </td>
                        <td className="text-xs">{item.producto.categoria ?? '-'}</td>
                        <td className="text-xs">{item.producto.unidadMedida}</td>
                        <td className="text-right">{formatQuantity(item.stockFisico)}</td>
                        <td className="text-right">{formatQuantity(item.stockReservado)}</td>
                        <td className={clsx('text-right font-bold', low ? 'text-rose-600' : 'text-slate-800')}>
                          {formatQuantity(item.stockDisponible)}
                        </td>
                        <td className="text-right">{formatQuantity(item.stockMinimo)}</td>
                        <td>
                          <Badge tone={low ? 'red' : 'green'}>{low ? 'Bajo mínimo' : 'Normal'}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <ModulePagination
            page={stockPagination.page}
            pageCount={stockPagination.pageCount}
            total={stockPagination.total}
            from={stockPagination.from}
            to={stockPagination.to}
            pageSize={stockPagination.pageSize}
            onPageChange={stockPagination.setPage}
          />
        </Card>
      ) : (
        <Card className="mod-reveal mod-reveal-2">
          <div className="mod-toolbar">
            <div className="mod-toolbar-top">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Historial de movimientos ({filteredMovements.length})
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Cada ingreso, salida, ajuste o merma con su saldo resultante y usuario responsable.
                </p>
              </div>

              <div className="mod-toolbar-controls">
                <div className="mod-search">
                  <Search className="mod-search-icon h-4 w-4" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar producto, referencia o usuario"
                    value={movementSearch}
                    onChange={(event) => setMovementSearch(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={movements.reload}
                  aria-label="Actualizar movimientos"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <ModuleChips
              filters={MOVEMENT_FILTERS}
              value={movementType}
              onChange={setMovementType}
              counts={movementCounts}
              ariaLabel="Filtrar movimientos"
            />
          </div>

          {movements.error && (
            <div className="p-5">
              <ErrorAlert message={movements.error} onRetry={movements.reload} />
            </div>
          )}

          {movements.loading && !movements.data ? (
            <Spinner />
          ) : filteredMovements.length === 0 ? (
            <EmptyState
              title="Sin movimientos"
              description="Los ingresos, salidas y ajustes se registrarán aquí."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th className="text-right">Cantidad</th>
                    <th className="text-right">Saldo</th>
                    <th>Referencia</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {movementPagination.pageItems.map((item) => {
                    const negative = ['SALIDA', 'AJUSTE_NEGATIVO', 'MERMA'].includes(item.tipo);
                    return (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap text-xs">{formatDateTime(item.fecha)}</td>
                        <td>
                          <p className="font-semibold text-slate-800">{item.producto.nombre}</p>
                          <p className="text-xs text-slate-400">{item.producto.codigo}</p>
                        </td>
                        <td>
                          <StatusBadge estado={item.tipo} />
                        </td>
                        <td className={clsx('text-right font-bold', negative ? 'text-rose-600' : 'text-emerald-600')}>
                          {negative ? '-' : '+'}
                          {formatQuantity(item.cantidad)}
                        </td>
                        <td className="text-right">{formatQuantity(item.saldoResultante)}</td>
                        <td className="text-xs text-slate-500">{item.referencia ?? '-'}</td>
                        <td className="text-xs">
                          {item.usuario ? `${item.usuario.nombres} ${item.usuario.apellidos}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <ModulePagination
            page={movementPagination.page}
            pageCount={movementPagination.pageCount}
            total={movementPagination.total}
            from={movementPagination.from}
            to={movementPagination.to}
            pageSize={movementPagination.pageSize}
            onPageChange={movementPagination.setPage}
          />
        </Card>
      )}

      <InventoryMovementModal
        mode={modal}
        onClose={() => setModal(null)}
        products={products.data ?? []}
        stock={stock.data ?? []}
        onSaved={onSaved}
      />
    </div>
  );
}

function InventoryMovementModal({
  mode,
  onClose,
  products,
  stock,
  onSaved,
}: {
  mode: ModalKind;
  onClose: () => void;
  products: Producto[];
  stock: Inventario[];
  onSaved: (message: string) => void;
}) {
  const [productoId, setProductoId] = useState(0);
  const [cantidad, setCantidad] = useState('1');
  const [tipo, setTipo] = useState<TipoMovimiento>('AJUSTE_POSITIVO');
  const [proveedorId, setProveedorId] = useState(0);
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const providers = useApiQuery<Proveedor[]>(() => api.get('/providers').then((r) => r.data));

  useEffect(() => {
    if (!mode) return;
    setProductoId(products[0]?.id ?? 0);
    setCantidad('1');
    setTipo('AJUSTE_POSITIVO');
    setProveedorId(0);
    setReferencia('');
    setObservaciones('');
    setError(null);
  }, [mode, products]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'entry') {
        await api.post('/inventory/entries', {
          productoId,
          cantidad: Number(cantidad),
          referencia,
          observaciones,
          proveedorId: proveedorId || null,
        });
        onSaved('Ingreso de inventario registrado.');
      } else {
        await api.post('/inventory/adjustments', {
          productoId,
          cantidad: Number(cantidad),
          tipo,
          referencia,
          observaciones,
        });
        onSaved('Ajuste de inventario registrado.');
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const selected = products.find((product) => product.id === productoId);
  const stockRow = stock.find((row) => row.producto?.id === productoId);
  const currentStock = stockRow?.stockFisico ?? 0;
  const quantity = Number(cantidad) || 0;
  const isEntry = mode === 'entry';
  const estimatedStock = Math.max(
    0,
    currentStock +
      (isEntry || tipo === 'AJUSTE_POSITIVO' ? quantity : -quantity),
  );

  return (
    <Modal
      open={Boolean(mode)}
      title={isEntry ? 'Registrar ingreso de inventario' : 'Registrar ajuste de inventario'}
      subtitle={
        isEntry
          ? 'Registra la entrada de mercadería al almacén central.'
          : 'Corrige el stock físico con trazabilidad del movimiento.'
      }
      icon={isEntry ? <PackagePlus className="h-4 w-4" /> : <ArrowDownUp className="h-4 w-4" />}
      tone={isEntry ? 'brand' : 'amber'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={busy} disabled={!productoId || Number(cantidad) <= 0} onClick={submit}>
            {isEntry ? 'Registrar ingreso' : 'Registrar ajuste'}
          </Button>
        </>
      }
    >
      <div className="fk-form">
        {error && <ErrorAlert message={error} />}

        <FormHero
          tone={isEntry ? 'brand' : 'amber'}
          icon={isEntry ? <PackagePlus className="h-6 w-6" /> : <ArrowDownUp className="h-6 w-6" />}
          eyebrow={<><Warehouse className="h-3 w-3" /> {isEntry ? 'Entrada de almacén' : 'Ajuste de stock'}</>}
          title={selected?.nombre ?? 'Selecciona un producto'}
          subtitle={selected ? `${selected.codigo} · ${selected.unidadMedida}` : 'Elige el artículo para ver su stock actual'}
          tags={
            selected ? (
              <>
                <FormTag icon={<Layers className="h-3 w-3" />} tone="ok">
                  Stock: {formatQuantity(currentStock)} {selected.unidadMedida}
                </FormTag>
                {selected.requiereLote && <FormTag tone="warn">Requiere lote</FormTag>}
                {selected.requiereVencimiento && <FormTag tone="warn">Requiere vencimiento</FormTag>}
              </>
            ) : undefined
          }
          aside={
            selected ? (
              <FormStats
                items={[
                  { label: 'Stock actual', value: formatQuantity(currentStock) },
                  { label: isEntry ? 'Resultante' : 'Estimado', value: formatQuantity(estimatedStock) },
                ]}
              />
            ) : undefined
          }
        />

        <FormSection
          icon={<Boxes className="h-4 w-4" />}
          title="Producto"
          description="Artículo sobre el que se registrará el movimiento"
        >
          <Field label="Producto">
            <Select value={productoId} onChange={(event) => setProductoId(Number(event.target.value))}>
              <option value={0}>Seleccione producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.codigo} - {product.nombre}</option>
              ))}
            </Select>
          </Field>

          {isEntry && (
            <Field label="Proveedor" hint="Opcional. Se guarda en el ingreso de almacén." className="fk-gap-top">
              <Select value={proveedorId} onChange={(event) => setProveedorId(Number(event.target.value))}>
                <option value={0}>Sin proveedor</option>
                {(providers.data ?? []).map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.ruc} - {provider.razonSocial}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </FormSection>

        <FormSection
          icon={<Layers className="h-4 w-4" />}
          title="Datos del movimiento"
          description="Cantidad, documento de sustento y observaciones"
        >
          <FormGrid>
            <Field label="Cantidad">
              <Input type="number" min={0.001} step="0.001" value={cantidad} onChange={(event) => setCantidad(event.target.value)} />
            </Field>
            {!isEntry && (
              <Field label="Tipo de ajuste">
                <Select value={tipo} onChange={(event) => setTipo(event.target.value as TipoMovimiento)}>
                  {MOVEMENT_TYPES.map((value) => (
                    <option key={value} value={value}>{stateLabel(value)}</option>
                  ))}
                </Select>
              </Field>
            )}
          </FormGrid>

          <Field label="Referencia" hint="Guía de compra, acta, documento interno." className="fk-gap-top">
            <Input placeholder="Ej. GR-2026-00045" value={referencia} onChange={(event) => setReferencia(event.target.value)} />
          </Field>
          <Field label="Observaciones" className="fk-gap-top">
            <Textarea placeholder="Detalle opcional del movimiento" value={observaciones} onChange={(event) => setObservaciones(event.target.value)} />
          </Field>

          <FormStats
            className="fk-gap-top"
            items={[
              { label: 'Stock actual', value: formatQuantity(currentStock) },
              { label: 'Cantidad', value: formatQuantity(quantity) },
              { label: isEntry ? 'Stock resultante' : 'Stock estimado', value: formatQuantity(estimatedStock) },
            ]}
          />
        </FormSection>

        <FormNote icon={<Warehouse className="h-3.5 w-3.5" />} tone={isEntry ? 'ok' : 'warn'}>
          {isEntry
            ? 'El stock se incrementará automáticamente y el ingreso quedará registrado en la auditoría.'
            : 'El ajuste recalcula el stock físico. Conserva la referencia del documento que lo sustenta.'}
        </FormNote>
      </div>
    </Modal>
  );
}
