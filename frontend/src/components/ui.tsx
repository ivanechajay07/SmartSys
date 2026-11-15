import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type CSSProperties,
  type ForwardedRef,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { AlertCircle, Check, ChevronDown, Inbox, Loader2, Search, Sparkles, X } from 'lucide-react';
import { stateLabel, stateTone } from '@/lib/format';
import '@/styles/searchable-select.css';

/* ------------------------------------------------------------------ Button */
type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  soft: 'btn-soft',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(BUTTON_VARIANTS[variant], size === 'sm' && 'btn-sm', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------- Card */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('card', className)}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="card-header">
      <div>
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------- Badge */
type Tone = 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'indigo' | 'brand';

const TONES: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
};

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        TONES[tone] ?? TONES.slate,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ estado }: { estado: string }) {
  const tone = stateTone(estado) as Tone;
  return <Badge tone={tone}>{stateLabel(estado)}</Badge>;
}

/* ------------------------------------------------------------------ Inputs */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={clsx('input', className)} {...rest} />;
  },
);

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function optionText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(optionText).join('');
  if (isValidElement(node)) {
    return optionText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

function parseOptions(children: ReactNode, result: SelectOption[] = []): SelectOption[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    if (child.type === 'option') {
      const props = child.props as {
        value?: string | number;
        disabled?: boolean;
        children?: ReactNode;
      };
      const label = optionText(props.children);
      result.push({
        value: props.value !== undefined ? String(props.value) : label,
        label,
        disabled: props.disabled,
      });
      return;
    }

    if (child.type === Fragment || child.type === 'optgroup') {
      parseOptions((child.props as { children?: ReactNode }).children, result);
    }
  });
  return result;
}

function singleValue(value: SelectHTMLAttributes<HTMLSelectElement>['value']): string | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value[0] === undefined ? '' : String(value[0]);
  return String(value);
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function NativeSelect({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={clsx('input', className)} {...rest}>
        {children}
      </select>
    );
  },
);

