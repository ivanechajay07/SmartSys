import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  Eye,
  Monitor,
  RefreshCw,
  ScrollText,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Tablet,
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
  DetailRow,
  EmptyState,
  ErrorAlert,
  Field,
  Input,
  Modal,
  Spinner,
} from '@/components/ui';
import { ModuleChips, ModuleHero, ModuleKpi, ModulePagination, usePagination } from '@/components/module';
import '@/styles/modules.css';

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

  const pagination = usePagination(filtered, 10, `${search}|${resultFilter}|${desde}|${hasta}`);

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

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
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
              <div className="mod-search">
                <Search className="mod-search-icon h-4 w-4" />
                <Input
                  className="pl-9"
                  placeholder="Buscar usuario, actividad, equipo o IP"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Field label="Desde" className="w-36">
                <Input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
              </Field>
              <Field label="Hasta" className="w-36">
                <Input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
              </Field>
            </div>
          </div>

          <ModuleChips
            filters={RESULT_FILTERS}
            value={resultFilter}
            onChange={setResultFilter}
            counts={counts}
            ariaLabel="Filtrar por resultado"
          />
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
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Actividad</th>
                  <th>Equipo / sesión</th>
                  <th>IP</th>
                  <th>Resultado</th>
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
                      <Button variant="ghost" size="sm" onClick={() => setSelected(item)}>
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

      <Modal
        open={Boolean(selected)}
        title="Detalle de auditoría"
        subtitle={selected ? selected.accion : undefined}
        onClose={() => setSelected(null)}
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge tone={selected.exito ? 'green' : 'red'}>
                {selected.exito ? 'Operación exitosa' : 'Operación fallida'}
              </Badge>
              <span className="text-xs text-slate-400">{formatDateTime(selected.fecha)}</span>
            </div>

            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4 py-2">
              <DetailRow label="Usuario">
                {selected.usuarioNombre ?? 'No autenticado'}
                {selected.usuarioEmail ? ` · ${selected.usuarioEmail}` : ''}
              </DetailRow>
              <DetailRow label="Rol">{selected.rol ?? '-'}</DetailRow>
              <DetailRow label="Actividad">{selected.accion}</DetailRow>
              <DetailRow label="Módulo">{selected.modulo ?? '-'}</DetailRow>
              <DetailRow label="Dispositivo">{selected.dispositivo ?? '-'}</DetailRow>
              <DetailRow label="Equipo">{selected.equipo ?? '-'}</DetailRow>
              <DetailRow label="Navegador">{selected.navegador ?? '-'}</DetailRow>
              <DetailRow label="Sistema operativo">{selected.sistemaOperativo ?? '-'}</DetailRow>
              <DetailRow label="IP">{selected.ip ?? '-'}</DetailRow>
              <DetailRow label="Resultado">{selected.exito ? 'Exitoso' : 'Fallido'}</DetailRow>
              <DetailRow label="Detalle">{selected.detalle ?? '-'}</DetailRow>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}
