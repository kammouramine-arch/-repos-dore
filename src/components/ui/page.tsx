import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  actions,
  className,
  eyebrow,
  back,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  eyebrow?: string;
  /** Lien de retour discret au-dessus du titre. */
  back?: { href: string; label: string };
}) {
  return (
    <header className={cn('space-y-3', className)}>
      {back ? (
        <Link href={back.href} className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-subtle">{eyebrow}</p>
          ) : null}
          <h1 className="text-[22px] font-bold tracking-[-0.025em] text-ink sm:text-[26px]">{title}</h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div> : null}
      </div>
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
