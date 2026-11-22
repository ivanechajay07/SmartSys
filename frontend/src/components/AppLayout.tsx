import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BellRing,
  Boxes,
  Building2,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Package,
  Route,
  Search,
  HeartPulse,
  ShieldCheck,
  Sun,
  Truck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { api, logoutRequest } from '@/lib/api';
import { formatDateTime, stateLabel } from '@/lib/format';
import { NAV_GROUPS, navigationFor } from '@/lib/navigation';
import { useTheme } from '@/lib/theme';
import { notifyBadgeRefresh, useNotifications } from '@/lib/useNotifications';
import { ROLE_LABELS, useAuth } from '@/store/auth';
import type {
  Despacho,
  EntidadPublica,
  Inventario,
  Notificacion,
  PerfilUsuario,
  PermisoModulo,
  Producto,
  SolicitudMaterial,
  UsuarioAdmin,
} from '@/types';
import { UserAvatar } from '@/components/UserAvatar';
import '@/styles/layout.css';

const SIDEBAR_KEY = 'smartsys-sidebar-collapsed';

export default function AppLayout() {
  const user = useAuth((state) => state.user);
  const token = useAuth((state) => state.token);
  const permisos = useAuth((state) => state.permisos);
  const setPermisos = useAuth((state) => state.setPermisos);
  const can = useAuth((state) => state.can);
  const logout = useAuth((state) => state.logout);
  const updateUser = useAuth((state) => state.updateUser);
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'NOTIF' | 'ALERT' | 'ASSIGN'>('NOTIF');
  const [notifItems, setNotifItems] = useState<Notificacion[]>([]);
  const [stockAlerts, setStockAlerts] = useState<Inventario[]>([]);
  const [assignments, setAssignments] = useState<Despacho[]>([]);
  const [centerLoading, setCenterLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem(SIDEBAR_KEY) === '1');
  const { unread, setUnread } = useNotifications();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .get<PerfilUsuario>('/auth/me')
      .then(({ data }) => {
        if (!active) return;
        updateUser({
          nombre: data.nombre,
          telefono: data.telefono,
          avatarUrl: data.avatarUrl,
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user?.id, updateUser]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setCenterLoading(true);
      const [notifications, alerts, assigned] = await Promise.allSettled([
        api.get<Notificacion[]>('/notifications'),
        api.get<Inventario[]>('/dashboard/stock-alerts'),
        api.get<Despacho[]>('/mobile/assignments'),
      ]);
      if (!active) return;
      if (notifications.status === 'fulfilled') setNotifItems(notifications.value.data);
      if (alerts.status === 'fulfilled') setStockAlerts(alerts.value.data);
      if (assigned.status === 'fulfilled') setAssignments(assigned.value.data);
      setCenterLoading(false);
    };

    load();
    const interval = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api.get<PermisoModulo[]>('/auth/permissions')
      .then((response) => {
        if (active) setPermisos(response.data);
      })
      .catch(() => {
        // Si falla la carga, el backend seguirá protegiendo cada endpoint.
      });
    return () => {
      active = false;
    };
  }, [token, setPermisos]);

  const groups = useMemo(
    () => navigationFor()
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !permisos || can(item.module, 'ver')),
      }))
      .filter((group) => group.items.length > 0),
    [permisos, can],
  );

  const currentLabel = useMemo(() => {
    const flat = groups.flatMap((group) => group.items);
    if (location.pathname.startsWith('/despachos/') || location.pathname.startsWith('/dispatches/')) return 'Detalle de despacho';
    if (location.pathname.startsWith('/cumplimiento/') || location.pathname.startsWith('/compliance/')) return 'Detalle de cumplimiento';
    if (location.pathname === '/design-system') return 'Sistema de diseño';
    return flat.find((item) => item.to === location.pathname)?.label ?? 'Higiene y Salud S.A.C.';
  }, [groups, location.pathname]);

  const mobileNavItems = useMemo(() => {
    const flat = groups.flatMap((group) => group.items);
    const preferred = ['/', '/solicitudes', '/despachos', '/ruta-movil', '/notificaciones', '/perfil'];
    const selected = preferred.flatMap((to) => {
      const found = flat.find((item) => item.to === to);
      return found ? [found] : [];
    });
    for (const item of flat) {
      if (selected.length >= 4) break;
      if (!selected.some((selectedItem) => selectedItem.to === item.to)) selected.push(item);
    }
    return selected.slice(0, 4);
  }, [groups]);

  useEffect(() => {
    document.title = `${currentLabel} · SmartSys`;
  }, [currentLabel]);

  const currentGroup = useMemo(
    () =>
      groups.find((group) => group.items.some((item) => item.to === location.pathname))?.title ??
      'Operación',
    [groups, location.pathname],
  );

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date()),
    [],
  );

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!notifOpen && !menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotifOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [notifOpen, menuOpen]);

  const handleLogout = async () => {
    await logoutRequest();
    logout();
    navigate('/login', { replace: true });
  };

  const markNotificationRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifItems((items) => items.map((item) => (item.id === id ? { ...item, leida: true } : item)));
      setUnread(Math.max(0, unread - 1));
      notifyBadgeRefresh();
    } catch {
      // La bandeja completa permite reintentar.
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifItems((items) => items.map((item) => ({ ...item, leida: true })));
      setUnread(0);
      notifyBadgeRefresh();
    } catch {
      // Silencioso: el contador se reintenta en la próxima carga.
    }
  };

  const goToNotification = async (item: Notificacion) => {
    if (!item.leida) await markNotificationRead(item.id);
    setNotifOpen(false);
    navigate('/notificaciones');
  };

  const openAlerts = stockAlerts.length;
  const openAssignments = assignments.length;

  const renderSidebar = (mobile: boolean) => {
    const compact = collapsed && !mobile;

    return (
      <div className="app-sidebar-inner">
        <div className="sidebar-brand">
          <Link to="/" className="sidebar-brand-mark" aria-label="Ir al panel general">
            <HeartPulse className="h-5 w-5" />
          </Link>
          <div className="sidebar-brand-text">
            <p className="sidebar-brand-name">Higiene y Salud S.A.C.</p>
          </div>
          {mobile && (
            <button
              type="button"
              className="sidebar-collapse"
              onClick={() => setDrawerOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {groups.map((group) => (
            <div key={group.title} className="sidebar-section">
              <p className="sidebar-section-title">{group.title}</p>
              <ul className="sidebar-items">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const showBadge = item.to === '/notificaciones' && unread > 0;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        title={compact ? item.label : undefined}
                        data-tooltip={item.label}
                        aria-label={item.label}
                        className={({ isActive }) =>
                          clsx('sidebar-link', isActive && 'sidebar-link-active')
                        }
                      >
                        <span className="sidebar-link-icon">
                          <Icon className="h-[17px] w-[17px]" />
                        </span>
                        <span className="sidebar-label">{item.label}</span>
                        {showBadge && (
                          <span className="sidebar-badge">{unread > 99 ? '99+' : unread}</span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <UserAvatar
              name={user?.nombre}
              src={user?.avatarUrl}
              size={34}
              presence="online"
              className="sidebar-avatar"
            />
            {!compact && (
              <div className="sidebar-user-info">
                <p className="sidebar-user-name">{user?.nombre}</p>
                <p className="sidebar-user-role">{user ? ROLE_LABELS[user.rol] : ''}</p>
              </div>
            )}
            {!compact && (
              <button
                type="button"
                className="sidebar-logout"
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={clsx(
        'app-shell min-h-screen bg-slate-100',
        collapsed && 'is-collapsed',
        drawerOpen && 'is-drawer-open',
      )}
    >
      <a href="#contenido-principal" className="skip-link">Saltar al contenido</a>
      <aside className="app-sidebar app-sidebar-desktop fixed inset-y-0 left-0 z-30 hidden lg:block">
        {renderSidebar(false)}
      </aside>

      <button
        type="button"
        className="sidebar-float-toggle"
        onClick={() => setCollapsed((value) => !value)}
        aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
        title={collapsed ? 'Expandir menú' : 'Contraer menú'}
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
      </button>

      {drawerOpen && (
        <div className="app-drawer-backdrop lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
          />
          <div className="app-drawer" role="dialog" aria-modal="true" aria-label="Menú principal">
            <div className="app-sidebar app-sidebar-mobile">{renderSidebar(true)}</div>
          </div>
        </div>
      )}

      <div className="app-content">
        <header className="app-topbar">
          <div className="app-route-progress" key={location.pathname} aria-hidden>
            <span />
          </div>
          <button
            type="button"
            className="app-menu-button lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="app-breadcrumb">
              <span>Higiene y Salud</span>
              <ChevronRight className="h-3 w-3" />
              <span className="app-breadcrumb-current">{currentGroup}</span>
            </div>
            <p className="app-page-title">{currentLabel}</p>
          </div>

          <GlobalSearch />

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <span className="app-date-chip">
              <CalendarDays className="h-3.5 w-3.5 text-brand-600" /> {today}
            </span>

            <button
              type="button"
              className="app-theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              aria-pressed={theme === 'dark'}
            >
              <span className="app-theme-thumb" aria-hidden />
              <Moon className="app-theme-moon" aria-hidden />
              <Sun className="app-theme-sun" aria-hidden />
            </button>

            <div className="relative">
              <button
                type="button"
                className={clsx('app-icon-button', notifOpen && 'is-active')}
                onClick={() => {
                  setNotifOpen((value) => !value);
                  setMenuOpen(false);
                }}
                aria-label="Centro de notificaciones"
                aria-haspopup="dialog"
                aria-expanded={notifOpen}
              >
                {unread > 0 ? <BellRing className="h-[18px] w-[18px]" /> : <Bell className="h-[18px] w-[18px]" />}
                {unread > 0 && (
                  <span className="app-notification-badge">{unread > 99 ? '99+' : unread}</span>
                )}
              </button>

              {notifOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setNotifOpen(false)}
                    tabIndex={-1}
                    aria-hidden
                  />
                  <div className="app-activity-panel" role="dialog" aria-label="Centro de actividad">
                    <div className="app-activity-head">
                      <div>
                        <p className="app-activity-eyebrow">
                          <span className="app-activity-live" /> En vivo
                        </p>
                        <h3>Centro de actividad</h3>
                        <p className="app-activity-sub">
                          {unread} sin leer · {openAlerts} alertas · {openAssignments} asignaciones
                        </p>
                      </div>
                      <button
                        type="button"
                        className="app-activity-read"
                        onClick={markAllRead}
                        disabled={unread === 0}
                      >
                        <CheckCheck className="h-3.5 w-3.5" /> Marcar leídas
                      </button>
                    </div>

                    <div className="app-activity-tabs" role="tablist" aria-label="Tipo de actividad">
                      {[
                        { key: 'NOTIF' as const, label: 'Notificaciones', count: notifItems.filter((item) => !item.leida).length },
                        { key: 'ALERT' as const, label: 'Alertas', count: openAlerts },
                        { key: 'ASSIGN' as const, label: 'Asignaciones', count: openAssignments },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          role="tab"
                          aria-selected={notifTab === tab.key}
                          className={clsx('app-activity-tab', notifTab === tab.key && 'is-active')}
                          onClick={() => setNotifTab(tab.key)}
                        >
                          {tab.label}
                          <span>{tab.count}</span>
                        </button>
                      ))}
                    </div>

                    <div className="app-activity-body">
                      {centerLoading && notifItems.length === 0 && stockAlerts.length === 0 ? (
                        <div className="app-activity-empty">Cargando actividad…</div>
                      ) : notifTab === 'NOTIF' ? (
                        notifItems.length === 0 ? (
                          <div className="app-activity-empty">Sin notificaciones por ahora.</div>
                        ) : (
                          notifItems.slice(0, 6).map((item) => (
                            <button
                              key={`n-${item.id}`}
                              type="button"
                              className={clsx('app-activity-item', !item.leida && 'is-unread')}
                              onClick={() => goToNotification(item)}
                            >
                              <span className="app-activity-icon is-brand">
                                <Bell className="h-4 w-4" />
                              </span>
                              <span className="app-activity-copy">
                                <span className="app-activity-title">{item.titulo}</span>
                                <span className="app-activity-message">{item.mensaje}</span>
                                <span className="app-activity-meta">
                                  {formatDateTime(item.fecha)}
                                  {!item.leida && <i className="app-activity-dot" />}
                                </span>
                              </span>
                            </button>
                          ))
                        )
                      ) : notifTab === 'ALERT' ? (
                        stockAlerts.length === 0 ? (
                          <div className="app-activity-empty">No hay alertas de stock.</div>
                        ) : (
                          stockAlerts.slice(0, 6).map((item) => (
                            <button
                              key={`a-${item.id}`}
                              type="button"
                              className="app-activity-item is-unread"
                              onClick={() => {
                                setNotifOpen(false);
                                navigate('/inventario');
                              }}
                            >
                              <span className="app-activity-icon is-amber">
                                <Boxes className="h-4 w-4" />
                              </span>
                              <span className="app-activity-copy">
                                <span className="app-activity-title">{item.producto.nombre}</span>
                                <span className="app-activity-message">
                                  Disponible {item.stockDisponible} · mínimo {item.stockMinimo} {item.producto.unidadMedida}
                                </span>
                                <span className="app-activity-meta">Requiere reposición</span>
                              </span>
                              <AlertTriangle className="ml-auto h-4 w-4 shrink-0 text-amber-500" />
                            </button>
                          ))
                        )
                      ) : assignments.length === 0 ? (
                        <div className="app-activity-empty">No tienes asignaciones activas.</div>
                      ) : (
                        assignments.slice(0, 6).map((item) => (
                          <button
                            key={`d-${item.id}`}
                            type="button"
                            className="app-activity-item"
                            onClick={() => {
                              setNotifOpen(false);
                              navigate('/ruta-movil');
                            }}
                          >
                            <span className="app-activity-icon is-sky">
                              <Route className="h-4 w-4" />
                            </span>
                            <span className="app-activity-copy">
                              <span className="app-activity-title">{item.codigo} · {item.entidad.razonSocial}</span>
                              <span className="app-activity-message">{item.puntoEntrega.nombre}</span>
                              <span className="app-activity-meta">{item.estado.replaceAll('_', ' ')}</span>
                            </span>
                            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
                          </button>
                        ))
                      )}
                    </div>

                    <div className="app-activity-foot">
                      <Link to="/notificaciones" onClick={() => setNotifOpen(false)}>
                        Ver bandeja completa <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen((value) => !value);
                  setNotifOpen(false);
                }}
                className={clsx('app-user-button', menuOpen && 'is-open')}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Menú de usuario"
              >
                <UserAvatar name={user?.nombre} src={user?.avatarUrl} size={34} presence="online" />
                <span className="hidden text-left sm:block">
                  <span className="block max-w-[150px] truncate text-xs font-semibold text-slate-800">
                    {user?.nombre}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {user ? ROLE_LABELS[user.rol] : ''}
                  </span>
                </span>
                <ChevronDown
                  className={clsx(
                    'hidden h-4 w-4 text-slate-400 transition-transform duration-200 sm:block',
                    menuOpen && 'rotate-180',
                  )}
                />
              </button>

              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setMenuOpen(false)}
                    tabIndex={-1}
                    aria-hidden
                  />
                  <div className="app-dropdown app-user-menu" role="menu">
                    <div className="app-user-menu-hero">
                      <UserAvatar name={user?.nombre} src={user?.avatarUrl} size={54} presence="online" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">{user?.nombre}</p>
                        <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="app-user-role">{user ? ROLE_LABELS[user.rol] : ''}</span>
                          <span className="app-user-online"><i /> En línea</span>
                        </div>
                      </div>
                    </div>

                    <div className="app-user-menu-grid">
                      <Link to="/perfil" className="app-user-menu-tile" role="menuitem">
                        <span className="app-user-menu-tile-icon"><UserRound className="h-4 w-4" /></span>
                        <span>
                          <strong>Mi perfil</strong>
                          <small>Datos, foto y seguridad</small>
                        </span>
                      </Link>
                      <Link to="/notificaciones" className="app-user-menu-tile" role="menuitem">
                        <span className="app-user-menu-tile-icon"><Bell className="h-4 w-4" /></span>
                        <span>
                          <strong>Notificaciones</strong>
                          <small>{unread > 0 ? `${unread} sin leer` : 'Todo al día'}</small>
                        </span>
                      </Link>
                    </div>

                    <div className="app-user-menu-list">
                      <button type="button" onClick={toggleTheme} role="menuitem">
                        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        <span>Cambiar a tema {theme === 'dark' ? 'claro' : 'oscuro'}</span>
                        <span className="app-user-menu-value">{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                      </button>
                      <Link to="/perfil" role="menuitem">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Seguridad y sesión</span>
                        <span className="app-user-menu-value">JWT</span>
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="app-dropdown-danger"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4" /> Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main id="contenido-principal" key={location.pathname} className="app-main app-page-enter">
          <Suspense
            fallback={
              <div className="app-page-loader" role="status" aria-live="polite">
                <span className="app-page-loader-dot" aria-hidden />
                Cargando módulo…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>

        <footer className="app-footer">
          Higiene y Salud S.A.C. · Operaciones registradas para auditoría
        </footer>

        <nav className="app-bottom-nav" aria-label="Navegación principal móvil">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  clsx('app-bottom-nav-item', isActive && 'is-active')
                }
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            className="app-bottom-nav-item"
            onClick={() => setDrawerOpen((open) => !open)}
            aria-label={drawerOpen ? 'Cerrar más opciones' : 'Abrir más opciones'}
            aria-expanded={drawerOpen}
          >
            <Menu className="h-[18px] w-[18px]" />
            <span>Más</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- Búsqueda global */

type GlobalSearchItem = {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  to: string;
  icon: LucideIcon;
  keywords?: string;
};

function normalizeGlobalSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function GlobalSearch() {
  const can = useAuth((state) => state.can);
  const permisos = useAuth((state) => state.permisos);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<GlobalSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const loadedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const modules = useMemo<GlobalSearchItem[]>(
    () =>
      NAV_GROUPS.flatMap((group) =>
        group.items
          .filter((item) => !permisos || can(item.module, 'ver'))
          .map((item) => ({
            id: `module-${item.to}`,
            group: 'Módulos',
            title: item.label,
            subtitle: group.title,
            to: item.to,
            icon: item.icon,
            keywords: `${item.label} ${group.title}`,
          })),
      ),
    [can, permisos],
  );

  const cargarCatalogo = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const tasks: Promise<GlobalSearchItem[]>[] = [];

    if (can('DATOS_MAESTROS', 'ver')) {
      tasks.push(
        api.get<Producto[]>('/products').then(({ data }) =>
          data.map((product) => ({
            id: `product-${product.id}`,
            group: 'Productos',
            title: product.nombre,
            subtitle: [product.codigo, product.categoria, product.marca].filter(Boolean).join(' · '),
            to: '/datos-maestros',
            icon: Package,
            keywords: `${product.codigo} ${product.categoria ?? ''} ${product.marca ?? ''}`,
          })),
        ),
      );
      tasks.push(
        api.get<EntidadPublica[]>('/entities').then(({ data }) =>
          data.map((entity) => ({
            id: `entity-${entity.id}`,
            group: 'Entidades',
            title: entity.razonSocial,
            subtitle: [`RUC ${entity.ruc}`, entity.distrito].filter(Boolean).join(' · '),
            to: '/datos-maestros',
            icon: Building2,
            keywords: `${entity.ruc} ${entity.distrito ?? ''} ${entity.provincia ?? ''}`,
          })),
        ),
      );
    }

    if (can('DESPACHOS', 'ver')) {
      tasks.push(
        api.get<Despacho[]>('/dispatches').then(({ data }) =>
          data.map((dispatch) => ({
            id: `dispatch-${dispatch.id}`,
            group: 'Despachos',
            title: `Despacho ${dispatch.codigo}`,
            subtitle: `${dispatch.entidad.razonSocial} · ${dispatch.puntoEntrega.nombre} · ${stateLabel(dispatch.estado)}`,
            to: `/despachos/${dispatch.id}`,
            icon: Truck,
            keywords: `${dispatch.codigo} ${dispatch.estado} ${dispatch.entidad.razonSocial}`,
          })),
        ),
      );
    }

    if (can('SOLICITUDES', 'ver')) {
      tasks.push(
        api.get<SolicitudMaterial[]>('/requests').then(({ data }) =>
          data.map((request) => ({
            id: `request-${request.id}`,
            group: 'Solicitudes',
            title: `Solicitud ${request.codigo}`,
            subtitle: `${request.entidad.razonSocial} · ${stateLabel(request.estado)}`,
            to: '/solicitudes',
            icon: ClipboardList,
            keywords: `${request.codigo} ${request.estado} ${request.entidad.razonSocial}`,
          })),
        ),
      );
    }

    if (can('USUARIOS', 'ver')) {
      tasks.push(
        api.get<UsuarioAdmin[]>('/users').then(({ data }) =>
          data.map((user) => ({
            id: `user-${user.id}`,
            group: 'Usuarios',
            title: `${user.nombres} ${user.apellidos}`,
            subtitle: `${user.email} · ${user.rol}`,
            to: '/usuarios',
            icon: Users,
            keywords: `${user.email} ${user.rol} ${user.nombres} ${user.apellidos}`,
          })),
        ),
      );
    }

    if (tasks.length === 0) {
      loadedRef.current = false;
      return;
    }

    setLoading(true);
    try {
      const settled = await Promise.allSettled(tasks);
      setCatalog(settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])));
    } finally {
      setLoading(false);
    }
  }, [can]);

  const abrir = useCallback(() => {
    setOpen(true);
    setQuery('');
    setActive(0);
    void cargarCatalogo();
  }, [cargarCatalogo]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (open) setOpen(false);
        else abrir();
        return;
      }
      if (event.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [abrir, open]);

  const results = useMemo(() => {
    const term = normalizeGlobalSearch(query.trim());
    if (!term) return modules.slice(0, 8);
    return [...modules, ...catalog]
      .filter((item) =>
        normalizeGlobalSearch(
          `${item.title} ${item.subtitle ?? ''} ${item.keywords ?? ''} ${item.group}`,
        ).includes(term),
      )
      .slice(0, 28);
  }, [catalog, modules, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const hasQuery = query.trim().length > 0;

  const grouped = useMemo(() => {
    const map = new Map<string, { item: GlobalSearchItem; index: number }[]>();
    results.forEach((item, index) => {
      const bucket = map.get(item.group) ?? [];
      bucket.push({ item, index });
      map.set(item.group, bucket);
    });
    return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
  }, [results]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`global-search-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const go = (item: GlobalSearchItem) => {
    setOpen(false);
    setQuery('');
    navigate(item.to);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(results.length - 1, index + 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const item = results[active];
      if (item) go(item);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="app-global-search"
        onClick={abrir}
        aria-label="Buscar en el sistema"
        aria-haspopup="dialog"
      >
        <Search className="h-4 w-4" />
        <span className="app-global-search-text">Buscar...</span>
        <kbd className="app-global-search-kbd">Ctrl K</kbd>
      </button>

      {open &&
        createPortal(
          <div
            className="app-command-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div className="app-command" role="dialog" aria-modal="true" aria-label="Búsqueda global">
              <div className="app-command-head">
                <Search className="h-4 w-4" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="Buscar módulos, productos, entidades, despachos…"
                  aria-label="Buscar en todo el sistema"
                  autoComplete="off"
                />
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <kbd className="app-command-key">Esc</kbd>
                )}
              </div>

              <div className="app-command-body">
                {results.length === 0 ? (
                  <div className="app-command-empty">
                    <Search className="h-5 w-5" />
                    <p>
                      {loading
                        ? 'Cargando registros…'
                        : hasQuery
                          ? `Sin resultados para "${query}"`
                          : 'Busca módulos, productos o entidades'}
                    </p>
                    <span>
                      {hasQuery
                        ? 'Prueba con un código, nombre, RUC o módulo.'
                        : 'Escribe para filtrar el catálogo maestro.'}
                    </span>
                  </div>
                ) : (
                  grouped.map(({ group, items }) => (
                    <div key={group} className="app-command-group">
                      <p className="app-command-group-title">
                        {group} <span>{items.length}</span>
                      </p>
                      {items.map(({ item, index }) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            id={`global-search-${index}`}
                            type="button"
                            className={clsx('app-command-item', index === active && 'is-active')}
                            onMouseEnter={() => setActive(index)}
                            onClick={() => go(item)}
                          >
                            <span className="app-command-item-icon">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="app-command-item-copy">
                              <strong>{item.title}</strong>
                              {item.subtitle && <small>{item.subtitle}</small>}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              <div className="app-command-foot">
                <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
                <span><kbd>Enter</kbd> abrir</span>
                <span><kbd>Esc</kbd> cerrar</span>
                <span className="app-command-count">
                  {loading ? 'Cargando catálogo…' : `${results.length} resultados`}
                </span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
