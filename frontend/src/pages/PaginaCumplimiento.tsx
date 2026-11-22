import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  AlertTriangle,
  ClipboardCheck,
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatNumber, formatQuantity } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import type { TdrCompliance } from '@/types';
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
  ModuleProgress,
  ModuleViewToggle,
  useResponsiveView,
  usePagination,
} from '@/components/module';
import { SortableTh, useTableSort } from '@/components/sortable';
import '@/styles/modules.css';

function complianceTone(value: number): 'green' | 'amber' | 'red' {
  if (value >= 90) return 'green';
  if (value >= 70) return 'amber';
  return 'red';
}

const COMPLIANCE_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'RISK', label: 'En riesgo' },
  { value: 'CLAUSE', label: 'Con cláusulas incumplidas' },
];

export default function PaginaCumplimiento() {
  const navigate = useNavigate();
  const summary = useApiQuery<TdrCompliance[]>(() => api.get('/compliance/summary').then((r) => r.data));
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useResponsiveView('grid');
  const [selected, setSelected] = useState<TdrCompliance | null>(null);

  const data = useMemo(() => summary.data ?? [], [summary.data]);
  const average = data.length
    ? data.reduce((sum, item) => sum + Number(item.cumplimientoPct), 0) / data.length
    : 0;
  const atRisk = data.filter((item) => Number(item.cumplimientoPct) < 90).length;
  const clauses = data.reduce(
    (sum, item) => sum + item.clausulas.filter((clause) => clause.incumplida).length,
    0,
  );
  const withClauses = data.filter((item) =>
    item.clausulas.some((clause) => clause.incumplida),
  ).length;

  const counts = { '': data.length, RISK: atRisk, CLAUSE: withClauses } as Record<string, number>;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((item) => {
      const matchesFilter =
        !filter ||
        (filter === 'RISK' && Number(item.cumplimientoPct) < 90) ||
        (filter === 'CLAUSE' && item.clausulas.some((clause) => clause.incumplida));
      const matchesTerm =
        !term ||
        item.contrato.toLowerCase().includes(term) ||
        item.entidad.toLowerCase().includes(term);
      return matchesFilter && matchesTerm;
    });
  }, [data, filter, search]);

  const sorting = useTableSort(filtered, {
    contrato: (item) => item.contrato,
    entidad: (item) => item.entidad,
    comprometido: (item) => Number(item.comprometido),
    entregado: (item) => Number(item.entregado),
    cumplimiento: (item) => Number(item.cumplimientoPct),
    puntualidad: (item) => Number(item.puntualidadPct),
    incidencias: (item) => Number(item.incidencias),
  });
  const pagination = usePagination(
    sorting.rows,
    6,
    `${filter}|${search}|${view}|${sorting.sort?.key ?? ''}|${sorting.sort?.dir ?? ''}`,
  );

  return (
    <div className="mod-page">
      <ModuleHero
        eyebrow="Indicadores contractuales"
        title="Cumplimiento de TDR"
        description="Cumplimiento, puntualidad y cláusulas contractuales evaluadas a partir de programaciones, recepciones e incidencias registradas."
        actions={
          <button
            type="button"
            onClick={summary.reload}
            className="mod-hero-button-soft"
            disabled={summary.loading}
          >
            <RefreshCw className={clsx('h-3.5 w-3.5', summary.loading && 'animate-spin')} /> Actualizar
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <ModuleKpi
          label="TDR evaluados"
          value={formatNumber(data.length)}
          hint="Contratos con seguimiento"
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="brand"
          active={filter === ''}
          onClick={() => setFilter('')}
          delay="mod-reveal-1"
        />
        <ModuleKpi
          label="Cumplimiento promedio"
          value={`${formatNumber(average, 2)}%`}
          hint="Promedio ponderado"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="sky"
          delay="mod-reveal-2"
        />
        <ModuleKpi
          label="TDR en riesgo"
          value={formatNumber(atRisk)}
          hint="Cumplimiento menor a 90%"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="rose"
          active={filter === 'RISK'}
          onClick={() => setFilter(filter === 'RISK' ? '' : 'RISK')}
          delay="mod-reveal-3"
        />
        <ModuleKpi
          label="Cláusulas incumplidas"
          value={formatNumber(clauses)}
          hint="Requieren revisión manual"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="amber"
          active={filter === 'CLAUSE'}
          onClick={() => setFilter(filter === 'CLAUSE' ? '' : 'CLAUSE')}
          delay="mod-reveal-4"
        />
      </div>

      <Card className="mod-reveal mod-reveal-2">
        <div className="mod-toolbar">
          <div className="mod-toolbar-top">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Evaluación por TDR ({filtered.length})
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Calculado desde programaciones, recepciones e incidencias del contrato.
              </p>
            </div>

            <div className="mod-toolbar-controls">
              <div className="mod-search">
                <Search className="mod-search-icon h-4 w-4" />
                <Input
                  className="pl-9"
                  placeholder="Buscar contrato o entidad"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <ModuleViewToggle value={view} onChange={setView} />
            </div>
          </div>

          <ModuleChips
            filters={COMPLIANCE_FILTERS}
            value={filter}
            onChange={setFilter}
            counts={counts}
            ariaLabel="Filtrar cumplimiento"
          />
        </div>

        {summary.error && (
          <div className="p-5">
            <ErrorAlert message={summary.error} onRetry={summary.reload} />
          </div>
        )}

        {summary.loading && !summary.data ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Sin TDR evaluados"
            description="Registre contratos, TDR y programaciones para calcular el cumplimiento."
          />
        ) : view === 'grid' ? (
          <div className="mod-grid">
            {pagination.pageItems.map((item) => {
              const value = Number(item.cumplimientoPct);
              return (
                <button key={item.tdrId} type="button" className="mod-card" onClick={() => setSelected(item)}>
                  <div>
                    <div className="mod-card-top">
                      <span className="mod-code">{item.contrato}</span>
                      <Badge tone={complianceTone(value)}>{formatNumber(value, 2)}%</Badge>
                    </div>
                    <p className="mod-card-title">{item.entidad}</p>
                    <p className="mod-card-sub">
                      {item.programaciones} programaciones · {item.recepciones} recepciones
                    </p>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>Cumplimiento</span>
                      <span>{formatNumber(value, 2)}%</span>
                    </div>
                    <ModuleProgress value={value} />
                    <div className="mod-card-metrics mt-3">
                      <div>
                        <span>Comprometido</span>
                        <strong>{formatQuantity(item.comprometido)}</strong>
                      </div>
                      <div>
                        <span>Entregado</span>
                        <strong>{formatQuantity(item.entregado)}</strong>
                      </div>
                      <div>
                        <span>Puntualidad</span>
                        <strong>{formatNumber(item.puntualidadPct, 2)}%</strong>
                      </div>
                      <div>
                        <span>Incidencias</span>
                        <strong className={item.incidencias > 0 ? 'text-rose-600' : undefined}>
                          {formatNumber(item.incidencias)}
                        </strong>
                      </div>
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
                  <SortableTh label="Contrato" column="contrato" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Entidad" column="entidad" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Comprometido" column="comprometido" className="text-right" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Entregado" column="entregado" className="text-right" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Cumplimiento" column="cumplimiento" className="text-right" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Puntualidad" column="puntualidad" className="text-right" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <SortableTh label="Incidencias" column="incidencias" className="text-right" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
                  <th />
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((item) => (
                  <tr key={item.tdrId} className="mod-row" onClick={() => setSelected(item)}>
                    <td className="font-semibold text-slate-800">{item.contrato}</td>
                    <td className="text-xs text-slate-600">{item.entidad}</td>
                    <td className="text-right">{formatQuantity(item.comprometido)}</td>
                    <td className="text-right">{formatQuantity(item.entregado)}</td>
                    <td className="text-right">
                      <Badge tone={complianceTone(Number(item.cumplimientoPct))}>
                        {formatNumber(item.cumplimientoPct, 2)}%
                      </Badge>
                    </td>
                    <td className="text-right">{formatNumber(item.puntualidadPct, 2)}%</td>
                    <td className={clsx('text-right', item.incidencias > 0 && 'font-semibold text-rose-600')}>
                      {formatNumber(item.incidencias)}
                    </td>
                    <td className="text-right" onClick={(event) => event.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => setSelected(item)}>
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

      <Modal
        open={Boolean(selected)}
        title={selected ? `Cumplimiento ${selected.contrato}` : 'Cumplimiento'}
        onClose={() => setSelected(null)}
        size="xl"
        footer={
          selected && (
            <>
              <Button variant="secondary" onClick={() => navigate('/reportes')}>
                Exportar reporte
              </Button>
              <Button onClick={() => setSelected(null)}>Cerrar</Button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">{selected.entidad}</p>
                <p className="text-xs text-slate-500">
                  {selected.programaciones} programaciones · {selected.cumplidas} cumplidas · {selected.vencidas} vencidas
                </p>
              </div>
              <Badge tone={complianceTone(Number(selected.cumplimientoPct))}>
                {formatNumber(selected.cumplimientoPct, 2)}%
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ['Comprometido', formatQuantity(selected.comprometido)],
                ['Programado', formatQuantity(selected.programado)],
                ['Entregado', formatQuantity(selected.entregado)],
                ['Recibido', formatQuantity(selected.recibido)],
                ['Cumplimiento', `${formatNumber(selected.cumplimientoPct, 2)}%`],
                ['Puntualidad', `${formatNumber(selected.puntualidadPct, 2)}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Detalle por ítem</h3>
                <span className="text-xs text-slate-400">{selected.items.length} ítems del TDR</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="table table-pro">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className="text-right">Comprometido</th>
                      <th className="text-right">Programado</th>
                      <th className="text-right">Entregado</th>
                      <th className="text-right">Cumplimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((item) => (
                      <tr key={item.tdrItemId}>
                        <td className="font-medium text-slate-700">{item.producto}</td>
                        <td className="text-right">{formatQuantity(item.comprometido)}</td>
                        <td className="text-right">{formatQuantity(item.programado)}</td>
                        <td className="text-right">{formatQuantity(item.entregado)}</td>
                        <td className="text-right">
                          <Badge tone={complianceTone(Number(item.cumplimientoPct))}>
                            {formatNumber(item.cumplimientoPct, 2)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Cláusulas contractuales</h3>
              {selected.clausulas.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  El contrato no tiene cláusulas configuradas.
                </p>
              ) : (
                <div className="space-y-2">
                  {selected.clausulas.map((clause) => (
                    <div
                      key={clause.id}
                      className={clsx(
                        'rounded-lg border px-4 py-3',
                        clause.incumplida ? 'border-rose-200 bg-rose-50/60' : 'border-emerald-200 bg-emerald-50/50',
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {clause.codigo} · {clause.descripcion}
                        </p>
                        <Badge tone={clause.incumplida ? 'red' : 'green'}>
                          {clause.incumplida ? 'Incumplida' : 'Cumplida'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Tipo {clause.tipo}
                        {clause.umbralPorcentaje != null && ` · umbral ${formatNumber(clause.umbralPorcentaje, 2)}%`}
                        {' · '}acción: {clause.accionSugerida}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">{clause.resultado}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mod-callout">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>
                Las cláusulas contractuales generan alertas de revisión manual. El sistema no aplica
                penalidades automáticas; la decisión final corresponde a la jefatura responsable.
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
