import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  CalendarRange,
  CheckCircle2,
  Download,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  History,
  RefreshCw,
  Search,
  Table2,
} from 'lucide-react';
import { api, apiErrorMessage, downloadReport } from '@/lib/api';
import { toastSuccess } from '@/lib/toasts';
import { formatNumber, firstDayOfMonthISO, todayISO } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import type { ReportDefinition, ReportHistorial } from '@/types';
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
import { ModuleChips, ModuleHero, ModuleKpi } from '@/components/module';
import { FormHero, FormSection, FormStats, FormTag } from '@/components/FormKit';
import '@/styles/modules.css';

interface ReportData {
  key: string;
  titulo: string;
  headers: string[];
  rows: string[][];
}

const RANGE_FILTERS = [
  { value: 'MONTH', label: 'Mes actual' },
  { value: '30D', label: 'Últimos 30 días' },
  { value: 'YEAR', label: 'Año en curso' },
  { value: 'CUSTOM', label: 'Personalizado' },
];

const CARD_TONES = ['brand', 'sky', 'indigo', 'amber'] as const;

const EXPORT_FORMATS = [
  {
    key: 'xlsx' as const,
    label: 'Excel',
    extension: 'XLSX',
    description: 'Tabla con estilos, filtros, panel congelado y hoja de resumen.',
    icon: FileSpreadsheet,
    tone: 'brand',
  },
  {
    key: 'pdf' as const,
    label: 'PDF',
    extension: 'PDF',
    description: 'Documento corporativo paginado con cabecera y pie de página.',
    icon: FileText,
    tone: 'rose',
  },
  {
    key: 'csv' as const,
    label: 'CSV',
    extension: 'CSV',
    description: 'Datos portables con cabecera corporativa y totales.',
    icon: Table2,
    tone: 'sky',
  },
];

function daysBetween(desde: string, hasta: string): number {
  const parse = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1).getTime();
  };
  if (!desde || !hasta) return 0;
  const diff = Math.round((parse(hasta) - parse(desde)) / 86_400_000) + 1;
  return diff > 0 ? diff : 0;
}

