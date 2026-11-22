import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import '@/styles/date-picker.css';

const WEEKDAYS = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function parseISO(value?: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toISO(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function sameDay(a: Date | null, b: Date | null): boolean {
  return Boolean(a && b && a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  className,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => parseISO(value) ?? new Date());
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => parseISO(value), [value]);
  const today = useMemo(() => new Date(), []);

  const computePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(294, window.innerWidth - 16);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    const below = window.innerHeight - rect.bottom;
    const top = below < 350 ? Math.max(8, rect.top - 330) : rect.bottom + 6;
    setPosition({ left, top });
  };

  const openPicker = () => {
    computePosition();
    setView(selected ?? new Date());
    setOpen(true);
    window.setTimeout(() => panelRef.current?.focus(), 0);
  };

  const closePicker = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const update = () => computePosition();
    const onOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePicker();
      }
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const label = selected
    ? new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(selected)
    : placeholder;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={clsx('date-picker-trigger', !selected && 'is-empty', className)}
        onClick={() => (open ? closePicker() : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
      >
        <CalendarDays className="h-4 w-4" />
        <span>{label}</span>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="date-picker-panel"
          role="dialog"
          aria-label="Seleccionar fecha"
          tabIndex={-1}
          style={{ left: position.left, top: position.top }}
        >
          <div className="date-picker-head">
            <button type="button" onClick={() => setView(new Date(year, month - 1, 1))} aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p>{MONTHS[month]} de {year}</p>
            <button type="button" onClick={() => setView(new Date(year, month + 1, 1))} aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="date-picker-weekdays" aria-hidden>
            {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="date-picker-grid">
            {cells.map((day, index) => {
              if (day === null) return <span key={`empty-${index}`} />;
              const date = new Date(year, month, day);
              return (
                <button
                  key={day}
                  type="button"
                  className={clsx(
                    'date-picker-day',
                    sameDay(date, selected) && 'is-selected',
                    sameDay(date, today) && 'is-today',
                  )}
                  aria-label={new Intl.DateTimeFormat('es-PE', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  }).format(date)}
                  aria-pressed={sameDay(date, selected)}
                  onClick={() => {
                    onChange(toISO(date));
                    closePicker();
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="date-picker-foot">
            <button type="button" onClick={() => { onChange(''); closePicker(); }}>Limpiar</button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                onChange(toISO(now));
                closePicker();
              }}
            >
              Hoy
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
