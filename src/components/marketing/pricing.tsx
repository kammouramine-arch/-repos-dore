import Link from 'next/link';
import { Check } from 'lucide-react';
import { PLANS, PLAN_ORDER, TRIAL_DAYS } from '@/lib/billing/plans';
import { formatCents } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PricingGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {PLAN_ORDER.map((id) => {
        const plan = PLANS[id];
        return (
          <div
            key={plan.id}
            className={cn(
              'relative flex flex-col rounded-[16px] border bg-canvas p-6 transition-shadow',
              plan.recommended
                ? 'border-accent shadow-md ring-1 ring-accent/15'
                : 'border-line shadow-xs hover:shadow-sm',
            )}
          >
            {plan.recommended ? (
              <span className="absolute -top-3 left-6 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                Le plus choisi
              </span>
            ) : null}

            <h3 className="text-[17px] font-semibold text-ink">{plan.name}</h3>
            <p className="mt-1.5 min-h-[40px] text-[13px] leading-relaxed text-muted">{plan.tagline}</p>

            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="text-[34px] font-semibold tracking-[-0.03em] tabular">
                {formatCents(plan.monthlyPriceCents, { compact: true })}
              </span>
              <span className="text-[13px] text-muted">/ mois HT</span>
            </p>
            <p className="mt-1 text-[12.5px] text-subtle">
              {TRIAL_DAYS} jours d’essai gratuit, sans carte bancaire.
            </p>

            <ul className="mt-6 flex-1 space-y-2.5">
              {plan.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-soft">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>

            {!compact ? (
              <Button
                asChild
                className="mt-6"
                variant={plan.recommended ? 'primary' : 'secondary'}
                size="lg"
              >
                <Link href={`/inscription?formule=${plan.id.toLowerCase()}`}>
                  Commencer mon essai gratuit de {TRIAL_DAYS} jours
                </Link>
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
