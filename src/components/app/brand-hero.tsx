import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Surface de marque en tête d'écran : le dégradé bleu → blanc de l'accueil
 * iOS, posé sous l'en-tête. Le contenu suivant remonte dessus (`overlap`) pour
 * que les premières cartes reposent sur le fondu, comme sur iPhone.
 */
export function BrandHero({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'brand-surface relative -mx-4 -mt-5 rounded-b-[28px] px-4 pb-24 pt-7 text-white sm:-mx-6 sm:px-6 lg:-mx-8 lg:-mt-7 lg:px-8 lg:pt-9',
        className,
      )}
    >
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-white/80">{eyebrow}</p>
            ) : null}
            <h1 className="mt-1.5 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[34px]">{title}</h1>
            {subtitle ? (
              <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-white/85 sm:text-[15px]">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Contenu qui remonte sur la surface de marque. */
export function HeroOverlap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('relative -mt-16 space-y-6', className)}>{children}</div>;
}
