'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { AI_PROVIDER_NAMES, aiConsentCopy, type AiConsentDTO, type AiProviderKind } from '@devisia/shared';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAiConsentGate } from '@/components/app/ai-consent-gate';

/** Paramètres → Confidentialité et IA : état, destinataire, retrait. */
export function AiConsentSettings({ initial, provider }: { initial: AiConsentDTO | null; provider: AiProviderKind }) {
  const consent = useAiConsentGate(initial, provider);
  const copy = aiConsentCopy(provider === 'local' ? 'gemini' : provider, 'fr');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const decidedAt = consent.consent.decidedAt
    ? new Date(consent.consent.decidedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  async function act(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Action impossible pour le moment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      {consent.dialog}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-[18px] w-[18px] shrink-0 text-subtle" aria-hidden />
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-medium text-ink">Intelligence artificielle</p>
              {consent.required ? (
                <Badge tone={consent.granted ? 'success' : 'neutral'}>{consent.granted ? copy.stateGranted : copy.stateNotGranted}</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Destinataire : {AI_PROVIDER_NAMES[provider === 'local' ? 'gemini' : provider].fr}. {copy.intro}
            </p>
            {decidedAt ? <p className="mt-1 text-[12.5px] text-muted">Décision du {decidedAt}.</p> : null}
            <p className="mt-1 text-[12.5px] text-muted">
              Détails dans la{' '}
              <Link href="/confidentialite" className="font-medium underline">politique de confidentialité</Link>.
            </p>
            {error ? <p className="mt-2 text-[12.5px] text-danger" role="alert">{error}</p> : null}
          </div>
        </div>
        {!consent.required ? null : consent.granted ? (
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void act(consent.revoke)}>
            Retirer mon autorisation
          </Button>
        ) : (
          <Button type="button" disabled={busy} onClick={() => void act(consent.ensure)}>
            Autoriser l’IA
          </Button>
        )}
      </div>
    </Card>
  );
}
