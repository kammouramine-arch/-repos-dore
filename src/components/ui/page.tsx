import * as React from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  actions,
  className,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  eyebrow?: string;
}) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-subtle">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-[26px]">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {title ? <h2 className="text-[15px] font-semibold text-ink">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}
