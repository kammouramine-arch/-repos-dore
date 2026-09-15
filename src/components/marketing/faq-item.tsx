'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Question fréquente : un bouton accessible et un panneau dont la hauteur
 * s'anime en douceur (grid-template-rows 0fr → 1fr). Une seule question
 * ouverte n'est pas imposé : chacun lit à son rythme.
 */
export function FaqItem({ question, answer, defaultOpen = false }: { question: string; answer: string; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const id = React.useId();
  return (
    <div className={cn('border-b border-line transition-colors', open && 'bg-canvas/60')}>
      <h3>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-button`}
          className="group flex w-full cursor-pointer items-center justify-between gap-6 rounded-[10px] px-2 py-5 text-left text-[16px] font-medium text-ink transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          {question}
          <span
            className={cn(
              'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-subtle transition-all duration-300 group-hover:border-accent-border group-hover:text-accent',
              open && 'rotate-45 border-accent-border bg-accent-soft text-accent',
            )}
            aria-hidden
          >
            <span className="absolute h-px w-3 bg-current" />
            <span className="absolute h-3 w-px bg-current" />
          </span>
        </button>
      </h3>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-button`}
        className="grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out-soft)]"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className={cn('max-w-3xl px-2 pb-5 text-[14.5px] leading-relaxed text-ink-soft transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}>{answer}</p>
        </div>
      </div>
    </div>
  );
}
