import { useEffect, useState } from 'react';
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
import { useAuth } from '@/store/auth';
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
import { FormGrid, FormHero, FormMeter, FormNote, FormSection, FormTag } from '@/components/FormKit';
import { ModuleHero, ModuleKpi, ModulePagination, usePagination } from '@/components/module';
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
  const canContract = can('DATOS_MAESTROS', 'crear');
  const canManagePermissions = can('USUARIOS', 'editar');

  const [tab, setTab] = useState<Tab>('entities');
  const [modal, setModal] = useState<ModalKind>(null);
  const [contextEntity, setContextEntity] = useState<EntidadPublica | null>(null);
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

  const productList = products.data ?? [];
  const vehicleList = vehicles.data ?? [];
  const providerList = providers.data ?? [];
  const productPagination = usePagination(productList, 8);
  const vehiclePagination = usePagination(vehicleList, 6);
  const providerPagination = usePagination(providerList, 8);

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

  const open = (kind: ModalKind, options?: { entity?: EntidadPublica; contract?: Contrato; tdr?: Tdr }) => {
    setContextEntity(options?.entity ?? null);
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

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
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
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Unidad</th>
                    <th>Marca</th>
                    <th>Lote</th>
                    <th>Vencimiento</th>
                    <th>Estado</th>
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
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Marca</th>
                    <th>Modelo</th>
                    <th>Tipo</th>
                    <th>Estado</th>
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
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>RUC</th>
                    <th>Razón social</th>
                    <th>Contacto</th>
                    <th>Dirección</th>
                    <th>Estado</th>
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
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Rol</th>
                    <th>Descripción</th>
                    <th>Uso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(roles.data ?? []).map((role) => (
                    <tr key={role.id}>
                      <td className="font-mono text-xs text-slate-500">{role.id}</td>
                      <td className="font-medium text-slate-800">{role.nombre}</td>
                      <td className="text-xs text-slate-600">{role.descripcion ?? '-'}</td>
                      <td><Badge tone="indigo">Autorización</Badge></td>
                      <td>
                        {canManagePermissions ? (
                          <Button size="sm" variant="soft" onClick={() => setPermisoRole(role)}>
                            Permisos
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
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
      <ProductModal open={modal === 'product'} onClose={() => setModal(null)} onSaved={onSaved} />
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
                              <table className="table">
                                <thead>
                                  <tr>
                                    <th>Producto</th>
                                    <th className="text-right">Total</th>
                                    <th>Frecuencia</th>
                                    <th className="text-right">Por entrega</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.data!.map((item) => (
                                    <tr key={item.id}>
                                      <td className="text-xs font-medium">{item.producto.nombre}</td>
                                      <td className="text-right text-xs">{formatQuantity(item.cantidadTotal)} {item.unidad}</td>
                                      <td className="text-xs">{item.frecuencia}</td>
                                      <td className="text-right text-xs">{formatQuantity(item.cantidadPorEntrega)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
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
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={busy} disabled={!form.ruc || !form.razonSocial} onClick={submit}>Registrar</Button>
        </>
      }
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

function ProductModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState({ codigo: '', nombre: '', descripcion: '', categoria: '', unidadMedida: 'UNIDAD', marca: '', requiereLote: false, requiereVencimiento: false, stockMinimo: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ codigo: '', nombre: '', descripcion: '', categoria: '', unidadMedida: 'UNIDAD', marca: '', requiereLote: false, requiereVencimiento: false, stockMinimo: '' });
    setError(null);
  }, [open]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/products', {
        ...form,
        stockMinimo: form.stockMinimo === '' ? null : Number(form.stockMinimo),
      });
      onSaved('Producto registrado.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Nuevo producto"
      subtitle="Registra un artículo del catálogo maestro de bienes."
      icon={<Package className="h-4 w-4" />}
      tone="brand"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={busy} disabled={!form.codigo || !form.nombre} onClick={submit}>Registrar</Button>
        </>
      }
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
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={busy} disabled={!form.numero || !form.codigo || !form.entidadId || invalidRange} onClick={submit}>Registrar</Button>
        </>
      }
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

        <FormSection
          icon={<CalendarDays className="h-4 w-4" />}
          title="Vigencia"
          description="Periodo durante el cual el contrato está activo"
        >
          <FormGrid>
            <Field label="Fecha inicio">
              <Input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
            </Field>
            <Field label="Fecha fin">
              <Input type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
            </Field>
          </FormGrid>
          {invalidRange && (
            <FormNote icon={<CalendarDays className="h-3.5 w-3.5" />} tone="warn">
              La fecha fin no puede ser anterior a la fecha de inicio.
            </FormNote>
          )}
        </FormSection>

        <FormSection
          icon={<FileText className="h-4 w-4" />}
          title="Objeto contractual"
          description="Alcance y prestaciones principales del contrato"
        >
          <Field label="Objeto">
            <Textarea placeholder="Describe el objeto del contrato y los servicios comprendidos" value={form.objeto} onChange={(e) => setForm({ ...form, objeto: e.target.value })} />
          </Field>
        </FormSection>
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
    <Modal open={open} title={`Nuevo TDR · ${contract?.codigo ?? ''}`} onClose={onClose} footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button loading={busy} disabled={!form.version} onClick={submit}>Registrar</Button>
      </>
    }>
      <div className="space-y-4">
        {error && <ErrorAlert message={error} />}
        <Field label="Versión"><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="v1.0" /></Field>
        <Field label="Fecha de vigencia"><Input type="date" value={form.fechaVigencia} onChange={(e) => setForm({ ...form, fechaVigencia: e.target.value })} /></Field>
        <Field label="URL del documento"><Input value={form.archivoUrl} onChange={(e) => setForm({ ...form, archivoUrl: e.target.value })} /></Field>
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
          <Field label="Fecha programada inicial"><Input type="date" value={form.fechaProgramada} onChange={(e) => setForm({ ...form, fechaProgramada: e.target.value })} /></Field>
          <Field label="Fecha limite"><Input type="date" value={form.fechaLimite} onChange={(e) => setForm({ ...form, fechaLimite: e.target.value })} /></Field>
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
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={busy} disabled={!form.placa} onClick={submit}>Registrar</Button>
        </>
      }
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
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={busy} disabled={!validRuc || !form.razonSocial.trim()} onClick={submit}>Registrar</Button>
        </>
      }
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
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={busy} disabled={!form.codigo.trim() || !form.descripcion.trim()} onClick={submit}>
            Registrar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorAlert message={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        <Field label="Descripción">
          <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