export default function PaginaReportes() {
  const can = useAuth((state) => state.can);
  const canExport = can('REPORTES', 'ver');

  const catalog = useApiQuery<ReportDefinition[]>(() => api.get('/reports').then((r) => r.data));
  const historyQuery = useApiQuery<ReportHistorial[]>(() => api.get('/reports/history').then((r) => r.data));
  const [search, setSearch] = useState('');
  const [desde, setDesde] = useState(firstDayOfMonthISO());
  const [hasta, setHasta] = useState(todayISO());
  const [range, setRange] = useState('MONTH');
  const [preview, setPreview] = useState<ReportData | null>(null);
  const [previewSearch, setPreviewSearch] = useState('');
  const [exportTarget, setExportTarget] = useState<ReportDefinition | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf'>('xlsx');
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const all = useMemo(() => catalog.data ?? [], [catalog.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter(
      (item) =>
        !term ||
        item.nombre.toLowerCase().includes(term) ||
        item.descripcion.toLowerCase().includes(term) ||
        item.key.toLowerCase().includes(term),
    );
  }, [all, search]);

  const days = daysBetween(desde, hasta);

  const previewRows = useMemo(() => {
    if (!preview) return [];
    const term = previewSearch.trim().toLowerCase();
    if (!term) return preview.rows;
    return preview.rows.filter((row) =>
      row.some((cell) => (cell ?? '').toLowerCase().includes(term)),
    );
  }, [preview, previewSearch]);

  const applyRange = (value: string) => {
    setRange(value);
    if (value === 'MONTH') {
      setDesde(firstDayOfMonthISO());
      setHasta(todayISO());
    } else if (value === '30D') {
      setDesde(todayISO(-29));
      setHasta(todayISO());
    } else if (value === 'YEAR') {
      setDesde(`${new Date().getFullYear()}-01-01`);
      setHasta(todayISO());
    }
  };

  const openPreview = async (key: string) => {
    setBusyKey(key);
    setError(null);
    setPreviewSearch('');
    try {
      const { data } = await api.get<ReportData>(`/reports/${key}`, { params: { desde, hasta } });
      setPreview(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  };

  const openExport = (report: ReportDefinition) => {
    setExportTarget(report);
    setExportFormat('xlsx');
    setError(null);
  };

  const exportReport = async (key: string, format: 'csv' | 'xlsx' | 'pdf') => {
    setBusyKey(key);
    setError(null);
    try {
      await downloadReport(key, format, desde, hasta);
      historyQuery.reload();
      toastSuccess(`Reporte exportado en ${format.toUpperCase()}.`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  };

  const runExport = async () => {
    if (!exportTarget) return;
    setExporting(true);
    setError(null);
    try {
      await downloadReport(exportTarget.key, exportFormat, desde, hasta);
      historyQuery.reload();
      toastSuccess(`${exportTarget.nombre} exportado en ${exportFormat.toUpperCase()}.`);
      setExportSuccess(`${exportTarget.nombre} exportado en ${exportFormat.toUpperCase()}.`);
      setExportTarget(null);
      window.setTimeout(() => setExportSuccess(null), 4500);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mod-page">
      <ModuleHero
        eyebrow="Analítica y exportación"
        title="Reportes operativos"
        description="Catálogo de reportes de inventario, despachos, cumplimiento y auditoría. Previsualiza en pantalla y exporta a CSV, Excel o PDF."
        actions={
          <button
            type="button"
            onClick={catalog.reload}
            className="mod-hero-button-soft"
            disabled={catalog.loading}
          >
            <RefreshCw className={clsx('h-3.5 w-3.5', catalog.loading && 'animate-spin')} /> Actualizar
          </button>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <ModuleKpi
          label="Reportes disponibles"
          value={formatNumber(all.length)}
          hint="Catálogo del sistema"
          icon={<FileBarChart className="h-5 w-5" />}
          tone="brand"
          active={!search}
          onClick={() => setSearch('')}
          delay="mod-reveal-1"
        />
        <ModuleKpi
          label="Resultados"
          value={formatNumber(filtered.length)}
          hint="Coinciden con la búsqueda"
          icon={<Search className="h-5 w-5" />}
          tone="sky"
          delay="mod-reveal-2"
        />
        <ModuleKpi
          label="Días del periodo"
          value={formatNumber(days)}
          hint="Rango seleccionado"
          icon={<CalendarRange className="h-5 w-5" />}
          tone="amber"
          delay="mod-reveal-3"
        />
        <ModuleKpi
          label="Formatos de salida"
          value="3"
          hint="CSV · XLSX · PDF"
          icon={<Download className="h-5 w-5" />}
          tone="indigo"
          delay="mod-reveal-4"
        />
      </div>

      {exportSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {exportSuccess}
        </div>
      )}

      <Card className="mod-reveal mod-reveal-2">
        <div className="mod-toolbar">
          <div className="mod-toolbar-top">
            <div>
              <h3 className="text-base font-bold text-slate-800">Configurar consulta</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                El periodo aplica a la vista previa y a todas las exportaciones.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold">{desde || 'inicio'}</span>
              <span>→</span>
              <span className="font-semibold">{hasta || 'hoy'}</span>
            </div>
          </div>

          <ModuleChips
            filters={RANGE_FILTERS}
            value={range}
            onChange={applyRange}
            ariaLabel="Rango de fechas"
          />

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Field label="Buscar reporte">
              <div className="relative">
                <Search className="mod-search-icon h-4 w-4" />
                <Input
                  className="pl-9"
                  placeholder="Inventario, despachos, cumplimiento..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </Field>
            <Field label="Desde">
              <Input
                type="date"
                value={desde}
                onChange={(event) => {
                  setDesde(event.target.value);
                  setRange('CUSTOM');
                }}
              />
            </Field>
            <Field label="Hasta">
              <Input
                type="date"
                value={hasta}
                onChange={(event) => {
                  setHasta(event.target.value);
                  setRange('CUSTOM');
                }}
              />
            </Field>
          </div>
        </div>

        {error && (
          <div className="p-5">
            <ErrorAlert message={error} />
          </div>
        )}
        {catalog.error && (
          <div className="p-5">
            <ErrorAlert message={catalog.error} onRetry={catalog.reload} />
          </div>
        )}
      </Card>

      {catalog.loading && !catalog.data ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState title="Sin reportes" description="Ningún reporte coincide con la búsqueda actual." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((report, index) => {
            const tone = CARD_TONES[index % CARD_TONES.length];
            return (
              <article key={report.key} className="mod-card mod-reveal">
                <div>
                  <div className="mod-card-top">
                    <span className={clsx('mod-kpi-icon', `mod-kpi-tone-${tone}`)}>
                      <FileBarChart className="h-4 w-4" />
                    </span>
                    <span className="mod-code">{report.key}</span>
                  </div>
                  <p className="mod-card-title mt-3">{report.nombre}</p>
                  <p className="mod-card-sub">{report.descripcion}</p>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busyKey === report.key}
                      onClick={() => openPreview(report.key)}
                    >
                      <Table2 className="h-3.5 w-3.5" /> Vista previa
                    </button>
                    {canExport && (
                      <button
                        type="button"
                        className="btn btn-soft btn-sm"
                        disabled={busyKey === report.key}
                        onClick={() => openExport(report)}
                      >
                        <Download className="h-3.5 w-3.5" /> Exportar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Card className="mod-reveal">
        <div className="mod-toolbar">
          <div className="mod-toolbar-top">
            <div className="flex items-center gap-2">
              <span className="mod-kpi-icon mod-kpi-tone-indigo">
                <History className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-800">Historial de exportaciones</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Últimos reportes generados y registrados en el sistema.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={historyQuery.reload}
              className="btn btn-ghost btn-sm"
              disabled={historyQuery.loading}
            >
              <RefreshCw className={clsx('h-3.5 w-3.5', historyQuery.loading && 'animate-spin')} /> Actualizar
            </button>
          </div>
        </div>

        {historyQuery.error ? (
          <div className="p-5 pt-0">
            <ErrorAlert message={historyQuery.error} onRetry={historyQuery.reload} />
          </div>
        ) : historyQuery.loading && !historyQuery.data ? (
          <Spinner />
        ) : (historyQuery.data ?? []).length === 0 ? (
          <EmptyState
            title="Sin exportaciones registradas"
            description="Cada exportación a CSV, Excel o PDF se registrará aquí automáticamente."
          />
        ) : (
          <div className="overflow-x-auto px-5 pb-5">
            <table className="table">
              <thead>
                <tr>
                  <th>Reporte</th>
                  <th>Formato</th>
                  <th>Periodo</th>
                  <th>Generado</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {(historyQuery.data ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className="text-xs font-semibold text-slate-700">{item.tipo}</td>
                    <td><Badge tone="brand">{item.formato?.toUpperCase() ?? '-'}</Badge></td>
                    <td className="whitespace-nowrap text-xs text-slate-500">
                      {item.desde || 'Inicio'} → {item.hasta || 'Hoy'}
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{item.generado}</td>
                    <td className="text-xs text-slate-600">{item.usuario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(preview)}
        title="Vista previa del reporte"
        subtitle={preview ? `${formatNumber(preview.rows.length)} registros · ${desde || 'inicio'} a ${hasta || 'hoy'}` : undefined}
        icon={<FileBarChart className="h-4 w-4" />}
        tone="sky"
        onClose={() => setPreview(null)}
        size="xl"
        footer={
          preview && (
            <>
              <Button variant="secondary" onClick={() => exportReport(preview.key, 'csv')}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button variant="secondary" onClick={() => exportReport(preview.key, 'xlsx')}>
                <FileSpreadsheet className="h-4 w-4" /> XLSX
              </Button>
              <Button onClick={() => exportReport(preview.key, 'pdf')}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
            </>
          )
        }
      >
        {preview && (
          <div className="fk-form">
            <FormHero
              tone="sky"
              icon={<FileBarChart className="h-6 w-6" />}
              eyebrow={<><Table2 className="h-3 w-3" /> Vista previa del reporte</>}
              title={preview.titulo}
              subtitle={`Periodo: ${desde || 'inicio'} a ${hasta || 'hoy'}`}
              tags={
                <>
                  <FormTag tone="ok">{formatNumber(preview.rows.length)} registros</FormTag>
                  <FormTag>{preview.headers.length} columnas</FormTag>
                  <FormTag>CSV · XLSX · PDF</FormTag>
                </>
              }
              aside={
                <FormStats
                  items={[
                    { label: 'Registros', value: formatNumber(preview.rows.length) },
                    { label: 'Visibles', value: formatNumber(previewRows.length) },
                    { label: 'Columnas', value: preview.headers.length },
                  ]}
                />
              }
            />

            <FormSection
              icon={<Table2 className="h-4 w-4" />}
              title="Contenido del reporte"
              description="Filtra las filas y revisa la información antes de exportar"
              actions={<Badge tone="brand">{formatNumber(previewRows.length)} {previewRows.length === 1 ? 'visible' : 'visibles'}</Badge>}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="mod-search-icon h-4 w-4" />
                  <Input
                    className="pl-9"
                    placeholder="Filtrar filas del reporte"
                    value={previewSearch}
                    onChange={(event) => setPreviewSearch(event.target.value)}
                  />
                </div>
                <span className="text-xs font-medium text-slate-400">
                  Mostrando {formatNumber(previewRows.length)} de {formatNumber(preview.rows.length)} filas
                </span>
              </div>

              <div className="fk-table-wrap fk-table-scroll">
                <table className="table">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {preview.headers.map((header, index) => (
                        <th key={`${header}-${index}`}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="whitespace-nowrap text-xs">{cell}</td>
                        ))}
                      </tr>
                    ))}
                    {previewRows.length === 0 && (
                      <tr>
                        <td colSpan={preview.headers.length} className="py-8 text-center text-sm text-slate-400">
                          Ninguna fila coincide con el filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </FormSection>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(exportTarget)}
        title="Exportar reporte"
        subtitle={exportTarget ? `${exportTarget.nombre} · ${desde || 'inicio'} a ${hasta || 'hoy'}` : undefined}
        icon={<Download className="h-4 w-4" />}
        onClose={() => setExportTarget(null)}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setExportTarget(null)}>
              Cancelar
            </Button>
            <Button loading={exporting} onClick={runExport}>
              <Download className="h-4 w-4" /> Descargar {exportFormat.toUpperCase()}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="mod-callout">
            <FileBarChart className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              El archivo incluirá la identidad corporativa de <strong>SmartSys · Higiene y Salud S.A.C.</strong>,
              el periodo seleccionado y el total de registros.
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Formato de exportación">
            {EXPORT_FORMATS.map((format) => {
              const Icon = format.icon;
              const active = exportFormat === format.key;
              return (
                <button
                  key={format.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={clsx('mod-export-option', active && 'is-active')}
                  onClick={() => setExportFormat(format.key)}
                >
                  <span className={clsx('mod-export-icon', `mod-kpi-tone-${format.tone}`)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="mod-export-label">{format.label}</span>
                  <span className="mod-export-desc">{format.description}</span>
                  <span className="mod-export-check" aria-hidden>
                    {active && <CheckCircle2 className="h-4 w-4" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Periodo</p>
              <p className="mt-1 text-xs font-semibold text-slate-800">{days} días</p>
            </div>
            <div className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Desde</p>
              <p className="mt-1 text-xs font-semibold text-slate-800">{desde || 'Inicio'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Hasta</p>
              <p className="mt-1 text-xs font-semibold text-slate-800">{hasta || 'Hoy'}</p>
            </div>
          </div>

          {error && <ErrorAlert message={error} />}
        </div>
      </Modal>
    </div>
  );
}
