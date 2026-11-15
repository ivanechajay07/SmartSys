import { useMemo, useState, type DragEvent } from 'react';
import clsx from 'clsx';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { formatDate, formatQuantity, stateLabel } from '@/lib/format';
import type { EstadoProgramacion, ProgramacionAbastecimiento } from '@/types';
import { Badge, Button, StatusBadge } from '@/components/ui';
import '@/styles/calendar.css';

interface ScheduleCalendarProps {
  schedules: ProgramacionAbastecimiento[];
  canManage: boolean;
  selectedDay: string | null;
  onSelectDay: (iso: string | null) => void;
  showSelectedPanel?: boolean;
  compact?: boolean;
  onSelect: (schedule: ProgramacionAbastecimiento) => void;
  onRescheduled: (message: string) => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const STATUS_TONE: Record<string, string> = {
  PROGRAMADA: 'brand',
  REPROGRAMADA: 'amber',
  EN_EJECUCION: 'sky',
  CUMPLIDA: 'green',
  PARCIAL: 'amber',
  CANCELADA: 'slate',
};

function isoOf(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthDays(cursor: Date): { date: Date; iso: string; inMonth: boolean }[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      iso: isoOf(date),
      inMonth: date.getMonth() === cursor.getMonth(),
    };
  });
}

function estadoTone(estado: EstadoProgramacion): string {
  return STATUS_TONE[estado] ?? 'slate';
}

function editable(estado: EstadoProgramacion): boolean {
  return estado !== 'CUMPLIDA' && estado !== 'CANCELADA';
}

