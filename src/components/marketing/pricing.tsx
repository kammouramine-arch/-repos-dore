import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { PLANS, PLAN_ORDER, TRIAL_DAYS, effectiveMonthlyPriceCents} from '@/lib/billing/plans';
import { formatCents } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Reveal } from './motion';

/**
 * Grille des formules. Les prix et les inclusions viennent du paquet
 * partagé : rien n'est écrit ici. La formule recommandée est posée un cran
 * au-dessus, avec la lumière de marque derrière elle.
 */
export function PricingGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
      {PLAN_ORDER.map((id, index) => {
        const plan = PLANS[id];
        return (
          <Reveal
            key={plan.id}
            delay={index * 90}
            className={cn('relative', plan.recommended && 'lg:-my-3')}
          >
            {plan.recommended ? (
              <div className="pointer-events-none absolute -inset-3 rounded-[28px] bg-[radial-gradient(closest-side,rgba(47,82,232,0.16),rgba(47,82,232,0))] blur-xl" aria-hidden />
            ) : null}
            <div
              className={cn(
                'relative flex h-full flex-col rounded-[20px] border bg-canvas p-6 transition-[transform,box-shadow] duration-300 sm:p-7',
                plan.recommended
                  ? 'border-accent/60 shadow-[0_24px_60px_-28px_rgba(47,82,232,0.45)] ring-1 ring-accent/20'
                  : 'border-line shadow-card hover:-translate-y-0.5 hover:shadow-md',
              )}
            >
              {plan.recommended ? (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white shadow-glow">
                  Recommandée
                </span>
              ) : null}

              <h3 className="text-[18px] font-semibold text-ink">{plan.name}</h3>
              <p className="mt-1.5 min-h-[42px] text-[13.5px] leading-relaxed text-muted">{plan.tagline}</p>

              <p className="mt-5 flex items-baseline gap-1.5">
                <span className={cn('text-[40px] font-bold leading-none tracking-[-0.035em] tabular', plan.recommended ? 'text-accent-hover' : 'text-ink')}>
                  {formatCents(effectiveMonthlyPriceCents(plan.id), { compact: true })}
                </span>
                <span className="text-[13px] text-muted">HT / mois</span>
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-subtle">
                {TRIAL_DAYS} jours d’essai sur le web, sans carte bancaire. Sur iPhone : offre Apple selon éligibilité, renouvellement automatique sauf annulation.
              </p>

              <ul className="mt-6 flex-1 space-y-2.5 border-t border-line pt-5">
                {plan.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-soft">
                    <span className={cn('mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full', plan.recommended ? 'bg-accent text-white' : 'bg-accent-soft text-accent')}>
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              {!compact ? (
                <Button asChild className={cn('group mt-7', plan.recommended && 'shadow-glow')} variant={plan.recommended ? 'primary' : 'secondary'} size="lg">
                  <Link href={`/inscription?formule=${plan.id.toLowerCase()}`}>
                    Commencer l’essai gratuit
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </Button>
              ) : null}
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
