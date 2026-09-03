'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/field';

export function CopyField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-soft">{label}</span>
        <Button variant="ghost" size="sm" onClick={() => void copy()}>
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? 'Copié' : 'Copier'}
        </Button>
      </div>
      {multiline ? (
        <Textarea readOnly value={value} rows={3} className="font-mono text-[12.5px]" aria-label={label} />
      ) : (
        <Input readOnly value={value} className="font-mono text-[12.5px]" aria-label={label} />
      )}
    </div>
  );
}
