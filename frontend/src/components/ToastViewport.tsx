import { CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useToasts, type ToastTone } from '@/lib/toasts';
import '@/styles/toasts.css';

const ICONS: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: ShieldAlert,
  info: Info,
};

export function ToastViewport() {
  const toasts = useToasts((state) => state.toasts);
  const dismiss = useToasts((state) => state.dismiss);
  const pause = useToasts((state) => state.pause);
  const resume = useToasts((state) => state.resume);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.tone];
        return (
          <div
            key={toast.id}
            className={`toast toast-${toast.tone}`}
            style={{ '--toast-duration': `${toast.duration}ms` } as CSSProperties}
            role="status"
            onMouseEnter={() => pause(toast.id)}
            onMouseLeave={() => resume(toast.id)}
            onFocus={() => pause(toast.id)}
            onBlur={() => resume(toast.id)}
          >
            <span className="toast-icon">
              <Icon className="h-4 w-4" />
            </span>
            <div className="toast-copy">
              <p>{toast.title}</p>
              {toast.message && <span>{toast.message}</span>}
            </div>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(toast.id)}
              aria-label="Cerrar alerta"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <span className="toast-progress" aria-hidden />
          </div>
        );
      })}
    </div>
  );
}
