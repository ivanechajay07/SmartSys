import { useEffect, useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import '@/styles/wizard.css';

export interface FormWizardStep {
  id: string;
  label: string;
  description?: ReactNode;
  icon?: ReactNode;
  content: ReactNode;
  optional?: boolean;
}

export function FormWizard({
  steps,
  formId,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  onCancel,
  onSubmit,
  submitting = false,
  submitDisabled = false,
  onNext,
  resetKey,
  className,
}: {
  steps: FormWizardStep[];
  formId?: string;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onSubmit?: () => void;
  submitting?: boolean;
  submitDisabled?: boolean;
  onNext?: (index: number) => boolean | Promise<boolean>;
  resetKey?: unknown;
  className?: string;
}) {
  const [current, setCurrent] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [validating, setValidating] = useState(false);
  const safeCurrent = Math.min(current, Math.max(0, steps.length - 1));
  const isLast = safeCurrent === steps.length - 1;
  const progress = useMemo(
    () => (steps.length > 1 ? Math.round((safeCurrent / (steps.length - 1)) * 100) : 100),
    [safeCurrent, steps.length],
  );

  useEffect(() => {
    setCurrent(0);
    setMaxVisited(0);
  }, [resetKey]);

  useEffect(() => {
    if (current > steps.length - 1) setCurrent(Math.max(0, steps.length - 1));
  }, [current, steps.length]);

  const goTo = (index: number) => {
    if (index < 0 || index >= steps.length) return;
    if (index > maxVisited) return;
    setCurrent(index);
  };

  const advance = async () => {
    if (validating) return;
    if (onNext) {
      setValidating(true);
      try {
        const canContinue = await onNext(safeCurrent);
        if (!canContinue) return;
      } finally {
        setValidating(false);
      }
    }
    const next = Math.min(safeCurrent + 1, steps.length - 1);
    setCurrent(next);
    setMaxVisited((value) => Math.max(value, next));
  };

  return (
    <div className={clsx('fk-wizard', className)}>
      <nav className="fk-wizard-head" aria-label="Pasos del formulario">
        <ol className="fk-wizard-steps">
          {steps.map((step, index) => {
            const state = index === safeCurrent ? 'current' : index < safeCurrent ? 'done' : 'upcoming';
            const reachable = index <= maxVisited;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  className={clsx('fk-wizard-step', `is-${state}`, reachable && 'is-reachable')}
                  aria-current={index === safeCurrent ? 'step' : undefined}
                  disabled={!reachable}
                  onClick={() => goTo(index)}
                >
                  <span className="fk-wizard-dot" aria-hidden>
                    {state === 'done' ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className="fk-wizard-copy">
                    <strong>{step.label}</strong>
                    {step.description && <small>{step.description}</small>}
                    {step.optional && <em>Opcional</em>}
                  </span>
                  {step.icon && <span className="fk-wizard-icon" aria-hidden>{step.icon}</span>}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="fk-wizard-progress" aria-hidden>
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="fk-wizard-counter">
          Paso {safeCurrent + 1} de {steps.length}
        </p>
      </nav>

      <div className="fk-wizard-body">
        {steps.map((step, index) => (
          <section
            key={step.id}
            className="fk-wizard-panel"
            hidden={index !== safeCurrent}
            aria-label={step.label}
          >
            {step.content}
          </section>
        ))}
      </div>

      <footer className="fk-wizard-nav">
        <button type="button" className="fk-wizard-cancel" onClick={onCancel}>
          {cancelLabel}
        </button>
        <div className="fk-wizard-actions">
          {safeCurrent > 0 && (
            <button type="button" className="fk-wizard-back" onClick={() => goTo(safeCurrent - 1)}>
              <ArrowLeft className="h-3.5 w-3.5" /> Atrás
            </button>
          )}
          {isLast ? (
            <button
              type={formId ? 'submit' : 'button'}
              form={formId}
              className="fk-wizard-submit"
              disabled={submitting || submitDisabled}
              onClick={formId ? undefined : onSubmit}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {submitLabel}
            </button>
          ) : (
            <button type="button" className="fk-wizard-next" onClick={advance} disabled={validating}>
              {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Continuar
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
