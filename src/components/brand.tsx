import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Marque DEVISIA.
 * Le monogramme reprend un document dont l'angle se transforme en signal :
 * le devis qui part et qui revient signé.
 */
export function LogoMark({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn('h-7 w-7', className)} aria-hidden {...props}>
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M10 9.5h7.6c3.9 0 6.4 2.6 6.4 6.5s-2.5 6.5-6.4 6.5H10V9.5Z"
        fill="white"
        fillOpacity="0.16"
      />
      <path
        d="M10.75 9.75h6.6c3.6 0 5.9 2.5 5.9 6.25s-2.3 6.25-5.9 6.25h-6.6"
        stroke="white"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.5 16h6.2" stroke="white" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({
  className,
  compact = false,
  inverted = false,
}: {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={cn('h-7 w-7', inverted ? 'text-white' : 'text-accent')} />
      {!compact ? (
        <span
          className={cn(
            'text-[17px] font-semibold tracking-[-0.03em]',
            inverted ? 'text-white' : 'text-ink',
          )}
        >
          DEVISIA
        </span>
      ) : null}
    </span>
  );
}

export const BRAND = {
  name: 'DEVISIA',
  signature: "L'IA qui transforme votre travail en devis.",
  positioning: 'Ne perdez plus un client faute de temps.',
  promise: "Vous travaillez. DEVISIA s'occupe de l'administratif.",
  recovery: 'Récupérez les devis que vous êtes en train de perdre.',
} as const;
