import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';

export type ModuleTone = 'brand' | 'amber' | 'sky' | 'rose' | 'indigo';

/* ------------------------------------------------------------------- Hero */

export function ModuleHero({
  eyebrow,
  title,
  description,
  actions,
  live = true,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  live?: boolean;
}) {
  return (
    <section className="mod-hero mod-reveal">
      <div className="mod-hero-content">
        <div>
          <p className="mod-eyebrow">
            {live && <span className="mod-live-dot" />} {eyebrow}
          </p>
          <h1 className="mod-title">{title}</h1>
          <p className="mod-sub">{description}</p>
        </div>
        {actions && <div className="mod-hero-actions">{actions}</div>}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- KPI */

export function ModuleKpi({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  active = false,
  onClick,
  delay = 'mod-reveal-1',
  compact = false,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  icon: ReactNode;
  tone?: ModuleTone;
  active?: boolean;
  onClick?: () => void;
  delay?: string;
  compact?: boolean;
}) {
  const className = clsx(
    `mod-kpi mod-kpi-tone-${tone} mod-reveal ${delay}`,
    active && 'is-active',
    compact && 'is-compact',
  );
  const body = (
    <>
      <div className="mod-kpi-icon">{icon}</div>
      <p className="mod-kpi-label">{label}</p>
      <p className="mod-kpi-value">{value}</p>
      <p className="mod-kpi-hint">{hint}</p>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

/* ------------------------------------------------------------------ Chips */

export function ModuleChips({
  filters,
  value,
  onChange,
  counts,
  ariaLabel = 'Filtrar registros',
}: {
  filters: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  counts?: Record<string, number>;
  ariaLabel?: string;
}) {
  return (
    <div className="mod-chips" role="tablist" aria-label={ariaLabel}>
      {filters.map((filter) => (
        <button
          key={filter.value || 'ALL'}
          type="button"
          role="tab"
          aria-selected={value === filter.value}
          className={clsx('mod-chip', value === filter.value && 'is-active')}
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
          {counts && <span className="mod-chip-count">{counts[filter.value] ?? 0}</span>}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- View toggle */

export function ModuleViewToggle({
  value,
  onChange,
}: {
  value: 'table' | 'grid';
  onChange: (value: 'table' | 'grid') => void;
}) {
  return (
    <div className="mod-view-toggle" role="group" aria-label="Modo de visualización">
      <button
        type="button"
        className={clsx(value === 'table' && 'is-active')}
        onClick={() => onChange('table')}
      >
        <List className="h-3.5 w-3.5" /> Tabla
      </button>
      <button
        type="button"
        className={clsx(value === 'grid' && 'is-active')}
        onClick={() => onChange('grid')}
      >
        <LayoutGrid className="h-3.5 w-3.5" /> Tarjetas
      </button>
    </div>
  );
}

/* -------------------------------------------------------------- Progress */

export function ModuleProgress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const tone = clamped >= 90 ? '' : clamped >= 70 ? 'is-warn' : 'is-danger';
  return (
    <div className="mod-progress" aria-hidden>
      <div className={clsx('mod-progress-fill', tone)} style={{ width: `${clamped}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------- Paginación */

export function useResponsiveView(initial: 'table' | 'grid' = 'table') {
  const [view, setView] = useState<'table' | 'grid'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
      ? 'grid'
      : initial,
  );
  return [view, setView] as const;
}

export function usePagination<T>(items: T[], pageSize = 8, resetKey = '') {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;

  return {
    page: safePage,
    pageCount,
    pageItems: items.slice(start, start + pageSize),
    pageSize,
    total: items.length,
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, items.length),
    setPage,
  };
}

function pageList(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: (number | '...')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push('...');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < total - 1) pages.push('...');
  pages.push(total);

  return pages;
}

export function ModulePagination({
  page,
  pageCount,
  total,
  from,
  to,
  pageSize,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;

  return (
    <nav className="mod-pagination" aria-label="Paginación de resultados">
      <p className="mod-pagination-info">
        Mostrando <strong>{from}–{to}</strong> de <strong>{total}</strong>
      </p>

      <div className="mod-pagination-pills">
        <button
          type="button"
          className="mod-page-pill mod-page-nav"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageList(page, pageCount).map((item, index) =>
          item === '...' ? (
            <span key={`ellipsis-${index}`} className="mod-page-ellipsis" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={clsx('mod-page-pill', item === page && 'is-active')}
              aria-label={`Página ${item}`}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          className="mod-page-pill mod-page-nav"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <span className="mod-pagination-size">{pageSize} por página</span>
    </nav>
  );
}
