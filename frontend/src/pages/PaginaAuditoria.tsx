import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  Activity,
  ChevronRight,
  Clock3,
  Eye,
  Globe2,
  Monitor,
  RefreshCw,
  ScrollText,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  UserRound,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime, firstDayOfMonthISO, formatNumber, todayISO } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import type { Auditoria } from '@/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorAlert,
  Field,
  Input,
  Modal,
  Spinner,
} from '@/components/ui';
import { UserAvatar } from '@/components/UserAvatar';
import { DatePicker } from '@/components/DatePicker';
import { FilterDrawer } from '@/components/FilterDrawer';
import { SortableTh, useTableSort } from '@/components/sortable';
import { ModuleChips, ModuleHero, ModuleKpi, ModulePagination, ModuleViewToggle, usePagination, useResponsiveView } from '@/components/module';
import '@/styles/modules.css';
import '@/styles/audit.css';

const RESULT_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'OK', label: 'Exitosos' },
  { value: 'FAIL', label: 'Fallidos' },
];

function DeviceIcon({ type, className }: { type?: string; className?: string }) {
  if (type === 'Móvil') return <Smartphone className={className} />;
  if (type === 'Tablet') return <Tablet className={className} />;
  return <Monitor className={className} />;
}

function accionLegible(accion?: string): string {
  if (!accion) return 'Operación administrativa';
  if (accion.startsWith('Controlador') || accion.includes('Controller')) {
    return 'Operación administrativa';
  }
  return accion;
}

