import { useMemo, useState, type ReactNode } from 'react';
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export type SortDirection = 'asc' | 'desc';
export type SortAccessor<T> = (row: T) => string | number | null | undefined;

export function useTableSort<T>(
  rows: T[],
  accessors: Record<string, SortAccessor<T>>,
  initialKey?: string,
) {
  const [sort, setSort] = useState<{ key: string; dir: SortDirection } | null>(
    initialKey && accessors[initialKey] ? { key: initialKey, dir: 'asc' } : null,
  );

  const sorted = useMemo(() => {
    if (!sort || !accessors[sort.key]) return rows;
    const accessor = accessors[sort.key];
    const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
    const direction = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = accessor(a);
      const right = accessor(b);
      const aEmpty = left === null || left === undefined || left === '';
      const bEmpty = right === null || right === undefined || right === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * direction;
      }
      return collator.compare(String(left), String(right)) * direction;
    });
  }, [rows, sort, accessors]);

  const toggle = (key: string) => {
    if (!accessors[key]) return;
    setSort((current) => ({
      key,
      dir: current?.key === key && current.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const ariaSort = (key: string): 'ascending' | 'descending' | 'none' => {
    if (sort?.key !== key) return 'none';
    return sort.dir === 'asc' ? 'ascending' : 'descending';
  };

  return { rows: sorted, sort, toggle, ariaSort };
}

export function SortableTh({
  label,
  column,
  sortKey,
  direction,
  onSort,
  className,
  children,
}: {
  label?: ReactNode;
  column: string;
  sortKey: string | null;
  direction: SortDirection | null;
  onSort: (key: string) => void;
  className?: string;
  children?: ReactNode;
}) {
  const active = sortKey === column;
  return (
    <th
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={clsx(className)}
    >
      <button
        type="button"
        className="table-sort"
        onClick={() => onSort(column)}
        title={`Ordenar por ${typeof label === 'string' ? label : column}`}
      >
        {children ?? label}
        {active ? (
          <ChevronDown className={clsx('h-3 w-3', direction === 'asc' && 'rotate-180')} aria-hidden />
        ) : (
          <ArrowUpDown className="h-3 w-3" aria-hidden />
        )}
      </button>
    </th>
  );
}
