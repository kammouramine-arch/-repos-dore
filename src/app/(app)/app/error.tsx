'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/context';

/**
 * Erreur de page : un état lisible, jamais une trace brute. La coque reste
 * en place, l'utilisateur peut réessayer ou naviguer ailleurs.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  React.useEffect(() => {
    console.error('[app] page_error', error.digest ?? 'no-digest');
  }, [error]);
  return (
    <div className="mx-auto max-w-md rounded-[16px] border border-line bg-canvas px-6 py-12 text-center shadow-card">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[12px] bg-danger-soft">
        <RefreshCw className="h-5 w-5 text-danger" aria-hidden />
      </div>
      <h1 className="mt-4 text-[17px] font-semibold text-ink">{t.errors.pageTitle}</h1>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{t.errors.pageBody}</p>
      {error.digest ? <p className="mt-2 text-[11.5px] text-subtle tabular">{t.errors.reference} {error.digest}</p> : null}
      <Button className="mt-5" onClick={reset}>
        {t.common.retry}
      </Button>
    </div>
  );
}