export default function PaginaAuditoria() {
  const [desde, setDesde] = useState(firstDayOfMonthISO());
  const [hasta, setHasta] = useState(todayISO());
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [selected, setSelected] = useState<Auditoria | null>(null);
  const [view, setView] = useResponsiveView('table');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const audit = useApiQuery<Auditoria[]>(
    () =>
      api.get('/audit', { params: { desde: desde || undefined, hasta: hasta || undefined } }).then((r) => r.data),
    [desde, hasta],
  );

  const data = useMemo(() => audit.data ?? [], [audit.data]);
  const failed = data.filter((item) => !item.exito).length;
  const succeeded = data.length - failed;
  const uniqueUsers = new Set(data.map((item) => item.usuarioEmail).filter(Boolean)).size;

  const counts = { '': data.length, OK: succeeded, FAIL: failed } as Record<string, number>;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((item) => {
      const matchesResult =
        !resultFilter || (resultFilter === 'OK' ? item.exito : !item.exito);
      const matchesTerm =
        !term ||
        (item.usuarioEmail ?? '').toLowerCase().includes(term) ||
        (item.usuarioNombre ?? '').toLowerCase().includes(term) ||
        (item.accion ?? '').toLowerCase().includes(term) ||
        (item.modulo ?? '').toLowerCase().includes(term) ||
        (item.equipo ?? '').toLowerCase().includes(term) ||
        (item.dispositivo ?? '').toLowerCase().includes(term) ||
        (item.ip ?? '').toLowerCase().includes(term);
      return matchesResult && matchesTerm;
    });
  }, [data, search, resultFilter]);

  const sorting = useTableSort(filtered, {
    fecha: (item) => new Date(item.fecha).getTime(),
    usuario: (item) => item.usuarioNombre ?? item.usuarioEmail ?? '',
    rol: (item) => item.rol ?? '',
    actividad: (item) => accionLegible(item.accion),
    equipo: (item) => item.equipo ?? item.dispositivo ?? '',
    ip: (item) => item.ip ?? '',
    resultado: (item) => Number(item.exito),
  });
  const pagination = usePagination(
    sorting.rows,
    10,
    `${search}|${resultFilter}|${desde}|${hasta}|${view}|${sorting.sort?.key ?? ''}|${sorting.sort?.dir ?? ''}`,
  );

  return (
    <div className="mod-page">
      <ModuleHero
        eyebrow="Trazabilidad y seguridad"
        title="Auditoría del sistema"
        description="Registro de las operaciones realizadas: usuario, actividad, equipo, navegador, IP y resultado."
        actions={
          <button
            type="button"
            onClick={audit.reload}
            className="mod-hero-button-soft"
            disabled={audit.loading}
          >
            <RefreshCw className={clsx('h-3.5 w-3.5', audit.loading && 'animate-spin')} /> Actualizar
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <ModuleKpi
          label="Registros"
          value={formatNumber(data.length)}
          hint="Operaciones auditadas"
          icon={<ScrollText className="h-5 w-5" />}
          tone="brand"
          active={!resultFilter}
          onClick={() => setResultFilter('')}
          delay="mod-reveal-1"
        />
        <ModuleKpi
          label="Exitosos"
          value={formatNumber(succeeded)}
          hint="Operaciones completadas"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="sky"
          active={resultFilter === 'OK'}
          onClick={() => setResultFilter(resultFilter === 'OK' ? '' : 'OK')}
          delay="mod-reveal-2"
        />
        <ModuleKpi
          label="Fallidos"
          value={formatNumber(failed)}
          hint="Rechazos o errores"
          icon={<ShieldAlert className="h-5 w-5" />}
          tone="rose"
          active={resultFilter === 'FAIL'}
          onClick={() => setResultFilter(resultFilter === 'FAIL' ? '' : 'FAIL')}
          delay="mod-reveal-3"
        />
        <ModuleKpi
          label="Usuarios únicos"
          value={formatNumber(uniqueUsers)}
          hint="Con actividad en el rango"
          icon={<Users className="h-5 w-5" />}
          tone="indigo"
          delay="mod-reveal-4"
        />
      </div>

      <Card className="mod-reveal mod-reveal-2">
        <div className="mod-toolbar">
          <div className="mod-toolbar-top">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Registro de auditoría ({filtered.length})
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Abre un registro para revisar la actividad, el equipo y la sesión del usuario.
              </p>
            </div>

            <div className="mod-toolbar-controls">
              <button
                type="button"
                className="btn btn-secondary btn-sm sm:hidden"
                onClick={() => setFiltersOpen(true)}
                aria-label="Abrir filtros de auditoría"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros
                {resultFilter && <span className="rounded-full bg-brand-700 px-1.5 text-[10px] text-white">1</span>}
              </button>
              <div className="mod-search">
                <Search className="mod-search-icon h-4 w-4" />
                <Input
                  className="pl-9"
                  placeholder="Buscar usuario, actividad, equipo o IP"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Field label="Desde" className="hidden w-36 sm:block">
                <DatePicker value={desde} onChange={setDesde} />
              </Field>
              <Field label="Hasta" className="hidden w-36 sm:block">
                <DatePicker value={hasta} onChange={setHasta} />
              </Field>
              <ModuleViewToggle value={view} onChange={setView} />
            </div>
          </div>

          <div className="hidden sm:block">
            <ModuleChips
              filters={RESULT_FILTERS}
              value={resultFilter}
              onChange={setResultFilter}
              counts={counts}
              ariaLabel="Filtrar por resultado"
            />
          </div>
        </div>

        {audit.error && (
          <div className="p-5">
            <ErrorAlert message={audit.error} onRetry={audit.reload} />
          </div>
        )}

        {audit.loading && !audit.data ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Sin registros"
            description="No hay operaciones auditadas que coincidan con el rango y los filtros."
          />
        ) : view === 'grid' ? (
          <div className="mod-grid audit-grid">
            {pagination.pageItems.map((item) => (
              <article
                key={item.id}
                className={clsx('mod-card audit-card', !item.exito && 'is-fail')}
                onClick={() => setSelected(item)}
              >
                <header className="audit-card-head">
                  <Badge tone={item.exito ? 'green' : 'red'}>
                    {item.exito ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                    {item.exito ? 'Exitoso' : 'Fallido'}
                  </Badge>
                  <span className="audit-card-date">{formatDateTime(item.fecha)}</span>
                </header>
                <div className="audit-card-user">
                  <UserAvatar name={item.usuarioNombre ?? item.usuarioEmail ?? undefined} size={36} />
                  <div>
                    <p>{item.usuarioNombre ?? item.usuarioEmail ?? 'No autenticado'}</p>
                    <small>{item.rol ?? 'Sin rol'} · {item.usuarioEmail ?? 'Sin correo'}</small>
                  </div>
                </div>
                <div className="audit-card-activity">
                  <strong>{accionLegible(item.accion)}</strong>
                  <span>{item.modulo ?? 'Módulo no registrado'}</span>
                </div>
                <dl className="audit-card-meta">
                  <div>
                    <dt>Equipo</dt>
                    <dd>{item.equipo ?? item.dispositivo ?? '-'}</dd>
                  </div>
                  <div>
                    <dt>IP</dt>
                    <dd>{item.ip ?? '-'}</dd>
                  </div>
                </dl>
                <footer>
                  <span className="audit-card-device">
                    <DeviceIcon type={item.dispositivo} className="h-3.5 w-3.5" />
                    {[item.dispositivo, item.navegador].filter(Boolean).join(' · ') || 'Sesión web'}
                  </span>
                  <span className="audit-card-link">Ver detalle <ChevronRight className="h-3.5 w-3.5" /></span>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-pro">
              <thead>
                <tr>
                  <SortableTh label="Fecha" column="fecha" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Usuario" column="usuario" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Rol" column="rol" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Actividad" column="actividad" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Equipo / sesión" column="equipo" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="IP" column="ip" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Resultado" column="resultado" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <th />
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((item) => (
                  <tr key={item.id} className="mod-row" onClick={() => setSelected(item)}>
                    <td className="whitespace-nowrap text-xs">{formatDateTime(item.fecha)}</td>
                    <td>
                      <p className="text-xs font-semibold text-slate-800">
                        {item.usuarioNombre ?? item.usuarioEmail ?? 'No autenticado'}
                      </p>
                      {item.usuarioNombre && item.usuarioEmail && (
                        <p className="text-[11px] text-slate-400">{item.usuarioEmail}</p>
                      )}
                    </td>
                    <td className="text-xs">{item.rol ?? '-'}</td>
                    <td>
                      <p className="text-xs font-medium text-slate-700">{accionLegible(item.accion)}</p>
                      <p className="text-[11px] text-slate-400">{item.modulo ?? '-'}</p>
                    </td>
                    <td>
                      <div className="flex items-start gap-2">
                        <DeviceIcon
                          type={item.dispositivo}
                          className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                        />
                        <div>
                          <p className="text-xs font-medium text-slate-700">
                            {item.equipo ?? item.dispositivo ?? '-'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {[item.dispositivo, item.navegador, item.sistemaOperativo]
                              .filter(Boolean)
                              .join(' · ') || '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap font-mono text-xs text-slate-600">
                      {item.ip ?? '-'}
                    </td>
                    <td>
                      <Badge tone={item.exito ? 'green' : 'red'}>
                        {item.exito ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                        {item.exito ? 'Exitoso' : 'Fallido'}
                      </Badge>
                    </td>
                    <td className="text-right" onClick={(event) => event.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Ver detalle"
                        aria-label={`Ver detalle de ${item.accion}`}
                        onClick={() => setSelected(item)}
                      >
                        <Eye className="h-4 w-4" />
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

      <FilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={() => setFiltersOpen(false)}
        onClear={() => {
          setSearch('');
          setResultFilter('');
          setDesde(firstDayOfMonthISO());
          setHasta(todayISO());
        }}
        activeCount={resultFilter ? 1 : 0}
        title="Filtros de auditoría"
      >
        <Field label="Buscar">
          <Input
            placeholder="Usuario, actividad, equipo o IP"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Desde">
            <DatePicker value={desde} onChange={setDesde} />
          </Field>
          <Field label="Hasta">
            <DatePicker value={hasta} onChange={setHasta} />
          </Field>
        </div>
        <div>
          <p className="label">Resultado</p>
          <ModuleChips
            filters={RESULT_FILTERS}
            value={resultFilter}
            onChange={setResultFilter}
            counts={counts}
            ariaLabel="Filtrar por resultado"
          />
        </div>
      </FilterDrawer>

      <Modal
        open={Boolean(selected)}
        title="Detalle de auditoría"
        subtitle={selected ? selected.accion : undefined}
        icon={selected?.exito ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
        tone={selected?.exito ? 'brand' : 'rose'}
        onClose={() => setSelected(null)}
        size="lg"
      >
        {selected && (
          <div className="audit-detail">
            <div className="audit-detail-summary">
              <UserAvatar
                name={selected.usuarioNombre ?? selected.usuarioEmail ?? undefined}
                size={46}
                className="audit-detail-avatar"
              />
              <div className="audit-detail-identity">
                <p>{selected.usuarioNombre ?? 'No autenticado'}</p>
                <span>{selected.usuarioEmail ?? 'Sin correo registrado'}</span>
              </div>
              <div className="audit-detail-status">
                <Badge tone={selected.exito ? 'green' : 'red'}>
                  {selected.exito ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                  {selected.exito ? 'Exitoso' : 'Fallido'}
                </Badge>
                <span><Clock3 className="h-3 w-3" /> {formatDateTime(selected.fecha)}</span>
              </div>
            </div>

            <div className="audit-detail-grid">
              <section className="audit-detail-card">
                <header className="audit-detail-card-head">
                  <span className="audit-detail-card-icon"><UserRound className="h-4 w-4" /></span>
                  <div>
                    <h3>Usuario y rol</h3>
                    <p>Identidad que ejecutó la operación</p>
                  </div>
                </header>
                <dl className="audit-detail-list">
                  <div><dt>Nombre</dt><dd>{selected.usuarioNombre ?? '-'}</dd></div>
                  <div><dt>Correo</dt><dd>{selected.usuarioEmail ?? '-'}</dd></div>
                  <div><dt>Rol</dt><dd>{selected.rol ?? '-'}</dd></div>
                </dl>
              </section>

              <section className="audit-detail-card">
                <header className="audit-detail-card-head">
                  <span className="audit-detail-card-icon"><Activity className="h-4 w-4" /></span>
                  <div>
                    <h3>Actividad</h3>
                    <p>Acción registrada en el sistema</p>
                  </div>
                </header>
                <dl className="audit-detail-list">
                  <div><dt>Actividad</dt><dd>{selected.accion}</dd></div>
                  <div><dt>Módulo</dt><dd>{selected.modulo ?? '-'}</dd></div>
                  <div><dt>Fecha</dt><dd>{formatDateTime(selected.fecha)}</dd></div>
                </dl>
              </section>

              <section className="audit-detail-card audit-detail-card-wide">
                <header className="audit-detail-card-head">
                  <span className="audit-detail-card-icon"><Monitor className="h-4 w-4" /></span>
                  <div>
                    <h3>Sesión y dispositivo</h3>
                    <p>Contexto técnico de la operación</p>
                  </div>
                </header>
                <dl className="audit-detail-list audit-detail-list-split">
                  <div><dt>Dispositivo</dt><dd>{selected.dispositivo ?? '-'}</dd></div>
                  <div><dt>Equipo</dt><dd>{selected.equipo ?? '-'}</dd></div>
                  <div><dt>Navegador</dt><dd>{selected.navegador ?? '-'}</dd></div>
                  <div><dt>Sistema operativo</dt><dd>{selected.sistemaOperativo ?? '-'}</dd></div>
                  <div><dt>IP</dt><dd className="font-mono">{selected.ip ?? '-'}</dd></div>
                </dl>
              </section>

              <section className="audit-detail-card audit-detail-card-wide">
                <header className="audit-detail-card-head">
                  <span className="audit-detail-card-icon"><ScrollText className="h-4 w-4" /></span>
                  <div>
                    <h3>Detalle</h3>
                    <p>Información adicional registrada por el sistema</p>
                  </div>
                </header>
                <p className="audit-detail-note">{selected.detalle ?? 'Sin detalle adicional.'}</p>
              </section>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
