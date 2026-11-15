import { describe, expect, it } from 'vitest';
import {
  firstDayOfMonthISO,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatQuantity,
  safeUrl,
  stateLabel,
  stateTone,
  todayISO,
} from '@/lib/format';

describe('formatNumber', () => {
  it('formats numbers with es-PE separators', () => {
    expect(formatNumber(1234.5, 2)).toBe('1,234.50');
    expect(formatQuantity(1500)).toBe('1,500');
  });

  it('returns placeholder for invalid values', () => {
    expect(formatNumber(null)).toBe('-');
    expect(formatNumber(Number.NaN)).toBe('-');
  });
});

describe('formatMoney', () => {
  it('formats soles', () => {
    expect(formatMoney(1234.5)).toContain('1,234.50');
    expect(formatMoney(null)).toBe('-');
  });
});

describe('formatDate', () => {
  it('formats ISO dates and null values', () => {
    expect(formatDate('2026-03-15')).toMatch(/2026/);
    expect(formatDate(null)).toBe('-');
    expect(formatDate('texto-invalido')).toBe('-');
  });

  it('formats date-time values', () => {
    expect(formatDateTime('2026-03-15T10:30:00')).toMatch(/2026/);
    expect(formatDateTime(undefined)).toBe('-');
  });
});

describe('state helpers', () => {
  it('maps known states to Spanish labels and tones', () => {
    expect(stateLabel('ENTREGADO_PARCIAL')).toBe('Entregado parcial');
    expect(stateTone('ENTREGADO')).toBe('green');
    expect(stateTone('RECHAZADA')).toBe('red');
  });

  it('falls back for unknown states', () => {
    expect(stateLabel('NUEVO_ESTADO')).toBe('nuevo estado');
    expect(stateTone('NUEVO_ESTADO')).toBe('slate');
  });
});

describe('date helpers', () => {
  it('returns ISO dates', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(firstDayOfMonthISO()).toMatch(/^\d{4}-\d{2}-01$/);
    expect(todayISO(1) > todayISO()).toBe(true);
  });
});

describe('safeUrl', () => {
  it('allows http and https URLs', () => {
    expect(safeUrl('https://almacen.ejemplo.com/foto.jpg')).toContain('https://almacen.ejemplo.com/foto.jpg');
    expect(safeUrl('http://localhost:8080/evidencia')).toContain('http://localhost:8080/evidencia');
  });

  it('rejects dangerous or empty values', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(safeUrl(null)).toBeUndefined();
    expect(safeUrl('')).toBeUndefined();
  });
});
