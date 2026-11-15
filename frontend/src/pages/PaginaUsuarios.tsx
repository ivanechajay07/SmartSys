import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Activity,
  Boxes,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  UserCog,
  UserRound,
  Users,
  UserX,
  XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { api, apiErrorMessage } from '@/lib/api';
import { toastSuccess } from '@/lib/toasts';
import { fileToAvatar } from '@/lib/avatar';
import { formatDateTime } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import { ROLE_LABELS, useAuth } from '@/store/auth';
import type { PermisoModulo, PresenciaUsuario, Rol, RolSistema, UsuarioAdmin } from '@/types';
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
} from '@/components/ui';
import {
  ModuleChips,
  ModuleHero,
  ModuleKpi,
  ModulePagination,
  ModuleViewToggle,
  usePagination,
} from '@/components/module';
import { UserAvatar } from '@/components/UserAvatar';
import { PermisosRolModal } from '@/components/PermisosModal';
import '@/styles/modules.css';
import '@/styles/user-modal.css';

const ROLES = [
  'ADMINISTRADOR',
  'GERENTE_GENERAL',
  'JEFE_LOGISTICA',
  'ENCARGADO_ALMACEN',
  'PERSONAL_OPERATIVO',
  'PERSONAL_LOGISTICA',
  'RESPONSABLE_DISTRIBUCION',
  'TRANSPORTISTA',
] as const;

const ROLE_META: Record<(typeof ROLES)[number], { Icon: typeof ShieldCheck; hint: string }> = {
  ADMINISTRADOR: { Icon: Crown, hint: 'Control total del sistema' },
  GERENTE_GENERAL: { Icon: ShieldCheck, hint: 'Dirección y aprobaciones' },
  JEFE_LOGISTICA: { Icon: ClipboardList, hint: 'Planificación operativa' },
  ENCARGADO_ALMACEN: { Icon: Package, hint: 'Inventario y almacén' },
  PERSONAL_OPERATIVO: { Icon: Activity, hint: 'Operación diaria' },
  PERSONAL_LOGISTICA: { Icon: Boxes, hint: 'Gestión logística' },
  RESPONSABLE_DISTRIBUCION: { Icon: Truck, hint: 'Despachos y entregas' },
  TRANSPORTISTA: { Icon: Route, hint: 'Ruta móvil y evidencias' },
};

const createSchema = z.object({
  nombres: z.string().min(1, 'Ingrese los nombres'),
  apellidos: z.string().min(1, 'Ingrese los apellidos'),
  email: z.string().min(1, 'Ingrese el correo').email('Ingrese un correo válido'),
  telefono: z.string().optional(),
  rol: z.enum(ROLES),
  password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres'),
  activo: z.boolean(),
});

const editSchema = createSchema.omit({ email: true, password: true });

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

