import * as React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  trend,
  emphasis = false,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Variation en pourcentage par rapport à la période précédente. */
  trend?: number | null;
  emphasis?: boolean;
  className?: string;
}) {
  const hasTrend = trend != null && Number.isFinite(trend) && trend !== 0;
  const positive = (trend ?? 0) > 0;

  return (
    <div
      className={cn(
        'rounded-[13px] border bg-canvas p-4 transition-shadow',
        emphasis ? 'border-accent-border bg-accent-soft/40' : 'border-line',
        className,
      )}
    >
      <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-subtle">{label}</p>
      <p
        className={cn(
          'mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.028em] tabular',
          emphasis ? 'text-accent-hover' : 'text-ink',
        )}
      >
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {hasTrend ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[12px] font-medium tabular',
              positive ? 'text-success' : 'text-danger',
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
            )}
            {positive ? '+' : ''}
            {Math.round(trend!)} %
          </span>
        ) : null}
        {hint ? (
          <span className={cn('text-[12px] text-subtle', hasTrend && 'hidden sm:inline')}>{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
