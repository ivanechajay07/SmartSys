import type { ReactNode } from 'react';
import clsx from 'clsx';
import '@/styles/form-kit.css';

export type FormTone = 'brand' | 'sky' | 'indigo' | 'amber' | 'rose' | 'slate';

export function FormHero({
  tone = 'brand',
  eyebrow,
  title,
  subtitle,
  icon,
  tags,
  aside,
}: {
  tone?: FormTone;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  tags?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className={clsx('fk-hero', `fk-hero-${tone}`)}>
      <div className="fk-hero-main">
        <span className="fk-hero-icon">{icon}</span>
        <div className="fk-hero-copy">
          {eyebrow && <p className="fk-hero-eyebrow">{eyebrow}</p>}
          <h3>{title}</h3>
          {subtitle && <p className="fk-hero-subtitle">{subtitle}</p>}
          {tags && <div className="fk-hero-tags">{tags}</div>}
        </div>
      </div>
      {aside && <div className="fk-hero-aside">{aside}</div>}
    </div>
  );
}

export function FormTag({
  children,
  icon,
  tone = 'neutral',
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn';
}) {
  return (
    <span className={clsx('fk-tag', `fk-tag-${tone}`)}>
      {icon}
      {children}
    </span>
  );
}

export function FormSection({
  icon,
  title,
  description,
  actions,
  children,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx('fk-section', className)}>
      <header className="fk-section-head">
        {icon && <span className="fk-section-icon">{icon}</span>}
        <div className="fk-section-copy">
          <h4>{title}</h4>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="fk-section-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

export function FormGrid({
  children,
  cols = 2,
  className,
}: {
  children: ReactNode;
  cols?: 2 | 3;
  className?: string;
}) {
  return <div className={clsx('fk-grid', `fk-grid-${cols}`, className)}>{children}</div>;
}

export function FormNote({
  icon,
  children,
  tone = 'info',
}: {
  icon?: ReactNode;
  children: ReactNode;
  tone?: 'info' | 'ok' | 'warn';
}) {
  return (
    <div className={clsx('fk-note', `fk-note-${tone}`)}>
      {icon && <span className="fk-note-icon">{icon}</span>}
      <div>{children}</div>
    </div>
  );
}

export function FormStats({
  items,
  className,
}: {
  items: Array<{ label: string; value: ReactNode; hint?: ReactNode }>;
  className?: string;
}) {
  return (
    <div className={clsx('fk-stats', className)}>
      {items.map((item) => (
        <div key={item.label} className="fk-stat">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.hint && <small>{item.hint}</small>}
        </div>
      ))}
    </div>
  );
}

export function FormMeter({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="fk-meter" aria-hidden>
      <div className="fk-meter-head">
        <span>{label ?? 'Avance del formulario'}</span>
        <strong>{safe}%</strong>
      </div>
      <div className="fk-meter-track">
        <span style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}
