import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Fingerprint,
  Layers,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  Settings2,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { toastSuccess } from '@/lib/toasts';
import { formatDate, formatQuantity } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import { ROLE_LABELS, useAuth } from '@/store/auth';
import type {
  Clause,
  Contrato,
  EntidadPublica,
  Frecuencia,
  Producto,
  Proveedor,
  PuntoEntrega,
  RolSistema,
  Tdr,
  TdrItem,
  Vehiculo,
} from '@/types';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorAlert,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui';
import { PermisosRolModal } from '@/components/PermisosModal';
import { DatePicker } from '@/components/DatePicker';
import { FormGrid, FormHero, FormMeter, FormNote, FormSection, FormTag } from '@/components/FormKit';
import { FormWizard } from '@/components/FormWizard';
import { SortableTh, useTableSort } from '@/components/sortable';
import {
  ModuleHero,
  ModuleKpi,
  ModulePagination,
  ModuleViewToggle,
  usePagination,
  useResponsiveView,
} from '@/components/module';
import '@/styles/modules.css';

type Tab = 'entities' | 'products' | 'contracts' | 'vehicles' | 'providers' | 'roles';
type ModalKind =
  | 'entity'
  | 'point'
  | 'product'
  | 'contract'
  | 'tdr'
  | 'tdrItem'
  | 'clause'
  | 'vehicle'
  | 'provider'
  | null;

