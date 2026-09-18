import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line-strong bg-surface/50 px-6 py-14 text-center',
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[12px] border border-line bg-canvas shadow-xs">
          <Icon className="h-5 w-5 text-subtle" aria-hidden />
        </div>
      ) : null}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
  icon: Icon,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  children?: React.ReactNode;
  className?: string;
  icon?: React.ElementType;
}) {
  const tones = {
    info: 'border-accent-border bg-accent-soft text-accent-hover',
    warning: 'border-warning/25 bg-warning-soft text-warning',
    danger: 'border-danger/25 bg-danger-soft text-danger',
    success: 'border-success/25 bg-success-soft text-success',
  };
  return (
    <div className={cn('flex gap-3 rounded-[12px] border px-4 py-3', tones[tone], className)} role="note">
      {Icon ? <Icon className="mt-0.5 h-[17px] w-[17px] shrink-0" aria-hidden /> : null}
      <div className="min-w-0 text-[13.5px] leading-relaxed">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function ErrorState({
  title = 'Une erreur est survenue',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[14px] border border-danger/20 bg-danger-soft/60 px-5 py-6 text-center">
      <p className="text-[15px] font-semibold text-danger">{title}</p>
      {description ? <p className="mt-1.5 text-[13.5px] text-ink-soft">{description}</p> : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}
