import * as React from 'react';
import { cn } from '@/lib/utils';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.028em] text-ink sm:text-[34px]">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-[15.5px] leading-relaxed text-muted">{description}</p>
      ) : null}
    </div>
  );
}

export function FeatureCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'group rounded-[14px] border border-line bg-canvas p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-sm',
        className,
      )}
    >
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-surface transition-colors group-hover:border-accent-border group-hover:bg-accent-soft">
        <Icon className="h-[18px] w-[18px] text-ink-soft transition-colors group-hover:text-accent" aria-hidden />
      </div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}

export function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-b border-line py-5 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[15.5px] font-medium text-ink">
        {question}
        <span
          className="relative h-4 w-4 shrink-0 text-subtle transition-transform duration-200 group-open:rotate-45"
          aria-hidden
        >
          <span className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-current" />
          <span className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-current" />
        </span>
      </summary>
      <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-muted">{answer}</p>
    </details>
  );
}