const FREQUENCIES: Frecuencia[] = ['DIARIA', 'SEMANAL', 'QUINCENAL', 'MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'PERSONALIZADA'];

const TABS: { key: Tab; label: string; Icon: typeof Building2 }[] = [
  { key: 'entities', label: 'Entidades', Icon: Building2 },
  { key: 'products', label: 'Productos', Icon: Package },
  { key: 'contracts', label: 'Contratos y TDR', Icon: FileText },
  { key: 'vehicles', label: 'Vehículos', Icon: Truck },
  { key: 'providers', label: 'Proveedores', Icon: Store },
  { key: 'roles', label: 'Roles', Icon: ShieldCheck },
];

export default function PaginaDatosMaestros() {
  const can = useAuth((state) => state.can);
  const canManage = can('DATOS_MAESTROS', 'crear') || can('DATOS_MAESTROS', 'editar');
  const canEditProduct = can('DATOS_MAESTROS', 'editar');
  const canContract = can('DATOS_MAESTROS', 'crear');
  const canManagePermissions = can('USUARIOS', 'editar');

  const [tab, setTab] = useState<Tab>('entities');
  const [view, setView] = useResponsiveView('table');
  const [modal, setModal] = useState<ModalKind>(null);
  const [contextEntity, setContextEntity] = useState<EntidadPublica | null>(null);
  const [contextProduct, setContextProduct] = useState<Producto | null>(null);
  const [contextContract, setContextContract] = useState<Contrato | null>(null);
  const [contextTdr, setContextTdr] = useState<Tdr | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [permisoRole, setPermisoRole] = useState<RolSistema | null>(null);

  const entities = useApiQuery<EntidadPublica[]>(() => api.get('/entities').then((r) => r.data));
  const products = useApiQuery<Producto[]>(() => api.get('/products').then((r) => r.data));
  const contracts = useApiQuery<Contrato[]>(() => api.get('/contracts').then((r) => r.data));
  const vehicles = useApiQuery<Vehiculo[]>(() => api.get('/vehicles').then((r) => r.data));
  const providers = useApiQuery<Proveedor[]>(() => api.get('/providers').then((r) => r.data));
  const roles = useApiQuery<RolSistema[]>(() => api.get('/roles').then((r) => r.data));

  const productList = useMemo(
    () => [...(products.data ?? [])].sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true })),
    [products.data],
  );
  const vehicleList = useMemo(
    () => [...(vehicles.data ?? [])].sort((a, b) => a.placa.localeCompare(b.placa, 'es', { numeric: true })),
    [vehicles.data],
  );
  const providerList = useMemo(
    () => [...(providers.data ?? [])].sort((a, b) => a.razonSocial.localeCompare(b.razonSocial, 'es', { numeric: true })),
    [providers.data],
  );
  const roleList = useMemo(
    () => [...(roles.data ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true })),
    [roles.data],
  );
  const productSorting = useTableSort(productList, {
    codigo: (item) => item.codigo,
    producto: (item) => item.nombre,
    categoria: (item) => item.categoria ?? '',
    unidad: (item) => item.unidadMedida,
    marca: (item) => item.marca ?? '',
    lote: (item) => Number(item.requiereLote),
    vencimiento: (item) => Number(item.requiereVencimiento),
    estado: (item) => Number(item.activo),
  });
  const vehicleSorting = useTableSort(vehicleList, {
    placa: (item) => item.placa,
    marca: (item) => item.marca ?? '',
    modelo: (item) => item.modelo ?? '',
    tipo: (item) => item.tipo ?? '',
    estado: (item) => item.estado ?? '',
  });
  const providerSorting = useTableSort(providerList, {
    ruc: (item) => item.ruc,
    razon: (item) => item.razonSocial,
    contacto: (item) => `${item.telefono ?? ''} ${item.correo ?? ''}`,
    direccion: (item) => item.direccion ?? '',
    estado: (item) => Number(item.estado ?? true),
  });
  const productPagination = usePagination(
    productSorting.rows,
    8,
    `${productSorting.sort?.key ?? ''}|${productSorting.sort?.dir ?? ''}`,
  );
  const vehiclePagination = usePagination(
    vehicleSorting.rows,
    6,
    `${vehicleSorting.sort?.key ?? ''}|${vehicleSorting.sort?.dir ?? ''}`,
  );
  const providerPagination = usePagination(
    providerSorting.rows,
    8,
    `${providerSorting.sort?.key ?? ''}|${providerSorting.sort?.dir ?? ''}`,
  );

  const reloadAll = () => {
    entities.reload();
    products.reload();
    contracts.reload();
    vehicles.reload();
    providers.reload();
    roles.reload();
  };

  const onSaved = (message: string) => {
    setModal(null);
    toastSuccess(message);
    setReloadToken((value) => value + 1);
    reloadAll();
  };

  const open = (kind: ModalKind, options?: { entity?: EntidadPublica; product?: Producto; contract?: Contrato; tdr?: Tdr }) => {
    setContextEntity(options?.entity ?? null);
    setContextProduct(options?.product ?? null);
    setContextContract(options?.contract ?? null);
    setContextTdr(options?.tdr ?? null);
    setModal(kind);
  };

  return (
    <div className="mod-page">
      <ModuleHero
        eyebrow="Catálogo maestro"
        title="Datos maestros"
        description="Entidades públicas, puntos de entrega, productos, contratos, TDR, cláusulas, flota, proveedores y roles. La base sobre la que operan solicitudes, programaciones y despachos."
        actions={
          canManage && tab !== 'roles' && (
            <button
              type="button"
              className="mod-hero-button"
              onClick={() => {
                if (tab === 'entities') open('entity');
                else if (tab === 'products') open('product');
                else if (tab === 'contracts') open('contract');
                else if (tab === 'vehicles') open('vehicle');
                else open('provider');
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              {tab === 'entities' && 'Nueva entidad'}
              {tab === 'products' && 'Nuevo producto'}
              {tab === 'contracts' && 'Nuevo contrato'}
              {tab === 'vehicles' && 'Nuevo vehículo'}
              {tab === 'providers' && 'Nuevo proveedor'}
            </button>
          )
        }
      />

      <div className="dm-kpi-grid grid grid-cols-2 gap-3.5 xl:grid-cols-5">
        <ModuleKpi
          label="Entidades"
          value={entities.data?.length ?? 0}
          hint="Instituciones registradas"
          icon={<Building2 className="h-5 w-5" />}
          tone="brand"
          active={tab === 'entities'}
          onClick={() => setTab('entities')}
          delay="mod-reveal-1"
        />
        <ModuleKpi
          label="Productos"
          value={products.data?.length ?? 0}
          hint="Catálogo de bienes"
          icon={<Package className="h-5 w-5" />}
          tone="sky"
          active={tab === 'products'}
          onClick={() => setTab('products')}
          delay="mod-reveal-2"
        />
        <ModuleKpi
          label="Contratos"
          value={contracts.data?.length ?? 0}
          hint="Con TDR asociados"
          icon={<FileText className="h-5 w-5" />}
          tone="indigo"
          active={tab === 'contracts'}
          onClick={() => setTab('contracts')}
          delay="mod-reveal-3"
        />
        <ModuleKpi
          label="Vehículos"
          value={vehicles.data?.length ?? 0}
          hint="Flota de distribución"
          icon={<Truck className="h-5 w-5" />}
          tone="amber"
          active={tab === 'vehicles'}
          onClick={() => setTab('vehicles')}
          delay="mod-reveal-4"
        />
        <ModuleKpi
          label="Proveedores"
          value={providers.data?.length ?? 0}
          hint="Abastecimiento registrado"
          icon={<Store className="h-5 w-5" />}
          tone="brand"
          active={tab === 'providers'}
          onClick={() => setTab('providers')}
          delay="mod-reveal-4"
        />
      </div>

      <div className="mod-tabs mod-reveal mod-reveal-2">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={tab === key ? 'is-active' : undefined}
          >
            <Icon className="h-4 w-4" /> {label}
            <span className="mod-tabs-count">
              {key === 'entities' && (entities.data?.length ?? 0)}
              {key === 'products' && (products.data?.length ?? 0)}
              {key === 'contracts' && (contracts.data?.length ?? 0)}
              {key === 'vehicles' && (vehicles.data?.length ?? 0)}
              {key === 'providers' && (providers.data?.length ?? 0)}
              {key === 'roles' && (roles.data?.length ?? 0)}
            </span>
          </button>
        ))}
      </div>

      {['products', 'vehicles', 'providers', 'roles'].includes(tab) && (
        <div className="dm-view-toolbar mod-reveal">
          <span className="dm-view-label">Vista de datos</span>
          <ModuleViewToggle value={view} onChange={setView} />
        </div>
      )}

      {tab === 'entities' && (
        <EntitiesTab
          data={entities.data ?? []}
          loading={entities.loading}
          error={entities.error}
          canManage={canManage}
          onReload={entities.reload}
          onAddPoint={(entity) => open('point', { entity })}
        />
      )}

      {tab === 'products' && (
        <Card>
          <CardHeader title={`Productos (${products.data?.length ?? 0})`} />
          {products.error && <div className="p-5"><ErrorAlert message={products.error} onRetry={products.reload} /></div>}
          {products.loading && !products.data ? (
            <Spinner />
          ) : (products.data ?? []).length === 0 ? (
            <EmptyState title="Sin productos" description="Registre catalogo de productos e insumos." />
          ) : view === 'grid' ? (
            <div className="mod-grid">
              {productPagination.pageItems.map((item) => (
                <article key={item.id} className="mod-card">
                  <div className="mod-card-top">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                      <Package className="h-4 w-4" />
                    </span>
                    <Badge tone={item.activo ? 'green' : 'slate'}>{item.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </div>
                  <div>
                    <p className="mod-card-title">{item.nombre}</p>
                    <p className="mod-card-sub">{item.codigo} · {item.categoria ?? 'Sin categoría'}</p>
                  </div>
                  <div className="mod-card-metrics">
                    <div><span>Unidad</span><strong>{item.unidadMedida}</strong></div>
                    <div><span>Marca</span><strong>{item.marca ?? '-'}</strong></div>
                    <div><span>Lote</span><strong>{item.requiereLote ? 'Sí' : 'No'}</strong></div>
                    <div><span>Vence</span><strong>{item.requiereVencimiento ? 'Sí' : 'No'}</strong></div>
                  </div>
                  {canEditProduct && (
                    <div className="mod-card-footer">
                      <Button size="sm" variant="soft" onClick={() => open('product', { product: item })}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-pro">
                <thead>
                  <tr>
                    <SortableTh label="Código" column="codigo" sortKey={productSorting.sort?.key ?? null} direction={productSorting.sort?.dir ?? null} onSort={productSorting.toggle} />
                    <SortableTh label="Producto" column="producto" sortKey={productSorting.sort?.key ?? null} direction={productSorting.sort?.dir ?? null} onSort={productSorting.toggle} />
                    <SortableTh label="Categoría" column="categoria" sortKey={productSorting.sort?.key ?? null} direction={productSorting.sort?.dir ?? null} onSort={productSorting.toggle} />
                    <SortableTh label="Unidad" column="unidad" sortKey={productSorting.sort?.key ?? null} direction={productSorting.sort?.dir ?? null} onSort={productSorting.toggle} />
                    <SortableTh label="Marca" column="marca" sortKey={productSorting.sort?.key ?? null} direction={productSorting.sort?.dir ?? null} onSort={productSorting.toggle} />
                    <SortableTh label="Lote" column="lote" sortKey={productSorting.sort?.key ?? null} direction={productSorting.sort?.dir ?? null} onSort={productSorting.toggle} />
                    <SortableTh label="Vencimiento" column="vencimiento" sortKey={productSorting.sort?.key ?? null} direction={productSorting.sort?.dir ?? null} onSort={productSorting.toggle} />
                    <SortableTh label="Estado" column="estado" sortKey={productSorting.sort?.key ?? null} direction={productSorting.sort?.dir ?? null} onSort={productSorting.toggle} />
                    {canEditProduct && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {productPagination.pageItems.map((item) => (
                    <tr key={item.id}>
                      <td className="font-mono text-xs text-slate-500">{item.codigo}</td>
                      <td className="font-medium text-slate-800">{item.nombre}</td>
                      <td className="text-xs">{item.categoria ?? '-'}</td>
                      <td className="text-xs">{item.unidadMedida}</td>
                      <td className="text-xs">{item.marca ?? '-'}</td>
                      <td className="text-xs">{item.requiereLote ? 'Si' : 'No'}</td>
                      <td className="text-xs">{item.requiereVencimiento ? 'Si' : 'No'}</td>
                      <td><Badge tone={item.activo ? 'green' : 'slate'}>{item.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                      {canEditProduct && (
                        <td>
                          <Button size="sm" variant="soft" onClick={() => open('product', { product: item })}>
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <ModulePagination
            page={productPagination.page}
            pageCount={productPagination.pageCount}
            total={productPagination.total}
            from={productPagination.from}
            to={productPagination.to}
            pageSize={productPagination.pageSize}
            onPageChange={productPagination.setPage}
          />
        </Card>
      )}

      {tab === 'contracts' && (
        <ContractsTab
          data={contracts.data ?? []}
          loading={contracts.loading}
          error={contracts.error}
          canManage={canContract}
          onReload={contracts.reload}
          onAddTdr={(contract) => open('tdr', { contract })}
          onAddItem={(contract, tdr) => open('tdrItem', { contract, tdr })}
          onAddClause={(contract) => open('clause', { contract })}
          version={reloadToken}
        />
      )}

      {tab === 'vehicles' && (
        <Card>
          <CardHeader title={`Flota (${vehicles.data?.length ?? 0})`} />
          {vehicles.error && <div className="p-5"><ErrorAlert message={vehicles.error} onRetry={vehicles.reload} /></div>}
          {vehicles.loading && !vehicles.data ? (
            <Spinner />
          ) : (vehicles.data ?? []).length === 0 ? (
            <EmptyState title="Sin vehículos" description="Registre la flota para asignar transporte." />
          ) : view === 'grid' ? (
            <div className="mod-grid">
              {vehiclePagination.pageItems.map((item) => (
                <article key={item.id} className="mod-card">
                  <div className="mod-card-top">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                      <Truck className="h-4 w-4" />
                    </span>
                    <Badge tone={item.estado === 'DISPONIBLE' ? 'green' : 'amber'}>{item.estado}</Badge>
                  </div>
                  <div>
                    <p className="mod-card-title">{item.placa}</p>
                    <p className="mod-card-sub">{item.marca ?? 'Sin marca'} · {item.modelo ?? 'Sin modelo'}</p>
                  </div>
                  <div className="mod-card-metrics">
                    <div><span>Tipo</span><strong>{item.tipo ?? '-'}</strong></div>
                    <div><span>Estado</span><strong>{item.estado}</strong></div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-pro">
                <thead>
                  <tr>
                    <SortableTh label="Placa" column="placa" sortKey={vehicleSorting.sort?.key ?? null} direction={vehicleSorting.sort?.dir ?? null} onSort={vehicleSorting.toggle} />
                    <SortableTh label="Marca" column="marca" sortKey={vehicleSorting.sort?.key ?? null} direction={vehicleSorting.sort?.dir ?? null} onSort={vehicleSorting.toggle} />
                    <SortableTh label="Modelo" column="modelo" sortKey={vehicleSorting.sort?.key ?? null} direction={vehicleSorting.sort?.dir ?? null} onSort={vehicleSorting.toggle} />
                    <SortableTh label="Tipo" column="tipo" sortKey={vehicleSorting.sort?.key ?? null} direction={vehicleSorting.sort?.dir ?? null} onSort={vehicleSorting.toggle} />
                    <SortableTh label="Estado" column="estado" sortKey={vehicleSorting.sort?.key ?? null} direction={vehicleSorting.sort?.dir ?? null} onSort={vehicleSorting.toggle} />
                  </tr>
                </thead>
                <tbody>
                  {vehiclePagination.pageItems.map((item) => (
                    <tr key={item.id}>
                      <td className="font-semibold text-slate-800">{item.placa}</td>
                      <td className="text-xs">{item.marca ?? '-'}</td>
                      <td className="text-xs">{item.modelo ?? '-'}</td>
                      <td className="text-xs">{item.tipo ?? '-'}</td>
                      <td><Badge tone={item.estado === 'DISPONIBLE' ? 'green' : 'amber'}>{item.estado}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <ModulePagination
            page={vehiclePagination.page}
            pageCount={vehiclePagination.pageCount}
            total={vehiclePagination.total}
            from={vehiclePagination.from}
            to={vehiclePagination.to}
            pageSize={vehiclePagination.pageSize}
            onPageChange={vehiclePagination.setPage}
          />
        </Card>
      )}

      {tab === 'providers' && (
        <Card>
          <CardHeader title={`Proveedores (${providers.data?.length ?? 0})`} />
          {providers.error && <div className="p-5"><ErrorAlert message={providers.error} onRetry={providers.reload} /></div>}
          {providers.loading && !providers.data ? (
            <Spinner />
          ) : providerList.length === 0 ? (
            <EmptyState title="Sin proveedores" description="Registre proveedores para asociarlos a los ingresos de almacén." />
          ) : view === 'grid' ? (
            <div className="mod-grid">
              {providerPagination.pageItems.map((item) => (
                <article key={item.id} className="mod-card">
                  <div className="mod-card-top">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                      <Store className="h-4 w-4" />
                    </span>
                    <Badge tone={item.estado ? 'green' : 'slate'}>{item.estado ? 'Activo' : 'Inactivo'}</Badge>
                  </div>
                  <div>
                    <p className="mod-card-title">{item.razonSocial}</p>
                    <p className="mod-card-sub">RUC {item.ruc}</p>
                  </div>
                  <div className="mod-card-metrics">
                    <div><span>Teléfono</span><strong>{item.telefono ?? '-'}</strong></div>
                    <div><span>Correo</span><strong className="truncate">{item.correo ?? '-'}</strong></div>
                    <div><span>Dirección</span><strong className="truncate">{item.direccion ?? '-'}</strong></div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-pro">
                <thead>
                  <tr>
                    <SortableTh label="RUC" column="ruc" sortKey={providerSorting.sort?.key ?? null} direction={providerSorting.sort?.dir ?? null} onSort={providerSorting.toggle} />
                    <SortableTh label="Razón social" column="razon" sortKey={providerSorting.sort?.key ?? null} direction={providerSorting.sort?.dir ?? null} onSort={providerSorting.toggle} />
                    <SortableTh label="Contacto" column="contacto" sortKey={providerSorting.sort?.key ?? null} direction={providerSorting.sort?.dir ?? null} onSort={providerSorting.toggle} />
                    <SortableTh label="Dirección" column="direccion" sortKey={providerSorting.sort?.key ?? null} direction={providerSorting.sort?.dir ?? null} onSort={providerSorting.toggle} />
                    <SortableTh label="Estado" column="estado" sortKey={providerSorting.sort?.key ?? null} direction={providerSorting.sort?.dir ?? null} onSort={providerSorting.toggle} />
                  </tr>
                </thead>
                <tbody>
                  {providerPagination.pageItems.map((item) => (
                    <tr key={item.id}>
                      <td className="font-mono text-xs text-slate-500">{item.ruc}</td>
                      <td className="font-medium text-slate-800">{item.razonSocial}</td>
                      <td className="text-xs">
                        <span className="block">{item.telefono ?? '-'}</span>
                        <span className="block text-slate-400">{item.correo ?? '-'}</span>
                      </td>
                      <td className="text-xs">{item.direccion ?? '-'}</td>
                      <td><Badge tone={item.estado ? 'green' : 'slate'}>{item.estado ? 'Activo' : 'Inactivo'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <ModulePagination
            page={providerPagination.page}
            pageCount={providerPagination.pageCount}
            total={providerPagination.total}
            from={providerPagination.from}
            to={providerPagination.to}
            pageSize={providerPagination.pageSize}
            onPageChange={providerPagination.setPage}
          />
        </Card>
      )}

      {tab === 'roles' && (
        <Card>
          <CardHeader title={`Roles del sistema (${roles.data?.length ?? 0})`} />
          {roles.error && <div className="p-5"><ErrorAlert message={roles.error} onRetry={roles.reload} /></div>}
          {roles.loading && !roles.data ? (
            <Spinner />
          ) : (roles.data ?? []).length === 0 ? (
            <EmptyState title="Sin roles" description="El catálogo de roles está vacío." />
          ) : view === 'grid' ? (
            <div className="mod-grid">
              {roleList.map((role) => (
                <article key={role.id} className="mod-card role-card">
                  <div className="mod-card-top">
                    <span className="role-card-icon"><ShieldCheck className="h-4 w-4" /></span>
                    <Badge tone={role.nombre === 'ADMINISTRADOR' ? 'brand' : 'indigo'}>
                      {role.nombre === 'ADMINISTRADOR' ? 'Administrador' : 'Configurable'}
                    </Badge>
                  </div>
                  <div>
                    <p className="mod-card-title">
                      {ROLE_LABELS[role.nombre as keyof typeof ROLE_LABELS] ?? role.nombre}
                    </p>
                    <p className="mod-card-sub">{role.descripcion ?? 'Sin descripción'}</p>
                  </div>
                  <div className="mod-card-metrics">
                    <div><span>Código</span><strong className="font-mono text-[11px]">{role.nombre}</strong></div>
                    <div><span>ID</span><strong>{role.id}</strong></div>
                  </div>
                  {canManagePermissions && (
                    <div className="mod-card-footer">
                      <Button size="sm" variant="soft" className="role-permissions-button" onClick={() => setPermisoRole(role)}>
                        <ShieldCheck className="h-3.5 w-3.5" /> Permisos
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table roles-table">
                <colgroup>
                  <col style={{ width: '36%' }} />
                  <col style={{ width: '38%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '168px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Rol</th>
                    <th>Descripción</th>
                    <th>Tipo</th>
                    <th className="table-actions text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {roleList.map((role) => {
                    const isAdmin = role.nombre === 'ADMINISTRADOR';
                    return (
                      <tr key={role.id}>
                        <td>
                          <div className="role-identity">
                            <span className={isAdmin ? 'role-icon is-admin' : 'role-icon'}>
                              <ShieldCheck className="h-4 w-4" />
                            </span>
                            <div className="role-identity-copy">
                              <p className="role-name">
                                {ROLE_LABELS[role.nombre as keyof typeof ROLE_LABELS] ?? role.nombre}
                              </p>
                              <p className="role-code">{role.nombre}</p>
                            </div>
                          </div>
                        </td>
                        <td className="role-description">{role.descripcion ?? 'Sin descripción registrada.'}</td>
                        <td>
                          <Badge tone={isAdmin ? 'brand' : 'indigo'}>
                            {isAdmin ? 'Administrador' : 'Configurable'}
                          </Badge>
                        </td>
                        <td className="table-actions">
                          <div className="table-action-group">
                            {canManagePermissions ? (
                              <Button
                                size="sm"
                                variant="soft"
                                className="role-permissions-button"
                                title={`Editar permisos de ${role.nombre}`}
                                aria-label={`Editar permisos de ${role.nombre}`}
                                onClick={() => setPermisoRole(role)}
                              >
                                <ShieldCheck className="h-3.5 w-3.5" /> Permisos
                              </Button>
                            ) : (
                              <span className="role-readonly">Solo lectura</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <EntityModal open={modal === 'entity'} onClose={() => setModal(null)} onSaved={onSaved} />
      <PointModal
        open={modal === 'point'}
        entity={contextEntity}
        onClose={() => setModal(null)}
        onSaved={onSaved}
      />
      <ProductModal open={modal === 'product'} product={contextProduct} onClose={() => setModal(null)} onSaved={onSaved} />
      <ContractModal
        open={modal === 'contract'}
        entities={entities.data ?? []}
        onClose={() => setModal(null)}
        onSaved={onSaved}
      />
      <TdrModal
        open={modal === 'tdr'}
        contract={contextContract}
        onClose={() => setModal(null)}
        onSaved={onSaved}
      />
      <TdrItemModal
        open={modal === 'tdrItem'}
        tdr={contextTdr}
        products={products.data ?? []}
        onClose={() => setModal(null)}
        onSaved={onSaved}
      />
      <VehicleModal open={modal === 'vehicle'} onClose={() => setModal(null)} onSaved={onSaved} />
      <ProviderModal open={modal === 'provider'} onClose={() => setModal(null)} onSaved={onSaved} />
      <ClauseModal
        open={modal === 'clause'}
        contract={contextContract}
        onClose={() => setModal(null)}
        onSaved={onSaved}
      />
      <PermisosRolModal
        role={permisoRole}
        onClose={() => setPermisoRole(null)}
        onSaved={(message) => {
          setPermisoRole(null);
          toastSuccess(message);
          setReloadToken((value) => value + 1);
          roles.reload();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Entities */

function EntitiesTab({
  data,
  loading,
  error,
  canManage,
  onReload,
  onAddPoint,
}: {
  data: EntidadPublica[];
  loading: boolean;
  error: string | null;
  canManage: boolean;
  onReload: () => void;
  onAddPoint: (entity: EntidadPublica) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const pagination = usePagination(data, 6);
  const points = useApiQuery<PuntoEntrega[]>(
    () =>
      expanded
        ? api.get(`/entities/${expanded}/points`).then((r) => r.data)
        : Promise.resolve([]),
    [expanded],
  );

  return (
    <Card>
      <CardHeader title={`Entidades publicas (${data.length})`} />
      {error && <div className="p-5"><ErrorAlert message={error} onRetry={onReload} /></div>}
      {loading && !data.length ? (
        <Spinner />
      ) : data.length === 0 ? (
        <EmptyState title="Sin entidades" description="Registre entidades contratantes y sus puntos de entrega." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {pagination.pageItems.map((entity) => (
            <li key={entity.id}>
              <div className="flex flex-wrap items-center gap-3 px-5 py-3">
                <button
                  type="button"
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                  onClick={() => setExpanded(expanded === entity.id ? null : entity.id)}
                  aria-label="Ver puntos"
                >
                  {expanded === entity.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{entity.razonSocial}</p>
                  <p className="text-xs text-slate-400">
                    RUC {entity.ruc} · {entity.distrito ?? entity.provincia ?? 'Sin ubicacion'}
                  </p>
                </div>
                <Badge tone={entity.activo ? 'green' : 'slate'}>{entity.activo ? 'Activa' : 'Inactiva'}</Badge>
                {canManage && (
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() => {
                      setExpanded(entity.id);
                      onAddPoint(entity);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Punto
                  </Button>
                )}
              </div>

              {expanded === entity.id && (
                <div className="bg-slate-50/60 px-12 py-3">
                  {points.loading ? (
                    <p className="text-xs text-slate-400">Cargando puntos...</p>
                  ) : (points.data ?? []).length === 0 ? (
                    <p className="text-xs text-slate-400">Sin puntos de entrega registrados.</p>
                  ) : (
                    <ul className="space-y-1">
                      {points.data!.map((point) => (
                        <li key={point.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                          <span className="font-medium text-slate-700">{point.nombre}</span>
                          <span className="text-xs text-slate-400">
                            {point.direccion ?? 'Sin dirección'} · {point.responsable ?? 'Sin responsable'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
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
  );
}

/* ----------------------------------------------------------------- Contracts */

function TdrItemsTable({ items }: { items: TdrItem[] }) {
  const sorting = useTableSort(items, {
    producto: (item) => item.producto.nombre,
    total: (item) => Number(item.cantidadTotal),
    frecuencia: (item) => item.frecuencia,
    porEntrega: (item) => Number(item.cantidadPorEntrega),
  });

  return (
    <table className="table table-pro">
      <thead>
        <tr>
          <SortableTh label="Producto" column="producto" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
          <SortableTh label="Total" column="total" className="text-right" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
          <SortableTh label="Frecuencia" column="frecuencia" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
          <SortableTh label="Por entrega" column="porEntrega" className="text-right" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
        </tr>
      </thead>
      <tbody>
        {sorting.rows.map((item) => (
          <tr key={item.id}>
            <td className="text-xs font-medium">{item.producto.nombre}</td>
            <td className="text-right text-xs">{formatQuantity(item.cantidadTotal)} {item.unidad}</td>
            <td className="text-xs">{item.frecuencia}</td>
            <td className="text-right text-xs">{formatQuantity(item.cantidadPorEntrega)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ContractsTab({
  data,
  loading,
  error,
  canManage,
  onReload,
  onAddTdr,
  onAddItem,
  onAddClause,
  version,
}: {
  data: Contrato[];
  loading: boolean;
  error: string | null;
  canManage: boolean;
  onReload: () => void;
  onAddTdr: (contract: Contrato) => void;
  onAddItem: (contract: Contrato, tdr: Tdr) => void;
  onAddClause: (contract: Contrato) => void;
  version: number;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [tdrOpen, setTdrOpen] = useState<number | null>(null);
  const pagination = usePagination(data, 6);
  const tdrs = useApiQuery<Tdr[]>(
    () => (expanded ? api.get(`/contracts/${expanded}/tdrs`).then((r) => r.data) : Promise.resolve([])),
    [expanded, version],
  );
  const items = useApiQuery<TdrItem[]>(
    () => (tdrOpen ? api.get(`/tdrs/${tdrOpen}/items`).then((r) => r.data) : Promise.resolve([])),
    [tdrOpen],
  );
  const clauses = useApiQuery<Clause[]>(
    () => (expanded ? api.get(`/contracts/${expanded}/clauses`).then((r) => r.data) : Promise.resolve([])),
    [expanded, version],
  );

  return (
    <Card>
      <CardHeader title={`Contratos (${data.length})`} />
      {error && <div className="p-5"><ErrorAlert message={error} onRetry={onReload} /></div>}
      {loading && !data.length ? (
        <Spinner />
      ) : data.length === 0 ? (
        <EmptyState title="Sin contratos" description="Registre contratos y sus TDR para habilitar la programación." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {pagination.pageItems.map((contract) => (
            <li key={contract.id}>
              <div className="flex flex-wrap items-center gap-3 px-5 py-3">
                <button
                  type="button"
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                  onClick={() => setExpanded(expanded === contract.id ? null : contract.id)}
                  aria-label="Ver TDR"
                >
                  {expanded === contract.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {contract.codigo} · {contract.entidad.razonSocial}
                  </p>
                  <p className="text-xs text-slate-400">
                    Contrato {contract.numero} · {formatDate(contract.fechaInicio)} a {formatDate(contract.fechaFin)}
                  </p>
                </div>
                <Badge tone={contract.estado === 'VIGENTE' ? 'green' : 'slate'}>{contract.estado}</Badge>
                {canManage && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="soft" onClick={() => { setExpanded(contract.id); onAddTdr(contract); }}>
                      <Plus className="h-3.5 w-3.5" /> TDR
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setExpanded(contract.id); onAddClause(contract); }}>
                      <Plus className="h-3.5 w-3.5" /> Cláusula
                    </Button>
                  </div>
                )}
              </div>

              {expanded === contract.id && (
                <div className="space-y-2 bg-slate-50/60 px-12 py-3">
                  {tdrs.loading ? (
                    <p className="text-xs text-slate-400">Cargando TDR...</p>
                  ) : (tdrs.data ?? []).length === 0 ? (
                    <p className="text-xs text-slate-400">Sin versiones de TDR registradas.</p>
                  ) : (
                    tdrs.data!.map((tdr) => (
                      <div key={tdr.id} className="rounded-lg bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">TDR {tdr.version}</p>
                            <p className="text-xs text-slate-400">Vigencia {formatDate(tdr.fechaVigencia)} · {tdr.estado}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setTdrOpen(tdrOpen === tdr.id ? null : tdr.id)}
                            >
                              {tdrOpen === tdr.id ? 'Ocultar items' : 'Ver items'}
                            </Button>
                            {canManage && (
                              <Button size="sm" variant="soft" onClick={() => onAddItem(contract, tdr)}>
                                <Plus className="h-3.5 w-3.5" /> Item
                              </Button>
                            )}
                          </div>
                        </div>

                        {tdrOpen === tdr.id && (
                          <div className="mt-2">
                            {items.loading ? (
                              <p className="text-xs text-slate-400">Cargando items...</p>
                            ) : (items.data ?? []).length === 0 ? (
                              <p className="text-xs text-slate-400">Sin items de TDR.</p>
                            ) : (
                              <TdrItemsTable items={items.data!} />
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  <div className="rounded-lg border border-dashed border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Cláusulas contractuales
                      </p>
                      {canManage && (
                        <Button size="sm" variant="ghost" onClick={() => onAddClause(contract)}>
                          <Plus className="h-3.5 w-3.5" /> Nueva
                        </Button>
                      )}
                    </div>
                    {clauses.loading ? (
                      <p className="mt-2 text-xs text-slate-400">Cargando cláusulas...</p>
                    ) : (clauses.data ?? []).length === 0 ? (
                      <p className="mt-2 text-xs text-slate-400">Sin cláusulas activas registradas.</p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {clauses.data!.map((clause) => (
                          <li key={clause.id} className="rounded-lg bg-slate-50 px-3 py-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-700">
                                {clause.codigo} · {clause.tipo}
                              </span>
                              {clause.umbralPorcentaje != null && (
                                <Badge tone="amber">Umbral {clause.umbralPorcentaje}%</Badge>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">{clause.descripcion}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
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
  );
}

/* -------------------------------------------------------------------- Modals */

function EntityModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState({ ruc: '', razonSocial: '', direccion: '', departamento: '', provincia: '', distrito: '', telefono: '', correo: '', responsable: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ ruc: '', razonSocial: '', direccion: '', departamento: '', provincia: '', distrito: '', telefono: '', correo: '', responsable: '' });
    setError(null);
  }, [open]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/entities', form);
      onSaved('Entidad registrada.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Nueva entidad pública"
      subtitle="Registra la institución para asociar contratos y puntos de entrega."
      icon={<Building2 className="h-4 w-4" />}
      tone="sky"
      onClose={onClose}
      size="lg"
    >
      <div className="fk-form">
        {error && <ErrorAlert message={error} />}

        <FormHero
          tone="sky"
          icon={<Building2 className="h-6 w-6" />}
          eyebrow={<><ShieldCheck className="h-3 w-3" /> Registro maestro</>}
          title={form.razonSocial || 'Ficha de la entidad'}
          subtitle={form.ruc ? `RUC ${form.ruc}` : 'Completa la información fiscal y de contacto'}
          tags={
            <>
              <FormTag icon={<Building2 className="h-3 w-3" />} tone="ok">Entidad pública</FormTag>
              {(form.distrito || form.provincia) && (
                <FormTag icon={<MapPin className="h-3 w-3" />}>
                  {[form.distrito, form.provincia].filter(Boolean).join(' · ')}
                </FormTag>
              )}
            </>
          }
          aside={
            <FormMeter
              value={Math.round((Object.values(form).filter((value) => value.trim()).length / 9) * 100)}
              label="Ficha completada"
            />
          }
        />

        <FormWizard
          resetKey={open}
          submitLabel="Registrar entidad"
          submitting={busy}
          submitDisabled={!form.ruc || !form.razonSocial}
          onCancel={onClose}
          onSubmit={submit}
          onNext={(index) => index !== 0 || Boolean(form.ruc.trim() && form.razonSocial.trim())}
          steps={[
            {
              id: 'fiscal',
              label: 'Identificación',
              description: 'RUC y razón social',
              icon: <Fingerprint className="h-3.5 w-3.5" />,
              content: (
                <FormSection
                  icon={<Fingerprint className="h-4 w-4" />}
                  title="Identificación fiscal"
                  description="Datos oficiales con los que opera la institución"
                >
                  <FormGrid>
                    <Field label="RUC">
                      <Input placeholder="Ej. 20123456789" value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} />
                    </Field>
                    <Field label="Razón social">
                      <Input placeholder="Ej. Hospital Nacional Essalud" value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} />
                    </Field>
                  </FormGrid>
                </FormSection>
              ),
            },
            {
              id: 'ubicacion',
              label: 'Ubicación',
              description: 'Domicilio fiscal',
              icon: <MapPin className="h-3.5 w-3.5" />,
              content: (
                <FormSection
                  icon={<MapPin className="h-4 w-4" />}
                  title="Ubicación"
                  description="Domicilio fiscal y distrito de operación"
                >
                  <Field label="Dirección">
                    <Input placeholder="Av. / Jr. / Calle y número" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
                  </Field>
                  <FormGrid cols={3} className="fk-gap-top">
                    <Field label="Departamento">
                      <Input placeholder="Ej. Lima" value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })} />
                    </Field>
                    <Field label="Provincia">
                      <Input placeholder="Ej. Lima" value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} />
                    </Field>
                    <Field label="Distrito">
                      <Input placeholder="Ej. Jesús María" value={form.distrito} onChange={(e) => setForm({ ...form, distrito: e.target.value })} />
                    </Field>
                  </FormGrid>
                </FormSection>
              ),
            },
            {
              id: 'contacto',
              label: 'Contacto',
              description: 'Canal directo',
              icon: <Phone className="h-3.5 w-3.5" />,
              optional: true,
              content: (
                <FormSection
                  icon={<Phone className="h-4 w-4" />}
                  title="Contacto"
                  description="Canal directo con la entidad"
                >
                  <FormGrid cols={3}>
                    <Field label="Teléfono">
                      <Input placeholder="+51 999 999 999" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                    </Field>
                    <Field label="Correo">
                      <Input type="email" placeholder="contacto@entidad.gob.pe" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
                    </Field>
                    <Field label="Responsable">
                      <Input placeholder="Nombre del contacto" value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} />
                    </Field>
                  </FormGrid>
                </FormSection>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
}

function PointModal({ open, entity, onClose, onSaved }: { open: boolean; entity: EntidadPublica | null; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState({ nombre: '', direccion: '', distrito: '', responsable: '', telefono: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ nombre: '', direccion: '', distrito: '', responsable: '', telefono: '' });
    setError(null);
  }, [open]);

  const submit = async () => {
    if (!entity) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/entities/${entity.id}/points`, form);
      onSaved('Punto de entrega registrado.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Nuevo punto de entrega"
      subtitle={entity?.razonSocial ?? 'Asocia una nueva sede de atención'}
      icon={<MapPin className="h-4 w-4" />}
      tone="brand"
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={busy} disabled={!form.nombre} onClick={submit}>Registrar</Button>
        </>
      }
    >
      <div className="fk-form">
        {error && <ErrorAlert message={error} />}

        <FormHero
          tone="brand"
          icon={<MapPin className="h-6 w-6" />}
          eyebrow={<><Building2 className="h-3 w-3" /> Logística de entrega</>}
          title={form.nombre || 'Nueva sede de entrega'}
          subtitle={entity?.razonSocial ? `Sede de ${entity.razonSocial}` : 'Completa la ubicación y el responsable de recepción'}
          tags={
            <>
              <FormTag icon={<Building2 className="h-3 w-3" />} tone="ok">
                {entity?.ruc ? `RUC ${entity.ruc}` : 'Entidad pública'}
              </FormTag>
              {form.distrito && <FormTag icon={<MapPin className="h-3 w-3" />}>{form.distrito}</FormTag>}
            </>
          }
        />

        <FormSection
          icon={<Store className="h-4 w-4" />}
          title="Identificación del punto"
          description="Nombre con el que se reconocerá la sede"
        >
          <Field label="Nombre del punto">
            <Input placeholder="Ej. Almacén central · Sede Jesús María" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </Field>
        </FormSection>

        <FormSection
          icon={<MapPin className="h-4 w-4" />}
          title="Ubicación y contacto"
          description="Dirección operativa y responsable de recepción"
        >
          <Field label="Dirección">
            <Input placeholder="Av. / Jr. / Calle y número" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          </Field>
          <FormGrid cols={3} className="fk-gap-top">
            <Field label="Distrito">
              <Input placeholder="Ej. Jesús María" value={form.distrito} onChange={(e) => setForm({ ...form, distrito: e.target.value })} />
            </Field>
            <Field label="Responsable">
              <Input placeholder="Nombre del contacto" value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} />
            </Field>
            <Field label="Teléfono">
              <Input placeholder="+51 999 999 999" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </Field>
          </FormGrid>
        </FormSection>

        <FormNote icon={<ShieldCheck className="h-3.5 w-3.5" />} tone="ok">
          El punto quedará disponible para programar entregas y registrar recepciones de la entidad.
        </FormNote>
      </div>
    </Modal>
  );
}

function ProductModal({ open, product, onClose, onSaved }: { open: boolean; product?: Producto | null; onClose: () => void; onSaved: (message: string) => void }) {
  const editing = Boolean(product);
  const [form, setForm] = useState({ codigo: '', nombre: '', descripcion: '', categoria: '', unidadMedida: 'UNIDAD', marca: '', requiereLote: false, requiereVencimiento: false, stockMinimo: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        codigo: product.codigo,
        nombre: product.nombre,
        descripcion: product.descripcion ?? '',
        categoria: product.categoria ?? '',
        unidadMedida: product.unidadMedida,
        marca: product.marca ?? '',
        requiereLote: product.requiereLote,
        requiereVencimiento: product.requiereVencimiento,
        stockMinimo: '',
      });
    } else {
      setForm({ codigo: '', nombre: '', descripcion: '', categoria: '', unidadMedida: 'UNIDAD', marca: '', requiereLote: false, requiereVencimiento: false, stockMinimo: '' });
    }
    setError(null);
  }, [open, product]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...form,
        stockMinimo: form.stockMinimo === '' ? null : Number(form.stockMinimo),
      };
      if (editing && product) {
        await api.put(`/products/${product.id}`, payload);
        onSaved('Producto actualizado.');
      } else {
        await api.post('/products', payload);
        onSaved('Producto registrado.');
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editing ? 'Editar producto' : 'Nuevo producto'}
      subtitle={editing ? 'Actualiza los datos del producto seleccionado.' : 'Registra un artículo del catálogo maestro de bienes.'}
      icon={<Package className="h-4 w-4" />}
      tone="brand"
      onClose={onClose}
      size="lg"
    >
      <div className="fk-form">
        {error && <ErrorAlert message={error} />}

        <FormHero
          tone="brand"
          icon={<Package className="h-6 w-6" />}
          eyebrow={<><Store className="h-3 w-3" /> Catálogo maestro</>}
          title={form.nombre || 'Ficha del producto'}
          subtitle={form.codigo ? `${form.codigo} · ${form.unidadMedida}` : 'Registra un artículo del catálogo de bienes'}
          tags={
            <>
              <FormTag tone="ok">{form.categoria || 'Sin categoría'}</FormTag>
              {form.requiereLote && <FormTag tone="warn">Requiere lote</FormTag>}
              {form.requiereVencimiento && <FormTag tone="warn">Requiere vencimiento</FormTag>}
            </>
          }
          aside={
            <FormMeter
              value={Math.round(
                ([form.codigo, form.nombre, form.categoria, form.marca, form.descripcion, form.stockMinimo].filter((value) => String(value).trim()).length / 6) * 100,
              )}
              label="Ficha completada"
            />
          }
        />

        <FormWizard
          resetKey={`${open}-${product?.id ?? 'new'}`}
          submitLabel={editing ? 'Actualizar producto' : 'Registrar producto'}
          submitDisabled={!form.codigo.trim() || !form.nombre.trim()}
          submitting={busy}
          onCancel={onClose}
          onSubmit={submit}
          onNext={(index) => index !== 0 || Boolean(form.codigo.trim() && form.nombre.trim())}
          steps={[
            {
              id: 'identidad',
              label: 'Identificación',
              description: 'Código, nombre y categoría',
              icon: <Package className="h-3.5 w-3.5" />,
              content: (
                <FormSection
                  icon={<Package className="h-4 w-4" />}
                  title="Identificación del producto"
                  description="Código, nombre comercial y categoría"
                >
                  <FormGrid>
                    <Field label="Código">
                      <Input placeholder="Ej. PROD-006" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
                    </Field>
                    <Field label="Nombre">
                      <Input placeholder="Ej. Jabón líquido antibacterial 1L" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                    </Field>
                    <Field label="Categoría">
                      <Input placeholder="Ej. Higiene" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
                    </Field>
                    <Field label="Marca">
                      <Input placeholder="Ej. Genoma" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
                    </Field>
                  </FormGrid>
                </FormSection>
              ),
            },
            {
              id: 'presentacion',
              label: 'Presentación',
              description: 'Unidad y stock',
              icon: <Layers className="h-3.5 w-3.5" />,
              content: (
                <FormSection
                  icon={<Layers className="h-4 w-4" />}
                  title="Presentación y stock"
                  description="Unidad de medida, stock mínimo y descripción"
                >
                  <FormGrid>
                    <Field label="Unidad de medida">
                      <Input placeholder="UNIDAD, CAJA, BOTELLA…" value={form.unidadMedida} onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })} />
                    </Field>
                    <Field label="Stock mínimo">
                      <Input type="number" min={0} step="0.001" placeholder="0" value={form.stockMinimo} onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })} />
                    </Field>
                  </FormGrid>
                  <Field label="Descripción" className="fk-gap-top">
                    <Textarea placeholder="Detalle técnico, presentación o uso previsto del producto" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
                  </Field>
                </FormSection>
              ),
            },
            {
              id: 'controles',
              label: 'Controles',
              description: 'Lote y vencimiento',
              icon: <ShieldCheck className="h-3.5 w-3.5" />,
              optional: true,
              content: (
                <FormSection
                  icon={<ShieldCheck className="h-4 w-4" />}
                  title="Controles sanitarios"
                  description="Define si el producto exige trazabilidad por lote o vencimiento"
                >
                  <div className="fk-checks">
                    <label className="fk-check">
                      <input
                        type="checkbox"
                        checked={form.requiereLote}
                        onChange={(e) => setForm({ ...form, requiereLote: e.target.checked })}
                      />
                      <span className="fk-check-box" aria-hidden><Check className="h-3 w-3" /></span>
                      <span className="fk-check-copy">
                        <strong>Requiere lote</strong>
                        <small>Control por lote en ingresos y despachos</small>
                      </span>
                    </label>
                    <label className="fk-check">
                      <input
                        type="checkbox"
                        checked={form.requiereVencimiento}
                        onChange={(e) => setForm({ ...form, requiereVencimiento: e.target.checked })}
                      />
                      <span className="fk-check-box" aria-hidden><Check className="h-3 w-3" /></span>
                      <span className="fk-check-copy">
                        <strong>Requiere vencimiento</strong>
                        <small>Alerta de caducidad y control FEFO</small>
                      </span>
                    </label>
                  </div>
                </FormSection>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
}

function ContractModal({ open, entities, onClose, onSaved }: { open: boolean; entities: EntidadPublica[]; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState({ numero: '', codigo: '', entidadId: 0, objeto: '', fechaInicio: '', fechaFin: '', responsableInterno: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ numero: '', codigo: '', entidadId: entities[0]?.id ?? 0, objeto: '', fechaInicio: '', fechaFin: '', responsableInterno: '' });
    setError(null);
  }, [open, entities]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/contracts', {
        ...form,
        fechaInicio: form.fechaInicio || null,
        fechaFin: form.fechaFin || null,
      });
      onSaved('Contrato registrado.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const selectedEntity = entities.find((entity) => entity.id === Number(form.entidadId));
  const invalidRange = Boolean(form.fechaInicio && form.fechaFin && form.fechaFin < form.fechaInicio);
  const progress = Math.round(
    (([form.numero, form.codigo, form.entidadId ? '1' : '', form.objeto, form.fechaInicio, form.fechaFin, form.responsableInterno].filter((value) => String(value).trim()).length) / 7) * 100,
  );

  return (
    <Modal
      open={open}
      title="Nuevo contrato"
      subtitle="Registra el contrato marco que habilita TDR y programación."
      icon={<FileText className="h-4 w-4" />}
      tone="indigo"
      onClose={onClose}
      size="lg"
    >
      <div className="fk-form">
        {error && <ErrorAlert message={error} />}

        <FormHero
          tone="indigo"
          icon={<FileText className="h-6 w-6" />}
          eyebrow={<><Building2 className="h-3 w-3" /> Gestión contractual</>}
          title={form.numero || 'Ficha del contrato'}
          subtitle={selectedEntity?.razonSocial ?? 'Selecciona la entidad pública del contrato'}
          tags={
            <>
              {form.codigo && <FormTag tone="ok">{form.codigo}</FormTag>}
              {form.responsableInterno && <FormTag icon={<UserRound className="h-3 w-3" />}>{form.responsableInterno}</FormTag>}
              {form.fechaInicio && <FormTag icon={<CalendarDays className="h-3 w-3" />}>{form.fechaInicio}</FormTag>}
            </>
          }
          aside={<FormMeter value={progress} label="Ficha completada" />}
        />

        <FormWizard
          resetKey={open}
          submitLabel="Registrar contrato"
          submitting={busy}
          submitDisabled={!form.numero || !form.codigo || !form.entidadId || invalidRange}
          onCancel={onClose}
          onSubmit={submit}
          onNext={(index) => {
            if (index === 0) return Boolean(form.numero.trim() && form.codigo.trim() && form.entidadId);
            if (index === 1) return !invalidRange;
            return true;
          }}
          steps={[
            {
              id: 'identificacion',
              label: 'Identificación',
              description: 'Número, entidad y responsable',
              icon: <FileText className="h-3.5 w-3.5" />,
              content: (
                <FormSection
                  icon={<FileText className="h-4 w-4" />}
                  title="Identificación del contrato"
                  description="Número, código interno, entidad y responsable"
                >
                  <FormGrid>
                    <Field label="Número de contrato">
                      <Input placeholder="Ej. CONTRATO-2026-003" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
                    </Field>
                    <Field label="Código interno">
                      <Input placeholder="Ej. CTR-MINSA-2027" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
                    </Field>
                    <Field label="Entidad">
                      <Select value={form.entidadId} onChange={(e) => setForm({ ...form, entidadId: Number(e.target.value) })}>
                        <option value={0}>Seleccione entidad</option>
                        {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.razonSocial}</option>)}
                      </Select>
                    </Field>
                    <Field label="Responsable interno">
                      <Input placeholder="Nombre del responsable" value={form.responsableInterno} onChange={(e) => setForm({ ...form, responsableInterno: e.target.value })} />
                    </Field>
                  </FormGrid>
                </FormSection>
              ),
            },
            {
              id: 'vigencia',
              label: 'Vigencia',
              description: 'Fechas del contrato',
              icon: <CalendarDays className="h-3.5 w-3.5" />,
              content: (
                <FormSection
                  icon={<CalendarDays className="h-4 w-4" />}
                  title="Vigencia"
                  description="Periodo durante el cual el contrato está activo"
                >
                  <FormGrid>
                    <Field label="Fecha inicio">
                      <DatePicker value={form.fechaInicio} onChange={(value) => setForm({ ...form, fechaInicio: value })} />
                    </Field>
                    <Field label="Fecha fin">
                      <DatePicker value={form.fechaFin} onChange={(value) => setForm({ ...form, fechaFin: value })} />
                    </Field>
                  </FormGrid>
                  {invalidRange && (
                    <FormNote icon={<CalendarDays className="h-3.5 w-3.5" />} tone="warn">
                      La fecha fin no puede ser anterior a la fecha de inicio.
                    </FormNote>
                  )}
                </FormSection>
              ),
            },
            {
              id: 'objeto',
              label: 'Objeto',
              description: 'Alcance contractual',
              icon: <FileText className="h-3.5 w-3.5" />,
              optional: true,
              content: (
                <FormSection
                  icon={<FileText className="h-4 w-4" />}
                  title="Objeto contractual"
                  description="Alcance y prestaciones principales del contrato"
                >
                  <Field label="Objeto">
                    <Textarea placeholder="Describe el objeto del contrato y los servicios comprendidos" value={form.objeto} onChange={(e) => setForm({ ...form, objeto: e.target.value })} />
                  </Field>
                </FormSection>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
}

function TdrModal({ open, contract, onClose, onSaved }: { open: boolean; contract: Contrato | null; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState({ version: '', fechaVigencia: '', archivoUrl: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ version: '', fechaVigencia: '', archivoUrl: '' });
    setError(null);
  }, [open]);

  const submit = async () => {
    if (!contract) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/contracts/${contract.id}/tdrs`, {
        ...form,
        fechaVigencia: form.fechaVigencia || null,
      });
      onSaved('Versión de TDR registrada.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title={`Nuevo TDR · ${contract?.codigo ?? ''}`} onClose={onClose} size="md">
      <div className="space-y-4">
        {error && <ErrorAlert message={error} />}
        <FormWizard
          resetKey={open}
          submitLabel="Registrar TDR"
          submitting={busy}
          submitDisabled={!form.version}
          onCancel={onClose}
          onSubmit={submit}
          onNext={(index) => index !== 0 || Boolean(form.version.trim())}
          steps={[
            {
              id: 'version',
              label: 'Versión',
              description: 'Vigencia del TDR',
              icon: <FileText className="h-3.5 w-3.5" />,
              content: (
                <FormSection icon={<FileText className="h-4 w-4" />} title="Versión y vigencia" description="Identifica la versión documental del contrato.">
                  <FormGrid>
                    <Field label="Versión"><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="v1.0" /></Field>
                    <Field label="Fecha de vigencia"><DatePicker value={form.fechaVigencia} onChange={(value) => setForm({ ...form, fechaVigencia: value })} /></Field>
                  </FormGrid>
                </FormSection>
              ),
            },
            {
              id: 'documento',
              label: 'Documento',
              description: 'Archivo de sustento',
              icon: <FileText className="h-3.5 w-3.5" />,
              optional: true,
              content: (
                <FormSection icon={<FileText className="h-4 w-4" />} title="Documento" description="Enlace o ruta del archivo del TDR.">
                  <Field label="URL del documento"><Input value={form.archivoUrl} onChange={(e) => setForm({ ...form, archivoUrl: e.target.value })} placeholder="https://..." /></Field>
                </FormSection>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
}

function TdrItemModal({ open, tdr, products, onClose, onSaved }: { open: boolean; tdr: Tdr | null; products: Producto[]; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState({
    productoId: 0,
    cantidadTotal: '',
    unidad: 'UNIDAD',
    frecuencia: 'MENSUAL' as Frecuencia,
    cantidadPorEntrega: '',
    fechaProgramada: '',
    fechaLimite: '',
    observaciones: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      productoId: products[0]?.id ?? 0,
      cantidadTotal: '',
      unidad: products[0]?.unidadMedida ?? 'UNIDAD',
      frecuencia: 'MENSUAL',
      cantidadPorEntrega: '',
      fechaProgramada: '',
      fechaLimite: '',
      observaciones: '',
    });
    setError(null);
  }, [open, products]);

  const submit = async () => {
    if (!tdr) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/tdrs/${tdr.id}/items`, {
        ...form,
        cantidadTotal: Number(form.cantidadTotal),
        cantidadPorEntrega: Number(form.cantidadPorEntrega),
        fechaProgramada: form.fechaProgramada || null,
        fechaLimite: form.fechaLimite || null,
      });
      onSaved('Item de TDR registrado.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title={`Nuevo item · TDR ${tdr?.version ?? ''}`} onClose={onClose} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button
          loading={busy}
          disabled={!form.productoId || !form.cantidadTotal || !form.cantidadPorEntrega}
          onClick={submit}
        >
          Registrar
        </Button>
      </>
    }>
      <div className="space-y-4">
        {error && <ErrorAlert message={error} />}
        <Field label="Producto">
          <Select
            value={form.productoId}
            onChange={(e) => {
              const product = products.find((item) => item.id === Number(e.target.value));
              setForm({ ...form, productoId: Number(e.target.value), unidad: product?.unidadMedida ?? form.unidad });
            }}
          >
            <option value={0}>Seleccione producto</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.codigo} - {product.nombre}</option>)}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cantidad total comprometida"><Input type="number" min={0.001} step="0.001" value={form.cantidadTotal} onChange={(e) => setForm({ ...form, cantidadTotal: e.target.value })} /></Field>
          <Field label="Unidad"><Input value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} /></Field>
          <Field label="Frecuencia">
            <Select value={form.frecuencia} onChange={(e) => setForm({ ...form, frecuencia: e.target.value as Frecuencia })}>
              {FREQUENCIES.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
            </Select>
          </Field>
          <Field label="Cantidad por entrega"><Input type="number" min={0.001} step="0.001" value={form.cantidadPorEntrega} onChange={(e) => setForm({ ...form, cantidadPorEntrega: e.target.value })} /></Field>
          <Field label="Fecha programada inicial"><DatePicker value={form.fechaProgramada} onChange={(value) => setForm({ ...form, fechaProgramada: value })} /></Field>
          <Field label="Fecha limite"><DatePicker value={form.fechaLimite} onChange={(value) => setForm({ ...form, fechaLimite: value })} /></Field>
        </div>
        <Field label="Observaciones"><Textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function VehicleModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState({ placa: '', marca: '', modelo: '', tipo: '', estado: 'DISPONIBLE' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ placa: '', marca: '', modelo: '', tipo: '', estado: 'DISPONIBLE' });
    setError(null);
  }, [open]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/vehicles', form);
      onSaved('Vehículo registrado.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const VEHICLE_STATUS = [
    { value: 'DISPONIBLE', label: 'Disponible', hint: 'Listo para asignación', tone: 'ok' },
    { value: 'MANTENIMIENTO', label: 'Mantenimiento', hint: 'Fuera de servicio', tone: 'warn' },
    { value: 'INACTIVO', label: 'Inactivo', hint: 'No asignable', tone: 'neutral' },
  ] as const;
  const statusMeta = VEHICLE_STATUS.find((option) => option.value === form.estado) ?? VEHICLE_STATUS[0];
  const progress = Math.round(
    ([form.placa, form.marca, form.modelo, form.tipo].filter((value) => value.trim()).length / 4) * 100,
  );

  return (
    <Modal
      open={open}
      title="Nuevo vehículo"
      subtitle="Registra una unidad para la flota de distribución."
      icon={<Truck className="h-4 w-4" />}
      tone="sky"
      onClose={onClose}
      size="lg"
    >
      <div className="fk-form">
        {error && <ErrorAlert message={error} />}

        <FormHero
          tone="sky"
          icon={<Truck className="h-6 w-6" />}
          eyebrow={<><MapPin className="h-3 w-3" /> Flota de distribución</>}
          title={form.placa || 'Unidad de flota'}
          subtitle={[form.marca, form.modelo].filter(Boolean).join(' ') || 'Registra la unidad de transporte'}
          tags={
            <>
              <FormTag tone={statusMeta.tone}>{statusMeta.label}</FormTag>
              {form.tipo && <FormTag>{form.tipo}</FormTag>}
            </>
          }
          aside={<FormMeter value={progress} label="Ficha completada" />}
        />

        <FormWizard
          resetKey={open}
          submitLabel="Registrar vehículo"
          submitting={busy}
          submitDisabled={!form.placa}
          onCancel={onClose}
          onSubmit={submit}
          onNext={(index) => index !== 0 || Boolean(form.placa.trim())}
          steps={[
            {
              id: 'unidad',
              label: 'Unidad',
              description: 'Placa y modelo',
              icon: <Truck className="h-3.5 w-3.5" />,
              content: (
                <FormSection
                  icon={<Truck className="h-4 w-4" />}
                  title="Identificación de la unidad"
                  description="Placa, marca, modelo y tipo de vehículo"
                >
                  <FormGrid>
                    <Field label="Placa">
                      <Input placeholder="Ej. ABC-123" value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })} />
                    </Field>
                    <Field label="Marca">
                      <Input placeholder="Ej. Toyota" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
                    </Field>
                    <Field label="Modelo">
                      <Input placeholder="Ej. Hilux 2024" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
                    </Field>
                    <Field label="Tipo">
                      <Input placeholder="Ej. Camión, furgón, moto" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
                    </Field>
                  </FormGrid>
                </FormSection>
              ),
            },
            {
              id: 'estado',
              label: 'Estado',
              description: 'Disponibilidad',
              icon: <Settings2 className="h-3.5 w-3.5" />,
              content: (
                <FormSection
                  icon={<Settings2 className="h-4 w-4" />}
                  title="Estado operativo"
                  description="Disponibilidad de la unidad para asignación de rutas"
                >
                  <div className="fk-choices" role="radiogroup" aria-label="Estado del vehículo">
                    {VEHICLE_STATUS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={form.estado === option.value}
                        className={`fk-choice fk-choice-${option.tone}${form.estado === option.value ? ' is-selected' : ''}`}
                        onClick={() => setForm({ ...form, estado: option.value })}
                      >
                        <i aria-hidden />
                        <strong>{option.label}</strong>
                        <small>{option.hint}</small>
                      </button>
                    ))}
                  </div>
                </FormSection>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
}

function ProviderModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (message: string) => void }) {
  const empty = { ruc: '', razonSocial: '', direccion: '', telefono: '', correo: '' };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(empty);
    setError(null);
  }, [open]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/providers', { ...form, estado: true });
      onSaved('Proveedor registrado.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const validRuc = /^\d{11}$/.test(form.ruc);
  const progress = Math.round(
    (([form.ruc, form.razonSocial, form.telefono, form.correo, form.direccion].filter((value) => value.trim()).length) / 5) * 100,
  );

  return (
    <Modal
      open={open}
      title="Nuevo proveedor"
      subtitle="Registra la empresa que abastece el almacén central."
      icon={<Store className="h-4 w-4" />}
      tone="slate"
      onClose={onClose}
      size="lg"
    >
      <div className="fk-form">
        {error && <ErrorAlert message={error} />}

        <FormHero
          tone="slate"
          icon={<Store className="h-6 w-6" />}
          eyebrow={<><Building2 className="h-3 w-3" /> Cadena de abastecimiento</>}
          title={form.razonSocial || 'Ficha del proveedor'}
          subtitle={form.ruc ? `RUC ${form.ruc}` : 'Registra la empresa proveedora'}
          tags={
            <>
              <FormTag tone={validRuc ? 'ok' : 'warn'}>
                {validRuc ? 'RUC válido' : 'RUC pendiente'}
              </FormTag>
              {form.correo && <FormTag icon={<Mail className="h-3 w-3" />}>{form.correo}</FormTag>}
            </>
          }
          aside={<FormMeter value={progress} label="Ficha completada" />}
        />

        <FormWizard
          resetKey={open}
          submitLabel="Registrar proveedor"
          submitting={busy}
          submitDisabled={!validRuc || !form.razonSocial.trim()}
          onCancel={onClose}
          onSubmit={submit}
          onNext={(index) => index !== 0 || Boolean(validRuc && form.razonSocial.trim())}
          steps={[
            {
              id: 'fiscal',
              label: 'Identificación',
              description: 'RUC y razón social',
              icon: <Fingerprint className="h-3.5 w-3.5" />,
              content: (
                <FormSection
                  icon={<Fingerprint className="h-4 w-4" />}
                  title="Identificación fiscal"
                  description="RUC y razón social registrados en SUNAT"
                >
                  <FormGrid>
                    <Field label="RUC" hint="11 dígitos, sin espacios.">
                      <Input
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="20123456789"
                        value={form.ruc}
                        onChange={(e) => setForm({ ...form, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                      />
                    </Field>
                    <Field label="Razón social">
                      <Input placeholder="Ej. Distribuidora Andina S.A.C." value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} />
                    </Field>
                  </FormGrid>
                </FormSection>
              ),
            },
            {
              id: 'contacto',
              label: 'Contacto',
              description: 'Canales y dirección',
              icon: <Phone className="h-3.5 w-3.5" />,
              content: (
                <>
                  <FormSection
                    icon={<Phone className="h-4 w-4" />}
                    title="Contacto y ubicación"
                    description="Canales de coordinación y dirección fiscal"
                  >
                    <FormGrid>
                      <Field label="Teléfono">
                        <Input placeholder="+51 999 999 999" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                      </Field>
                      <Field label="Correo">
                        <Input type="email" placeholder="ventas@proveedor.pe" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
                      </Field>
                    </FormGrid>
                    <Field label="Dirección" className="fk-gap-top">
                      <Input placeholder="Av. / Jr. / Calle y número" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
                    </Field>
                  </FormSection>
                  <FormNote icon={<ShieldCheck className="h-3.5 w-3.5" />} tone={validRuc ? 'ok' : 'warn'}>
                    {validRuc
                      ? 'El RUC cumple el formato de 11 dígitos. El proveedor quedará disponible para ingresos de inventario.'
                      : 'Completa un RUC de 11 dígitos para habilitar el registro del proveedor.'}
                  </FormNote>
                </>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
}

function ClauseModal({ open, contract, onClose, onSaved }: {
  open: boolean;
  contract: Contrato | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const empty = {
    codigo: '',
    descripcion: '',
    tipo: 'CUMPLIMIENTO',
    umbralPorcentaje: '',
    accionSugerida: 'REVISION_MANUAL',
  };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(empty);
    setError(null);
  }, [open]);

  const submit = async () => {
    if (!contract) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/contracts/${contract.id}/clauses`, {
        codigo: form.codigo,
        descripcion: form.descripcion,
        tipo: form.tipo,
        umbralPorcentaje: form.umbralPorcentaje ? Number(form.umbralPorcentaje) : null,
        accionSugerida: form.accionSugerida || 'REVISION_MANUAL',
        activa: true,
      });
      onSaved('Cláusula contractual registrada.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`Nueva cláusula · ${contract?.codigo ?? ''}`}
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-4">
        {error && <ErrorAlert message={error} />}
        <FormWizard
          resetKey={open}
          submitLabel="Registrar cláusula"
          submitting={busy}
          submitDisabled={!form.codigo.trim() || !form.descripcion.trim()}
          onCancel={onClose}
          onSubmit={submit}
          onNext={(index) => index !== 0 || Boolean(form.codigo.trim())}
          steps={[
            {
              id: 'datos',
              label: 'Datos',
              description: 'Código y tipo',
              icon: <FileText className="h-3.5 w-3.5" />,
              content: (
                <FormSection icon={<FileText className="h-4 w-4" />} title="Datos de la cláusula" description="Código, tipo y umbral de evaluación.">
                  <FormGrid>
                    <Field label="Código">
                      <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
                    </Field>
                    <Field label="Tipo">
                      <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                        <option value="CUMPLIMIENTO">Cumplimiento</option>
                        <option value="PUNTUALIDAD">Puntualidad</option>
                        <option value="CALIDAD">Calidad</option>
                        <option value="DOCUMENTAL">Documental</option>
                      </Select>
                    </Field>
                    <Field label="Umbral (%)" hint="Opcional. Se evalúa contra el indicador.">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={form.umbralPorcentaje}
                        onChange={(e) => setForm({ ...form, umbralPorcentaje: e.target.value })}
                      />
                    </Field>
                    <Field label="Acción sugerida">
                      <Select
                        value={form.accionSugerida}
                        onChange={(e) => setForm({ ...form, accionSugerida: e.target.value })}
                      >
                        <option value="REVISION_MANUAL">Revisión manual</option>
                        <option value="NOTIFICAR">Notificar</option>
                        <option value="ESCALAR">Escalar</option>
                      </Select>
                    </Field>
                  </FormGrid>
                </FormSection>
              ),
            },
            {
              id: 'descripcion',
              label: 'Descripción',
              description: 'Texto de la cláusula',
              icon: <FileText className="h-3.5 w-3.5" />,
              content: (
                <FormSection icon={<FileText className="h-4 w-4" />} title="Descripción" description="Detalla la obligación o condición contractual.">
                  <Field label="Descripción">
                    <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
                  </Field>
                </FormSection>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
}