function SearchableSelect({
  className,
  children,
  value,
  defaultValue,
  onChange,
  onBlur,
  disabled,
  required,
  name,
  id,
  forwardedRef,
  autoFocus: _autoFocus,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  forwardedRef: ForwardedRef<HTMLSelectElement>;
}) {
  const options = useMemo(() => parseOptions(children), [children]);
  const controlled = value !== undefined;
  const [nativeValue, setNativeValue] = useState(() => singleValue(value) ?? singleValue(defaultValue) ?? '');
  const currentValue = controlled ? singleValue(value) ?? '' : nativeValue;
  const selectedOption = options.find((option) => option.value === currentValue);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [rect, setRect] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const nativeRef = useRef<HTMLSelectElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const term = normalizeSearch(search.trim());
    if (!term) return options;
    return options.filter((option) =>
      normalizeSearch(`${option.label} ${option.value}`).includes(term),
    );
  }, [options, search]);

  const setRefs = (node: HTMLSelectElement | null) => {
    nativeRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      (forwardedRef as { current: HTMLSelectElement | null }).current = node;
    }
  };

  const syncFromDom = () => {
    if (controlled) return;
    const select = nativeRef.current;
    if (select && select.value !== nativeValue) {
      setNativeValue(select.value);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (controlled) return;
      const select = nativeRef.current;
      if (select && select.value !== nativeValue) {
        setNativeValue(select.value);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [children, defaultValue, controlled, nativeValue]);

  const computeRect = () => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const r = trigger.getBoundingClientRect();
    const width = Math.min(Math.max(r.width, 240), window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const openUp = below < 220 && above > below;
    const maxHeight = Math.max(160, Math.min(300, openUp ? above : below));
    return {
      left,
      width,
      top: openUp ? Math.max(8, r.top - maxHeight - 6) : r.bottom + 6,
      maxHeight,
    };
  };

  const openMenu = () => {
    if (disabled) return;
    syncFromDom();
    setRect(computeRect());
    setSearch('');
    setOpen(true);
  };

  const closeMenu = (focusTrigger = true) => {
    setOpen(false);
    setSearch('');
    if (focusTrigger) triggerRef.current?.focus();
  };

  const choose = (option: SelectOption) => {
    if (option.disabled) return;
    const select = nativeRef.current;
    if (select) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      descriptor?.set?.call(select, option.value);
    }
    setNativeValue(option.value);
    const event = select
      ? ({ target: select, currentTarget: select } as unknown as ChangeEvent<HTMLSelectElement>)
      : ({
          target: { value: option.value, name },
          currentTarget: { value: option.value, name },
        } as unknown as ChangeEvent<HTMLSelectElement>);
    onChange?.(event);
    setOpen(false);
    setSearch('');
    triggerRef.current?.focus();
  };

  const handleNativeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setNativeValue(event.target.value);
    onChange?.(event);
  };

  useEffect(() => {
    if (!open) return;
    const index = options.findIndex((option) => option.value === currentValue);
    setHighlight(index >= 0 ? index : 0);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => setRect(computeRect());
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  useEffect(() => {
    if (highlight >= filtered.length) setHighlight(0);
  }, [filtered.length, highlight]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${highlight}`)?.scrollIntoView({ block: 'nearest' });
  }, [highlight, listId, open]);

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((index) => (filtered.length ? (index + 1) % filtered.length : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((index) =>
        filtered.length ? (index - 1 + filtered.length) % filtered.length : 0,
      );
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = filtered[highlight];
      if (option) choose(option);
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      closeMenu();
      return;
    }
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      openMenu();
    }
  };

  return (
    <div className={clsx('ss-root', className)}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={clsx('input ss-trigger', className)}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
      >
        <span className={clsx('ss-value', !selectedOption && 'is-placeholder')}>
          {selectedOption?.label ?? (options.length ? 'Seleccione…' : 'Sin opciones')}
        </span>
        <ChevronDown className={clsx('ss-chevron', open && 'is-open')} />
      </button>

      <select
        {...rest}
        ref={setRefs}
        name={name}
        className="ss-native"
        value={controlled ? currentValue : undefined}
        defaultValue={controlled ? undefined : singleValue(defaultValue)}
        onChange={handleNativeChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
      >
        {children}
      </select>

      {open && rect &&
        createPortal(
          <div
            ref={popoverRef}
            className="ss-popover"
            style={
              {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                maxHeight: rect.maxHeight,
              } as CSSProperties
            }
          >
            <div className="ss-search">
              <Search className="h-4 w-4" />
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Buscar opción…"
                aria-label="Buscar opción"
                autoComplete="off"
              />
              <span className="ss-count">{filtered.length}</span>
            </div>

            <div className="ss-list" role="listbox" id={listId} aria-label="Opciones">
              {filtered.map((option, index) => (
                <button
                  key={`${option.value}-${index}`}
                  id={`${listId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={option.value === currentValue}
                  className={clsx(
                    'ss-option',
                    index === highlight && 'is-active',
                    option.value === currentValue && 'is-selected',
                  )}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(option)}
                  disabled={option.disabled}
                >
                  <span>{option.label}</span>
                  {option.value === currentValue && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="ss-empty">Sin resultados para “{search}”</p>
              )}
            </div>

            <div className="ss-hint">↑ ↓ navegar · Enter seleccionar · Esc cerrar</div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select(props, ref) {
    if (props.multiple || (typeof props.size === 'number' && props.size > 1)) {
      return <NativeSelect {...props} ref={ref} />;
    }
    return <SearchableSelect {...props} forwardedRef={ref} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={clsx('input min-h-[84px]', className)} {...rest} />;
  },
);

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------- Modal */
type ModalTone = 'brand' | 'slate' | 'sky' | 'amber' | 'rose' | 'indigo';

const MODAL_ICON_TONES: Record<ModalTone, string> = {
  brand: 'modal-icon-brand',
  slate: 'modal-icon-slate',
  sky: 'modal-icon-sky',
  amber: 'modal-icon-amber',
  rose: 'modal-icon-rose',
  indigo: 'modal-icon-indigo',
};

export function Modal({
  open,
  title,
  subtitle,
  icon,
  tone = 'brand',
  onClose,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  tone?: ModalTone;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusTimer = window.setTimeout(() => panel?.focus(), 0);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (node) => node.offsetParent !== null,
      );
      if (nodes.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalOverflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        className={clsx('modal-panel', `modal-size-${size}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <span className="modal-grabber" aria-hidden />
        <header className="modal-head">
          <span className={clsx('modal-icon', MODAL_ICON_TONES[tone])}>
            {icon ?? <Sparkles className="h-4 w-4" />}
          </span>
          <div className="modal-heading">
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="modal-close" onClick={() => onCloseRef.current()} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="modal-body">{children}</div>

        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------- Feedback UI */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
      {label ?? 'Cargando información...'}
    </div>
  );
}

export function ErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <span className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {message}
      </span>
      {onRetry && (
        <button type="button" className="font-semibold underline" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
      {message}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400">
        <Inbox className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------- Page pieces */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: 'brand' | 'amber' | 'rose' | 'sky' | 'indigo';
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {icon && <span className={clsx('rounded-lg p-2.5', tones[tone])}>{icon}</span>}
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h3>;
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-700 sm:text-right">{children}</dd>
    </div>
  );
}
