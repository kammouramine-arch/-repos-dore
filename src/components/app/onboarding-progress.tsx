import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Progression de la mise en route.
 *
 * L'objectif est unique : arriver au premier devis. Les étapes sont donc
 * courtes et l'utilisateur voit d'emblée qu'il n'y en a que trois.
 */
const STEPS = [
  { label: 'Votre entreprise', hint: 'Identité et TVA' },
  { label: 'Votre catalogue', hint: 'Vos prix' },
  { label: 'Premier devis', hint: 'En une minute' },
];

export function OnboardingProgress({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Progression de la mise en route">
      <ol className="flex items-start gap-2">
        {STEPS.map((step, index) => {
          const position = index + 1;
          const done = position < current;
          const active = position === current;

          return (
            <li key={step.label} className="flex-1">
              <div
                className={cn(
                  'h-1 rounded-full transition-colors',
                  done || active ? 'bg-accent' : 'bg-line',
                )}
                aria-hidden
              />
              <div className="mt-2 flex items-center gap-1.5">
                {done ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                ) : (
                  <span
                    className={cn(
                      'text-[11px] font-semibold tabular',
                      active ? 'text-accent' : 'text-subtle',
                    )}
                  >
                    {position}
                  </span>
                )}
                <p
                  className={cn(
                    'truncate text-[12.5px] font-medium',
                    active ? 'text-ink' : done ? 'text-muted' : 'text-subtle',
                  )}
                >
                  {step.label}
                </p>
              </div>
              <p className="mt-0.5 hidden text-[11.5px] text-subtle sm:block">{step.hint}</p>
              <span className="sr-only">
                {done ? 'Étape terminée' : active ? 'Étape en cours' : 'Étape à venir'}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
