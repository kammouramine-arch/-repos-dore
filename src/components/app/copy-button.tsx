'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Copie une valeur dans le presse-papiers avec une confirmation visuelle brève. */
export function CopyButton({ value, label, copiedLabel, className }: { value: string; label: string; copiedLabel: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Le navigateur refuse l'accès : la valeur reste sélectionnable à côté.
    }
  }
  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] border border-line bg-canvas px-2.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:bg-surface',
        copied && 'border-success/30 text-success',
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {copied ? copiedLabel : label}
    </button>
  );
}
