import * as React from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from './motion';
import { FaqItem } from './faq-item';

export { FaqItem };

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
  tone = 'light',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'center' | 'left';
  className?: string;
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <Reveal className={cn('max-w-2xl', align === 'center' ? 'mx-auto text-center' : 'text-left', className)}>
      {eyebrow ? (
        <p className={cn('mb-3 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em]', dark ? 'text-accent-bright' : 'text-accent')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', dark ? 'bg-accent-bright' : 'bg-accent')} aria-hidden />
          {eyebrow}
        </p>
      ) : null}
      <h2 className={cn('text-[28px] font-bold leading-[1.12] tracking-[-0.03em] text-balance sm:text-[38px]', dark ? 'text-white' : 'text-ink')}>{title}</h2>
      {description ? (
        <p className={cn('mt-4 text-[16px] leading-relaxed text-pretty', dark ? 'text-white/70' : 'text-muted')}>{description}</p>
      ) : null}
    </Reveal>
  );
}

/**
 * Carte de fonctionnalité. Avec `visual`, l'extrait du produit prend la
 * place de l'icône : le site vend le logiciel en le montrant.
 */
export function FeatureCard({
  icon: Icon,
  title,
  children,
  className,
  visual,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
  visual?: React.ReactNode;
  delay?: number;
}) {
  return (
    <Reveal
      as="article"
      delay={delay}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[18px] border border-line bg-canvas p-5 shadow-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-accent-border hover:shadow-md sm:p-6',
        className,
      )}
    >
      {visual ? <div className="mb-5">{visual}</div> : null}
      <div className="mt-auto">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-line bg-surface text-ink-soft transition-colors group-hover:border-accent-border group-hover:bg-accent-soft group-hover:text-accent">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <h3 className="text-[15.5px] font-semibold text-ink">{title}</h3>
        </div>
        <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{children}</p>
      </div>
    </Reveal>
  );
}