export function ScheduleCalendar({
  schedules,
  canManage,
  selectedDay,
  onSelectDay,
  showSelectedPanel = true,
  compact = false,
  onSelect,
  onRescheduled,
}: ScheduleCalendarProps) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => monthDays(cursor), [cursor]);
  const byDate = useMemo(() => {
    const map = new Map<string, ProgramacionAbastecimiento[]>();
    for (const item of schedules) {
      const key = item.fechaProgramada?.slice(0, 10);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [schedules]);

  const monthEvents = useMemo(
    () => schedules.filter((item) => {
      const date = item.fechaProgramada?.slice(0, 10);
      if (!date) return false;
      const value = new Date(`${date}T00:00:00`);
      return value.getFullYear() === cursor.getFullYear() && value.getMonth() === cursor.getMonth();
    }),
    [schedules, cursor],
  );

  const selectedEvents = selectedDay ? byDate.get(selectedDay) ?? [] : [];
  const monthLabel = cursor.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  const selectedLabel = selectedDay ? formatDate(selectedDay) : '';

  const shiftMonth = (delta: number) => {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  };

  const goToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDay(isoOf(now));
  };

  const recargar = () => {
    setError(null);
    onRescheduled('Calendario actualizado.');
  };

  const onDrop = async (event: DragEvent, iso: string) => {
    event.preventDefault();
    setDragOver(null);
    const id = Number(event.dataTransfer.getData('text/plain'));
    const item = schedules.find((schedule) => schedule.id === id);
    if (!item || item.fechaProgramada?.slice(0, 10) === iso) return;
    if (!canManage || !editable(item.estado)) {
      setError('Esta programación no se puede reprogramar.');
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/schedules/${id}/reschedule`, {
        fecha: iso,
        motivo: 'Reprogramación desde el calendario',
      });
      onRescheduled(`Programación #${id} movida al ${formatDate(iso)}.`);
      onSelectDay(iso);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={clsx('schedule-calendar', compact && 'is-compact')}>
      <div className="calendar-toolbar">
        <div className="calendar-heading">
          <span className="calendar-heading-icon">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <p className="calendar-month">{monthLabel}</p>
            <p className="calendar-sub">
              {monthEvents.length} entrega{monthEvents.length === 1 ? '' : 's'} en el mes
              {canManage ? ' · arrastre una entrega para reprogramarla' : ''}
            </p>
          </div>
        </div>
        <div className="calendar-actions">
          <div className="calendar-metrics" aria-hidden>
            <span><i className="is-brand" /> {monthEvents.length} total</span>
            <span><i className="is-sky" /> {monthEvents.filter((item) => item.estado === 'EN_EJECUCION').length} en ruta</span>
            <span><i className="is-green" /> {monthEvents.filter((item) => item.estado === 'CUMPLIDA').length} cumplidas</span>
          </div>
          <button type="button" className="calendar-nav" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <Button size="sm" variant="secondary" onClick={goToday}>Hoy</Button>
          <button type="button" className="calendar-nav" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" className="calendar-nav" onClick={recargar} aria-label="Actualizar calendario">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="calendar-error" role="alert">{error}</div>
      )}

      <div className="calendar-weekdays">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="calendar-grid calendar-grid-enter" key={monthLabel} role="grid" aria-label={`Calendario de ${monthLabel}`}>
        {days.map((day) => {
          const events = byDate.get(day.iso) ?? [];
          const isToday = day.iso === isoOf(today);
          const isSelected = day.iso === selectedDay;
          return (
            <div
              key={day.iso}
              role="gridcell"
              tabIndex={0}
              aria-label={`${formatDate(day.iso)}, ${events.length} entregas`}
              className={clsx(
                'calendar-day',
                !day.inMonth && 'is-outside',
                isToday && 'is-today',
                isSelected && 'is-selected',
                dragOver === day.iso && 'is-drag-over',
              )}
              onClick={() => onSelectDay(day.iso === selectedDay ? null : day.iso)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectDay(day.iso === selectedDay ? null : day.iso);
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(day.iso);
              }}
              onDragLeave={() => setDragOver((current) => current === day.iso ? null : current)}
              onDrop={(event) => onDrop(event, day.iso)}
            >
              <span className="calendar-day-number">{day.date.getDate()}</span>
              <div className="calendar-events">
                {events.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    draggable={canManage && editable(item.estado)}
                    className={clsx(
                      'calendar-event',
                      `is-${estadoTone(item.estado)}`,
                      busyId === item.id && 'is-busy',
                    )}
                    title={`${item.producto.nombre} · ${stateLabel(item.estado)} · ${formatQuantity(item.cantidadProgramada)} ${item.producto.unidadMedida}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(item);
                    }}
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', String(item.id));
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                  >
                    {canManage && editable(item.estado) && (
                      <GripVertical className="calendar-event-grip h-3 w-3" aria-hidden />
                    )}
                    <span className="calendar-event-label">{item.producto.nombre}</span>
                  </button>
                ))}
                {events.length > 3 && (
                  <span className="calendar-more">+{events.length - 3} más</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="calendar-footer">
        <div className="calendar-legend">
          {(['PROGRAMADA', 'EN_EJECUCION', 'PARCIAL', 'CUMPLIDA', 'CANCELADA'] as EstadoProgramacion[]).map((estado) => (
            <span key={estado} className="calendar-legend-item">
              <i className={`calendar-legend-dot is-${estadoTone(estado)}`} />
              {stateLabel(estado)}
            </span>
          ))}
        </div>
      </div>

      {showSelectedPanel && (
        <div className="calendar-selected">
        <div className="calendar-selected-head">
          <div>
            <p className="calendar-selected-title">Entregas del día</p>
            <p className="calendar-selected-date">{selectedLabel || 'Seleccione una fecha'}</p>
          </div>
          <Badge tone={selectedEvents.length > 0 ? 'brand' : 'slate'}>
            {selectedEvents.length} entrega{selectedEvents.length === 1 ? '' : 's'}
          </Badge>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="calendar-empty">
            <Inbox className="h-5 w-5" />
            <span>No hay entregas programadas para este día.</span>
          </div>
        ) : (
          <div className="calendar-selected-list">
            {selectedEvents.map((item) => (
              <button
                key={item.id}
                type="button"
                className="calendar-selected-item"
                onClick={() => onSelect(item)}
              >
                <span className={`calendar-status is-${estadoTone(item.estado)}`}>
                  {stateLabel(item.estado)}
                </span>
                <span className="calendar-selected-copy">
                  <strong>{item.producto.nombre}</strong>
                  <span>{item.entidad.razonSocial} · {item.puntoEntrega.nombre}</span>
                </span>
                <span className="calendar-selected-qty">
                  {formatQuantity(item.cantidadProgramada)}
                  <small>{item.producto.unidadMedida}</small>
                </span>
                <StatusBadge estado={item.estado} />
              </button>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
