export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value));
}

export function formatQuantity(value: number | null | undefined): string {
  return formatNumber(value, 0);
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function parseDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  return new Date(value);
}

export function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return toISODate(date);
}

export function firstDayOfMonthISO(): string {
  const date = new Date();
  return toISODate(new Date(date.getFullYear(), date.getMonth(), 1));
}

export const STATE_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_REVISION: 'En revisión',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  PENDIENTE_DESPACHO: 'Pendiente de despacho',
  PARCIALMENTE_ATENDIDA: 'Parcialmente atendida',
  DESPACHADA: 'Despachada',
  BORRADOR: 'Borrador',
  EN_PREPARACION: 'En preparación',
  PREPARADO: 'Preparado',
  EN_RUTA: 'En ruta',
  ENTREGADO: 'Entregado',
  ENTREGADO_PARCIAL: 'Entregado parcial',
  CANCELADO: 'Cancelado',
  CANCELADA: 'Cancelada',
  PROGRAMADA: 'Programada',
  REPROGRAMADA: 'Reprogramada',
  EN_EJECUCION: 'En ejecucion',
  CUMPLIDA: 'Cumplida',
  PARCIAL: 'Parcial',
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
  ATENDIDA: 'Atendida',
  CONFORME: 'Conforme',
  PREPARACION: 'Preparación',
  ASIGNACION: 'Asignación de transporte',
  RECEPCION_MATERIAL: 'Recepción de material',
  SALIDA_ALMACEN: 'Salida de almacén',
  LLEGADA: 'Llegada al punto',
  ENTREGA_TOTAL: 'Entrega total',
  ENTREGA_PARCIAL: 'Entrega parcial',
  RECEPCION_RECHAZO: 'Recepción con rechazo',
  EVIDENCIA: 'Evidencia adjunta',
  INCIDENCIA: 'Incidencia',
  INGRESO: 'Ingreso',
  SALIDA: 'Salida',
  AJUSTE_POSITIVO: 'Ajuste positivo',
  AJUSTE_NEGATIVO: 'Ajuste negativo',
  MERMA: 'Merma',
};

export function stateLabel(state: string): string {
  return STATE_LABELS[state] ?? state.replaceAll('_', ' ').toLowerCase();
}

export const STATE_TONES: Record<string, string> = {
  PENDIENTE: 'amber',
  EN_REVISION: 'blue',
  APROBADA: 'green',
  PENDIENTE_DESPACHO: 'blue',
  PARCIALMENTE_ATENDIDA: 'amber',
  DESPACHADA: 'green',
  RECHAZADA: 'red',
  BORRADOR: 'slate',
  EN_PREPARACION: 'blue',
  PREPARADO: 'indigo',
  EN_RUTA: 'amber',
  ENTREGADO: 'green',
  ENTREGADO_PARCIAL: 'amber',
  CANCELADO: 'slate',
  CANCELADA: 'slate',
  PROGRAMADA: 'blue',
  REPROGRAMADA: 'amber',
  EN_EJECUCION: 'indigo',
  CUMPLIDA: 'green',
  PARCIAL: 'amber',
  PENDIENTE_APROBACION: 'amber',
  ATENDIDA: 'green',
  CONFORME: 'green',
  INGRESO: 'green',
  SALIDA: 'blue',
  AJUSTE_POSITIVO: 'green',
  AJUSTE_NEGATIVO: 'amber',
  MERMA: 'red',
};

export function stateTone(state: string): string {
  return STATE_TONES[state] ?? 'slate';
}

/** Devuelve la URL solo si usa http/https; evita esquemas peligrosos como javascript:. */
export function safeUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value, window.location.origin);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}