export default function PaginaUsuarios() {
  const sessionUser = useAuth((state) => state.user);
  const can = useAuth((state) => state.can);
  const canCreate = can('USUARIOS', 'crear');
  const canEdit = can('USUARIOS', 'editar');
  const [section, setSection] = useState<'users' | 'roles'>('users');
  const [permisoRole, setPermisoRole] = useState<RolSistema | null>(null);
  const [roleSearch, setRoleSearch] = useState('');
  const [expandedRole, setExpandedRole] = useState<number | null>(null);
  const rolesQuery = useApiQuery<RolSistema[]>(() => api.get('/roles').then((r) => r.data));
  const rolePermissions = useApiQuery<Record<string, PermisoModulo[]>>(
    () => (rolesQuery.data && rolesQuery.data.length > 0
      ? Promise.all(rolesQuery.data.map(async (role) => {
          const { data } = await api.get<PermisoModulo[]>(`/roles/${role.id}/permissions`);
          return [String(role.id), data] as const;
        })).then((entries) => Object.fromEntries(entries))
      : Promise.resolve({})),
    [rolesQuery.data],
  );
  const users = useApiQuery<UsuarioAdmin[]>(
    () => api.get('/users', { params: { incluirInactivos: true } }).then((r) => r.data),
  );
  const presence = useApiQuery<PresenciaUsuario[]>(() => api.get('/users/presence').then((r) => r.data));

  useEffect(() => {
    const interval = window.setInterval(() => presence.reload(), 15_000);
    return () => window.clearInterval(interval);
  }, [presence.reload]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [presenceFilter, setPresenceFilter] = useState('');
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UsuarioAdmin | null>(null);
  const [resetting, setResetting] = useState<UsuarioAdmin | null>(null);
  const [avatarTarget, setAvatarTarget] = useState<UsuarioAdmin | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  const onlineIds = useMemo(
    () => new Set((presence.data ?? []).filter((item) => item.enLinea).map((item) => item.usuarioId)),
    [presence.data],
  );
  const lastSeen = useMemo(
    () => new Map((presence.data ?? []).map((item) => [item.usuarioId, item.ultimaActividad])),
    [presence.data],
  );

  const data = useMemo(() => users.data ?? [], [users.data]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((user) => {
      const matchesRole = !roleFilter || user.rol === roleFilter;
      const matchesStatus =
        !statusFilter || (statusFilter === 'ACTIVO' ? user.activo : !user.activo);
      const matchesPresence =
        !presenceFilter ||
        (presenceFilter === 'ONLINE' ? onlineIds.has(user.id) : !onlineIds.has(user.id));
      const matchesTerm =
        !term ||
        user.nombres.toLowerCase().includes(term) ||
        user.apellidos.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);
      return matchesRole && matchesStatus && matchesPresence && matchesTerm;
    });
  }, [data, search, roleFilter, statusFilter, presenceFilter, onlineIds]);

  const pagination = usePagination(
    filtered,
    8,
    `${search}|${roleFilter}|${statusFilter}|${presenceFilter}|${view}`,
  );

  const filteredRoles = useMemo(() => {
    const term = roleSearch.trim().toLowerCase();
    return (rolesQuery.data ?? []).filter((role) => (
      !term
      || role.nombre.toLowerCase().includes(term)
      || (role.descripcion ?? '').toLowerCase().includes(term)
    ));
  }, [rolesQuery.data, roleSearch]);

  const usersForRole = (role: Rol) => data.filter((user) => user.rol === role).length;

  const notify = (message: string) => {
    toastSuccess(message);
    setActionError(null);
  };

  const toggleStatus = async (user: UsuarioAdmin) => {
    const action = user.activo ? 'desactivar' : 'activar';
    if (!window.confirm(`Confirma ${action} la cuenta de ${user.nombres} ${user.apellidos}?`)) return;
    setBusyId(user.id);
    setActionError(null);
    try {
      await api.post(`/users/${user.id}/status`, { activo: !user.activo });
      await users.reload();
      notify(`Cuenta ${user.activo ? 'desactivada' : 'activada'} correctamente.`);
    } catch (error) {
      setActionError(apiErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const pickAvatar = (user: UsuarioAdmin) => {
    setAvatarTarget(user);
    avatarInput.current?.click();
  };

  const onAvatarSelected = async (file: File | undefined) => {
    if (!file || !avatarTarget) return;
    setAvatarBusy(true);
    setActionError(null);
    try {
      const dataUrl = await fileToAvatar(file);
      await api.post(`/users/${avatarTarget.id}/avatar`, { avatarUrl: dataUrl });
      await users.reload();
      notify(`Foto de ${avatarTarget.nombres} ${avatarTarget.apellidos} actualizada.`);
      if (avatarTarget.id === sessionUser?.id) {
        useAuth.getState().updateUser({ avatarUrl: dataUrl });
      }
    } catch (error) {
      setActionError(apiErrorMessage(error));
    } finally {
      setAvatarBusy(false);
      setAvatarTarget(null);
      if (avatarInput.current) avatarInput.current.value = '';
    }
  };

  return (
    <div className="mod-page">
      <ModuleHero
        eyebrow="Administración de accesos"
        title="Usuarios y roles"
        description="Alta de cuentas, asignación de roles, estado de acceso y restablecimiento de contraseñas. El registro público permanece deshabilitado."
        actions={
          <>
            <button
              type="button"
              onClick={() => (section === 'users' ? users.reload() : rolesQuery.reload())}
              className="mod-hero-button-soft"
              disabled={section === 'users' ? users.loading : rolesQuery.loading}
            >
              <RefreshCw className={clsx('h-3.5 w-3.5', (section === 'users' ? users.loading : rolesQuery.loading) && 'animate-spin')} /> Actualizar
            </button>
            {section === 'users' && canCreate && (
              <button type="button" onClick={() => setCreateOpen(true)} className="mod-hero-button">
                <Plus className="h-3.5 w-3.5" /> Nuevo usuario
              </button>
            )}
            <input
              ref={avatarInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => onAvatarSelected(event.target.files?.[0])}
            />
          </>
        }
      />

      {actionError && <div className="mb-4"><ErrorAlert message={actionError} /></div>}

      <div className="mod-tabs mod-reveal mod-reveal-2">
        <button type="button" className={section === 'users' ? 'is-active' : undefined} onClick={() => setSection('users')}>
          <UserCog className="h-4 w-4" /> Usuarios
          <span className="mod-tabs-count">{data.length}</span>
        </button>
        <button type="button" className={section === 'roles' ? 'is-active' : undefined} onClick={() => setSection('roles')}>
          <ShieldCheck className="h-4 w-4" /> Roles y permisos
          <span className="mod-tabs-count">{rolesQuery.data?.length ?? 0}</span>
        </button>
      </div>

      {section === 'users' && (
        <>
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <ModuleKpi
          label="Usuarios"
          value={data.length}
          hint="Cuentas registradas"
          icon={<UserCog className="h-5 w-5" />}
          tone="brand"
          active={!roleFilter && !statusFilter && !presenceFilter}
          onClick={() => {
            setRoleFilter('');
            setStatusFilter('');
            setPresenceFilter('');
          }}
          delay="mod-reveal-1"
        />
        <ModuleKpi
          label="En línea ahora"
          value={onlineIds.size}
          hint="Actividad en los últimos 3 minutos"
          icon={<Activity className="h-5 w-5" />}
          tone="sky"
          active={presenceFilter === 'ONLINE'}
          onClick={() => setPresenceFilter(presenceFilter === 'ONLINE' ? '' : 'ONLINE')}
          delay="mod-reveal-2"
        />
        <ModuleKpi
          label="Cuentas activas"
          value={data.filter((user) => user.activo).length}
          hint="Con acceso al sistema"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="indigo"
          active={statusFilter === 'ACTIVO'}
          onClick={() => setStatusFilter(statusFilter === 'ACTIVO' ? '' : 'ACTIVO')}
          delay="mod-reveal-3"
        />
        <ModuleKpi
          label="Administradores"
          value={data.filter((user) => user.activo && user.rol === 'ADMINISTRADOR').length}
          hint="Con privilegios elevados"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="amber"
          active={roleFilter === 'ADMINISTRADOR'}
          onClick={() => {
            setRoleFilter(roleFilter === 'ADMINISTRADOR' ? '' : 'ADMINISTRADOR');
            setStatusFilter('ACTIVO');
          }}
          delay="mod-reveal-4"
        />
      </div>

      <Card className="mod-reveal mod-reveal-2">
        <div className="mod-toolbar">
          <div className="mod-toolbar-top">
            <div>
              <h3 className="text-base font-bold text-slate-800">Usuarios ({filtered.length})</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Presencia en tiempo real (cada 15 s). Edita, restablece la clave o cambia el estado de una cuenta.
              </p>
            </div>

            <div className="mod-toolbar-controls">
              <div className="mod-search">
                <Search className="mod-search-icon h-4 w-4" />
                <Input
                  className="pl-9"
                  placeholder="Buscar nombre o correo"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select
                className="w-full sm:w-52"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="">Todos los roles</option>
                {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
              </Select>
              <Select
                className="w-full sm:w-40"
                value={presenceFilter}
                onChange={(event) => setPresenceFilter(event.target.value)}
              >
                <option value="">Presencia</option>
                <option value="ONLINE">En línea</option>
                <option value="OFFLINE">Desconectados</option>
              </Select>
              <ModuleViewToggle value={view} onChange={setView} />
            </div>
          </div>

          <ModuleChips
            filters={[
              { value: '', label: 'Todos' },
              { value: 'ACTIVO', label: 'Activos' },
              { value: 'INACTIVO', label: 'Inactivos' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            counts={{
              '': data.length,
              ACTIVO: data.filter((user) => user.activo).length,
              INACTIVO: data.filter((user) => !user.activo).length,
            }}
            ariaLabel="Filtrar por estado"
          />
        </div>

        {users.error && <div className="p-5"><ErrorAlert message={users.error} onRetry={users.reload} /></div>}
        {users.loading && !users.data ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState title="Sin usuarios" description="Ningun usuario coincide con los filtros." />
        ) : view === 'grid' ? (
          <div className="mod-grid">
            {pagination.pageItems.map((user) => {
              const isSelf = user.id === sessionUser?.id;
              const online = onlineIds.has(user.id);
              const blocked = user.bloqueadoHasta && new Date(user.bloqueadoHasta) > new Date();
              return (
                <div key={user.id} className="mod-card">
                  <div>
                    <div className="mod-card-top">
                      <div className="flex items-start gap-2.5">
                        <UserAvatar
                          name={`${user.nombres} ${user.apellidos}`}
                          src={user.avatarUrl}
                          size={38}
                          presence={online ? 'online' : 'offline'}
                        />
                        <div>
                          <p className="mod-card-title">
                            {user.nombres} {user.apellidos}
                            {isSelf && <span className="ml-1 text-[10px] font-semibold text-brand-700">(usted)</span>}
                          </p>
                          <p className="mod-card-sub">{user.email}</p>
                        </div>
                      </div>
                      <Badge tone={user.rol === 'ADMINISTRADOR' ? 'indigo' : 'brand'}>
                        {ROLE_LABELS[user.rol]}
                      </Badge>
                    </div>

                    <div className="mod-card-metrics mt-3">
                      <div>
                        <span>Presencia</span>
                        <strong className={online ? 'text-emerald-600' : 'text-slate-400'}>
                          {online ? 'En línea' : 'Desconectado'}
                        </strong>
                      </div>
                      <div>
                        <span>Último acceso</span>
                        <strong className="text-xs">{formatDateTime(user.ultimoAcceso)}</strong>
                      </div>
                    </div>

                    {blocked && (
                      <div className="mt-2">
                        <Badge tone="amber">Bloqueado temporalmente</Badge>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mod-card-footer">
                      <span>{user.telefono ?? 'Sin teléfono'}</span>
                      <span className={online ? 'font-semibold text-emerald-600' : undefined}>
                        {online ? 'Activo ahora' : user.activo ? 'Acceso habilitado' : 'Acceso revocado'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap justify-end gap-1">
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="sm" disabled={avatarBusy} onClick={() => pickAvatar(user)}>
                            <Camera className="h-3.5 w-3.5" /> Foto
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditing(user)}>
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setResetting(user)}>
                            <KeyRound className="h-3.5 w-3.5" /> Clave
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isSelf || busyId === user.id}
                            onClick={() => toggleStatus(user)}
                          >
                            {user.activo ? <UserX className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            {user.activo ? 'Desactivar' : 'Activar'}
                          </Button>
                        </>
                      )}
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
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Teléfono</th>
                  <th>Presencia</th>
                  <th>Estado</th>
                  <th>Último acceso</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((user) => {
                  const isSelf = user.id === sessionUser?.id;
                  const online = onlineIds.has(user.id);
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            name={`${user.nombres} ${user.apellidos}`}
                            src={user.avatarUrl}
                            size={34}
                            presence={online ? 'online' : 'offline'}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800">
                              {user.nombres} {user.apellidos} {isSelf && <span className="text-xs font-normal text-brand-700">(usted)</span>}
                            </p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                            {user.bloqueadoHasta && new Date(user.bloqueadoHasta) > new Date() && (
                              <Badge tone="amber">Bloqueado temporalmente</Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td><Badge tone={user.rol === 'ADMINISTRADOR' ? 'indigo' : 'brand'}>{ROLE_LABELS[user.rol]}</Badge></td>
                      <td className="text-xs">{user.telefono ?? '-'}</td>
                      <td>
                        <Badge tone={online ? 'green' : 'slate'}>
                          <Activity className="h-3 w-3" />
                          {online ? 'En línea' : 'Desconectado'}
                        </Badge>
                        {!online && lastSeen.get(user.id) && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            Visto {formatDateTime(lastSeen.get(user.id))}
                          </p>
                        )}
                      </td>
                      <td>
                        <Badge tone={user.activo ? 'green' : 'slate'}>
                          {user.activo ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {user.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap text-xs">{formatDateTime(user.ultimoAcceso)}</td>
                      <td>
                        <div className="flex flex-wrap justify-end gap-1">
                          {canEdit && (
                            <>
                              <Button variant="ghost" size="sm" disabled={avatarBusy} onClick={() => pickAvatar(user)}>
                                <Camera className="h-3.5 w-3.5" /> Foto
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setEditing(user)}>
                                <Pencil className="h-3.5 w-3.5" /> Editar
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setResetting(user)}>
                                <KeyRound className="h-3.5 w-3.5" /> Clave
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isSelf || busyId === user.id}
                                onClick={() => toggleStatus(user)}
                              >
                                {user.activo ? <UserX className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {user.activo ? 'Desactivar' : 'Activar'}
                              </Button>
                            </>
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
        </>
      )}

      {section === 'roles' && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Roles y permisos ({filteredRoles.length})
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Seleccione un rol para revisar o ajustar su matriz de acceso.
              </p>
            </div>
            <div className="mod-search">
              <Search className="mod-search-icon h-4 w-4" />
              <Input
                className="pl-9"
                placeholder="Buscar rol o descripción"
                value={roleSearch}
                onChange={(event) => setRoleSearch(event.target.value)}
              />
            </div>
          </div>

          {rolesQuery.error && (
            <div className="p-5"><ErrorAlert message={rolesQuery.error} onRetry={rolesQuery.reload} /></div>
          )}
          {rolePermissions.error && (
            <div className="p-5 pb-0"><ErrorAlert message={rolePermissions.error} onRetry={rolePermissions.reload} /></div>
          )}

          {rolesQuery.loading && !rolesQuery.data ? (
            <Spinner />
          ) : filteredRoles.length === 0 ? (
            <EmptyState title="Sin roles" description="Ningún rol coincide con la búsqueda." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rol</th>
                    <th>Usuarios</th>
                    <th>Módulos con acceso</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map((role) => {
                    const perms = rolePermissions.data?.[String(role.id)] ?? [];
                    const visibles = perms.filter((permiso) => permiso.ver);
                    const pct = perms.length > 0 ? Math.round((visibles.length / perms.length) * 100) : 0;
                    const isAdmin = role.nombre === 'ADMINISTRADOR';
                    const isExpanded = expandedRole === role.id;
                    return (
                      <Fragment key={role.id}>
                        <tr
                          className={clsx('mod-row', canEdit && 'cursor-pointer')}
                          onClick={() => canEdit && setPermisoRole(role)}
                        >
                          <td>
                            <div className="flex items-center gap-3">
                              <span className={clsx(
                                'grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1',
                                isAdmin
                                  ? 'bg-brand-50 text-brand-700 ring-brand-100'
                                  : 'bg-indigo-50 text-indigo-600 ring-indigo-100',
                              )}>
                                {isAdmin ? <ShieldCheck className="h-4 w-4" /> : <UserCog className="h-4 w-4" />}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800">{role.nombre}</p>
                                <p className="text-[11px] text-slate-400">{role.descripcion ?? '-'}</p>
                              </div>
                              <button
                                type="button"
                                className="ml-1 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                aria-label={isExpanded ? 'Ocultar módulos' : 'Ver módulos'}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setExpandedRole(isExpanded ? null : role.id);
                                }}
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            </div>
                          </td>
                          <td>
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              {usersForRole(role.nombre as Rol)}
                            </span>
                          </td>
                          <td>
                            {rolePermissions.loading && !rolePermissions.data ? (
                              <span className="text-xs text-slate-400">Calculando...</span>
                            ) : (
                              <div className="w-40">
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                  {visibles.length} de {perms.length} módulos
                                </p>
                              </div>
                            )}
                          </td>
                          <td>
                            <Badge tone={isAdmin ? 'brand' : 'indigo'}>
                              {isAdmin ? 'Administrador' : 'Configurable'}
                            </Badge>
                          </td>
                          <td className="text-right">
                            {canEdit ? (
                              <Button
                                size="sm"
                                variant="soft"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setPermisoRole(role);
                                }}
                              >
                                <ShieldCheck className="h-3.5 w-3.5" /> Permisos
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">Solo lectura</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={5} className="px-5 pb-4 pt-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  Módulos visibles:
                                </span>
                                {visibles.length === 0 ? (
                                  <span className="text-xs text-slate-400">Ninguno</span>
                                ) : (
                                  visibles.map((permiso) => (
                                    <span
                                      key={permiso.modulo}
                                      className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200"
                                    >
                                      {permiso.label}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          users.reload();
          notify('Usuario creado correctamente.');
        }}
      />

      <EditUserModal
        user={editing}
        currentUserId={sessionUser?.id}
        onClose={() => setEditing(null)}
        onUpdated={() => {
          setEditing(null);
          users.reload();
          notify('Usuario actualizado correctamente.');
        }}
      />

      <ResetPasswordModal
        user={resetting}
        onClose={() => setResetting(null)}
        onUpdated={() => {
          setResetting(null);
          notify('Contraseña restablecida. Se revocaron las sesiones del usuario.');
        }}
      />

      <PermisosRolModal
        role={permisoRole}
        onClose={() => setPermisoRole(null)}
        onSaved={(message) => {
          setPermisoRole(null);
          rolesQuery.reload();
          notify(message);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Create */

function CreateUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      nombres: '',
      apellidos: '',
      email: '',
      telefono: '',
      rol: 'PERSONAL_LOGISTICA',
      password: '',
      activo: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      nombres: '',
      apellidos: '',
      email: '',
      telefono: '',
      rol: 'PERSONAL_LOGISTICA',
      password: '',
      activo: true,
    });
    setServerError(null);
    setShowPassword(false);
  }, [open, reset]);

  const nombres = watch('nombres');
  const apellidos = watch('apellidos');
  const email = watch('email');
  const rol = watch('rol');
  const activo = watch('activo');
  const password = watch('password') ?? '';

  const initials =
    `${nombres?.trim().charAt(0) ?? ''}${apellidos?.trim().charAt(0) ?? ''}`.toUpperCase();
  const fullName = `${nombres ?? ''} ${apellidos ?? ''}`.trim();
  const RoleIcon = ROLE_META[rol].Icon;

  const passwordStrength = !password
    ? 0
    : password.length < 10
      ? 1
      : 1 +
        (/[a-z]/.test(password) && /[A-Z]/.test(password) ? 1 : 0) +
        (/\d/.test(password) ? 1 : 0) +
        (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
  const strengthLabels = ['Sin contraseña', 'Débil', 'Media', 'Fuerte', 'Excelente'];

  const onSubmit = async (values: CreateForm) => {
    setServerError(null);
    try {
      await api.post('/users', { ...values, telefono: values.telefono || null });
      onCreated();
    } catch (error) {
      setServerError(apiErrorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      title="Nuevo usuario"
      subtitle="Crea el acceso y define el rol del colaborador."
      icon={<UserCog className="h-4 w-4" />}
      tone="indigo"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="create-user-form" loading={isSubmitting}>Crear usuario</Button>
        </>
      }
    >
      <form id="create-user-form" className="cu-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <ErrorAlert message={serverError} />}

        <div className="cu-identity">
          <div className={clsx('cu-avatar', initials && 'has-initials')}>
            {initials ? <span>{initials}</span> : <UserRound className="h-7 w-7" />}
            <i className="cu-avatar-ring" aria-hidden />
          </div>
          <div className="cu-identity-copy">
            <p className="cu-identity-eyebrow">
              <Sparkles className="h-3 w-3" /> Nuevo acceso corporativo
            </p>
            <h3>{fullName || 'Nombre del colaborador'}</h3>
            <span className="cu-identity-mail">
              <Mail className="h-3.5 w-3.5" /> {email || 'correo@empresa.com'}
            </span>
            <div className="cu-identity-tags">
              <span className="cu-tag cu-tag-role">
                <RoleIcon className="h-3 w-3" /> {ROLE_LABELS[rol]}
              </span>
              <span className={clsx('cu-tag cu-tag-state', activo ? 'is-on' : 'is-off')}>
                <i aria-hidden /> {activo ? 'Cuenta activa' : 'Cuenta inactiva'}
              </span>
            </div>
          </div>
          <span className="cu-identity-mark" aria-hidden>
            <ShieldCheck className="h-7 w-7" />
          </span>
        </div>

        <section className="cu-section">
          <header className="cu-section-head">
            <span className="cu-section-icon"><UserRound className="h-4 w-4" /></span>
            <div>
              <h4>Datos personales</h4>
              <p>Identidad del colaborador dentro de la organización</p>
            </div>
          </header>
          <div className="cu-grid-2">
            <Field label="Nombres" error={errors.nombres?.message}>
              <Input placeholder="Ej. Ana María" autoComplete="off" {...register('nombres')} />
            </Field>
            <Field label="Apellidos" error={errors.apellidos?.message}>
              <Input placeholder="Ej. Quispe Ramos" autoComplete="off" {...register('apellidos')} />
            </Field>
            <Field label="Correo electrónico" error={errors.email?.message}>
              <Input type="email" placeholder="usuario@empresa.com" autoComplete="off" {...register('email')} />
            </Field>
            <Field label="Teléfono" error={errors.telefono?.message}>
              <Input placeholder="+51 999 999 999" autoComplete="off" {...register('telefono')} />
            </Field>
          </div>
        </section>

        <section className="cu-section">
          <header className="cu-section-head">
            <span className="cu-section-icon"><ShieldCheck className="h-4 w-4" /></span>
            <div>
              <h4>Rol y permisos</h4>
              <p>El rol define los módulos y acciones disponibles</p>
            </div>
          </header>
          <div className="cu-roles" role="radiogroup" aria-label="Rol del sistema">
            {ROLES.map((role) => {
              const { Icon, hint } = ROLE_META[role];
              const selected = rol === role;
              return (
                <button
                  key={role}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={clsx('cu-role', selected && 'is-selected')}
                  onClick={() => setValue('rol', role, { shouldValidate: true, shouldDirty: true })}
                >
                  <span className="cu-role-icon"><Icon className="h-4 w-4" /></span>
                  <span className="cu-role-copy">
                    <strong>{ROLE_LABELS[role]}</strong>
                    <small>{hint}</small>
                  </span>
                  <span className="cu-role-check" aria-hidden>
                    <Check className="h-3 w-3" />
                  </span>
                </button>
              );
            })}
          </div>
          {errors.rol && <p className="cu-error">{errors.rol.message}</p>}
        </section>

        <section className="cu-section">
          <header className="cu-section-head">
            <span className="cu-section-icon"><LockKeyhole className="h-4 w-4" /></span>
            <div>
              <h4>Seguridad de la cuenta</h4>
              <p>Credencial inicial y estado del acceso</p>
            </div>
          </header>

          <div className="cu-security">
            <Field
              label="Contraseña inicial"
              error={errors.password?.message}
              hint="Mínimo 10 caracteres. El usuario deberá cambiarla al ingresar."
            >
              <div className="cu-password">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 10 caracteres"
                  autoComplete="new-password"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="cu-eye"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <div className={clsx('cu-strength', `level-${passwordStrength}`)} aria-live="polite">
              <div className="cu-strength-bars" aria-hidden>
                {[1, 2, 3, 4].map((level) => (
                  <span key={level} className={level <= passwordStrength ? 'is-on' : ''} />
                ))}
              </div>
              <span>{strengthLabels[passwordStrength]}</span>
            </div>
          </div>

          <label className="cu-switch">
            <input type="checkbox" {...register('activo')} />
            <span className="cu-switch-track" aria-hidden><i /></span>
            <span className="cu-switch-copy">
              <strong>Cuenta activa</strong>
              <small>El usuario podrá iniciar sesión inmediatamente.</small>
            </span>
            <span className={clsx('cu-switch-state', activo ? 'is-on' : 'is-off')}>
              {activo ? 'Activa' : 'Inactiva'}
            </span>
          </label>
        </section>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------- Edit */

function EditUserModal({
  user,
  currentUserId,
  onClose,
  onUpdated,
}: {
  user: UsuarioAdmin | null;
  currentUserId?: number;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      nombres: '',
      apellidos: '',
      telefono: '',
      rol: 'PERSONAL_LOGISTICA',
      activo: true,
    },
  });

  useEffect(() => {
    if (!user) return;
    reset({
      nombres: user.nombres,
      apellidos: user.apellidos,
      telefono: user.telefono ?? '',
      rol: user.rol,
      activo: user.activo,
    });
    setServerError(null);
  }, [user, reset]);

  const nombres = watch('nombres');
  const apellidos = watch('apellidos');
  const rol = watch('rol');
  const activo = watch('activo');

  const isSelf = user?.id === currentUserId;
  const initials =
    `${nombres?.trim().charAt(0) ?? ''}${apellidos?.trim().charAt(0) ?? ''}`.toUpperCase();
  const fullName = `${nombres ?? ''} ${apellidos ?? ''}`.trim();
  const RoleIcon = ROLE_META[rol].Icon;

  const onSubmit = async (values: EditForm) => {
    if (!user) return;
    setServerError(null);
    try {
      await api.put(`/users/${user.id}`, { ...values, telefono: values.telefono || null });
      onUpdated();
    } catch (error) {
      setServerError(apiErrorMessage(error));
    }
  };

  return (
    <Modal
      open={Boolean(user)}
      title="Editar usuario"
      subtitle="Actualiza los datos, el rol y el estado del colaborador."
      icon={<UserCog className="h-4 w-4" />}
      tone="indigo"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="edit-user-form" loading={isSubmitting} disabled={!user}>Guardar cambios</Button>
        </>
      }
    >
      {user && (
        <form id="edit-user-form" className="cu-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {serverError && <ErrorAlert message={serverError} />}

          <div className="cu-identity">
            <div className={clsx('cu-avatar', initials && 'has-initials')}>
              {initials ? <span>{initials}</span> : <UserRound className="h-7 w-7" />}
              <i className="cu-avatar-ring" aria-hidden />
            </div>
            <div className="cu-identity-copy">
              <p className="cu-identity-eyebrow">
                <Pencil className="h-3 w-3" /> Perfil corporativo
              </p>
              <h3>{fullName || 'Usuario sin nombre'}</h3>
              <span className="cu-identity-mail">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </span>
              <div className="cu-identity-tags">
                <span className="cu-tag cu-tag-role">
                  <RoleIcon className="h-3 w-3" /> {ROLE_LABELS[rol]}
                </span>
                <span className={clsx('cu-tag cu-tag-state', activo ? 'is-on' : 'is-off')}>
                  <i aria-hidden /> {activo ? 'Cuenta activa' : 'Cuenta inactiva'}
                </span>
              </div>
            </div>
            <span className="cu-identity-mark" aria-hidden>
              <ShieldCheck className="h-7 w-7" />
            </span>
          </div>

          <section className="cu-section">
            <header className="cu-section-head">
              <span className="cu-section-icon"><UserRound className="h-4 w-4" /></span>
              <div>
                <h4>Datos personales</h4>
                <p>El correo de acceso no se puede modificar</p>
              </div>
            </header>
            <div className="cu-grid-2">
              <Field label="Nombres" error={errors.nombres?.message}>
                <Input autoComplete="off" {...register('nombres')} />
              </Field>
              <Field label="Apellidos" error={errors.apellidos?.message}>
                <Input autoComplete="off" {...register('apellidos')} />
              </Field>
              <Field label="Teléfono" error={errors.telefono?.message}>
                <Input placeholder="+51 999 999 999" autoComplete="off" {...register('telefono')} />
              </Field>
              <Field label="Correo de acceso">
                <Input value={user.email} disabled readOnly />
              </Field>
            </div>
          </section>

          <section className="cu-section">
            <header className="cu-section-head">
              <span className="cu-section-icon"><ShieldCheck className="h-4 w-4" /></span>
              <div>
                <h4>Rol y permisos</h4>
                <p>
                  {isSelf
                    ? 'Por seguridad, no puede retirar su propio rol de administrador'
                    : 'El rol define los módulos y acciones disponibles'}
                </p>
              </div>
            </header>
            <div className="cu-roles" role="radiogroup" aria-label="Rol del sistema">
              {ROLES.map((role) => {
                const { Icon, hint } = ROLE_META[role];
                const selected = rol === role;
                return (
                  <button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={isSelf}
                    className={clsx('cu-role', selected && 'is-selected', isSelf && 'is-locked')}
                    onClick={() => setValue('rol', role, { shouldValidate: true, shouldDirty: true })}
                  >
                    <span className="cu-role-icon"><Icon className="h-4 w-4" /></span>
                    <span className="cu-role-copy">
                      <strong>{ROLE_LABELS[role]}</strong>
                      <small>{hint}</small>
                    </span>
                    <span className="cu-role-check" aria-hidden>
                      <Check className="h-3 w-3" />
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.rol && <p className="cu-error">{errors.rol.message}</p>}
          </section>

          <section className="cu-section">
            <header className="cu-section-head">
              <span className="cu-section-icon"><LockKeyhole className="h-4 w-4" /></span>
              <div>
                <h4>Estado de la cuenta</h4>
                <p>Controla si el usuario puede iniciar sesión</p>
              </div>
            </header>
            <label className="cu-switch">
              <input type="checkbox" disabled={isSelf} {...register('activo')} />
              <span className="cu-switch-track" aria-hidden><i /></span>
              <span className="cu-switch-copy">
                <strong>Cuenta activa</strong>
                <small>
                  {isSelf
                    ? 'Por seguridad, no puede desactivar su propia cuenta.'
                    : 'El usuario podrá iniciar sesión mientras esté activa.'}
                </small>
              </span>
              <span className={clsx('cu-switch-state', activo ? 'is-on' : 'is-off')}>
                {activo ? 'Activa' : 'Inactiva'}
              </span>
            </label>
          </section>
        </form>
      )}
    </Modal>
  );
}

/* ---------------------------------------------------------- Reset password */

function ResetPasswordModal({
  user,
  onClose,
  onUpdated,
}: {
  user: UsuarioAdmin | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setPassword('');
    setConfirm('');
    setError(null);
  }, [user]);

  const submit = async () => {
    if (password.length < 10) {
      setError('La contraseña debe tener al menos 10 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('La confirmación no coincide.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(`/users/${user?.id}/reset-password`, { newPassword: password });
      onUpdated();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(user)}
      title={user ? `Restablecer clave de ${user.nombres} ${user.apellidos}` : 'Restablecer contraseña'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={busy} disabled={!password} onClick={submit}>Restablecer</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorAlert message={error} />}
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Se revocaran las sesiones activas del usuario. Comunique la nueva contraseña por un canal seguro.
        </p>
        <Field label="Nueva contraseña">
          <Input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <Field label="Confirmar contraseña">
          <Input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
