import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
  pause: (id: number) => void;
  resume: (id: number) => void;
}

let sequence = 0;
const timers = new Map<number, number>();
const startedAt = new Map<number, number>();
const remaining = new Map<number, number>();

function clearTimer(id: number) {
  const timer = timers.get(id);
  if (timer) window.clearTimeout(timer);
  timers.delete(id);
  startedAt.delete(id);
}

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = ++sequence;
    const dropped = get().toasts.length >= 4 ? get().toasts[0]?.id : undefined;
    if (dropped !== undefined) {
      clearTimer(dropped);
      remaining.delete(dropped);
    }

    set((state) => ({
      toasts: [...state.toasts.slice(-3), { ...toast, id }],
    }));

    remaining.set(id, toast.duration);
    startedAt.set(id, Date.now());
    timers.set(
      id,
      window.setTimeout(() => get().dismiss(id), toast.duration),
    );
  },
  dismiss: (id) => {
    clearTimer(id);
    remaining.delete(id);
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
  pause: (id) => {
    const timer = timers.get(id);
    if (!timer) return;
    window.clearTimeout(timer);
    timers.delete(id);
    const started = startedAt.get(id) ?? Date.now();
    const left = Math.max(600, (remaining.get(id) ?? 0) - (Date.now() - started));
    remaining.set(id, left);
    startedAt.delete(id);
  },
  resume: (id) => {
    if (timers.has(id)) return;
    const left = remaining.get(id);
    if (left === undefined) return;
    startedAt.set(id, Date.now());
    timers.set(
      id,
      window.setTimeout(() => get().dismiss(id), left),
    );
  },
}));

export function toastSuccess(message: string, title = 'Operación completada') {
  useToasts.getState().push({ tone: 'success', title, message, duration: 4200 });
}

export function toastError(message: string, title = 'No se pudo completar la operación') {
  useToasts.getState().push({ tone: 'error', title, message, duration: 5200 });
}

export function toastInfo(message: string, title = 'Información') {
  useToasts.getState().push({ tone: 'info', title, message, duration: 3800 });
}
