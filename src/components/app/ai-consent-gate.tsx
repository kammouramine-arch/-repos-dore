'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';
import {
  AI_CONSENT_VERSION,
  aiConsentCopy,
  aiConsentGranted,
  aiConsentRequired,
  type AiConsentDTO,
  type AiConsentStatus,
  type AiProviderKind,
} from '@devisia/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Consentement explicite avant tout envoi au fournisseur d'IA, côté web.
 *
 * Même texte et même version que l'application iOS : `ensure()` n'appelle
 * jamais l'API d'IA lui-même, il répond seulement vrai après « Autoriser et
 * continuer ». Le serveur refuse de toute façon sans autorisation enregistrée.
 */
export interface AiConsentGate {
  granted: boolean;
  required: boolean;
  ensure: () => Promise<boolean>;
  revoke: () => Promise<void>;
  consent: AiConsentDTO;
}

async function putConsent(status: AiConsentStatus): Promise<AiConsentDTO> {
  const response = await fetch('/api/ai/consent', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, version: AI_CONSENT_VERSION }),
  });
  const payload = (await response.json()) as { data: AiConsentDTO } | { error: { message: string } };
  if (!response.ok || 'error' in payload) {
    throw new Error('error' in payload ? payload.error.message : 'Enregistrement impossible.');
  }
  return payload.data;
}

export function useAiConsentGate(initial: AiConsentDTO | null, provider: AiProviderKind): AiConsentGate & {
  dialog: React.ReactNode;
} {
  const [consent, setConsent] = React.useState<AiConsentDTO>(
    initial ?? { status: null, version: null, provider: null, decidedAt: null },
  );
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const pending = React.useRef<((allowed: boolean) => void) | null>(null);
  const required = aiConsentRequired(provider);
  const granted = aiConsentGranted(consent, provider);
  const copy = aiConsentCopy(provider === 'local' ? 'gemini' : provider, 'fr');

  const settle = React.useCallback((allowed: boolean) => {
    const resolve = pending.current;
    pending.current = null;
    setOpen(false);
    setBusy(false);
    setError(null);
    resolve?.(allowed);
  }, []);

  const ensure = React.useCallback((): Promise<boolean> => {
    if (granted) return Promise.resolve(true);
    if (pending.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      pending.current = resolve;
      setError(null);
      setOpen(true);
    });
  }, [granted]);

  async function allow() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setConsent(await putConsent('GRANTED'));
      settle(true);
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.');
    }
  }

  function decline() {
    if (busy) return;
    void putConsent('DECLINED').then(setConsent).catch(() => undefined);
    settle(false);
  }

  const revoke = React.useCallback(async () => {
    setConsent(await putConsent('REVOKED'));
  }, []);

  const dialog = (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) decline(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent-soft">
            <Sparkles className="h-5 w-5 text-accent" aria-hidden />
          </div>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.intro}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3 text-[13.5px] leading-relaxed text-ink">
          <div className="rounded-[10px] border border-line bg-surface p-3.5">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">Ce qui est transmis</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {copy.sent.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <p>{copy.purpose}</p>
          <p className="text-muted">{copy.withdraw}</p>
          {error ? <p className="text-danger" role="alert">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={decline} disabled={busy}>
            {copy.decline}
          </Button>
          <Button type="button" onClick={() => void allow()} disabled={busy}>
            {copy.allow}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { granted, required, ensure, revoke, consent, dialog };
}

/** Message affiché quand l'utilisateur a refusé : rien n'est parti, le reste fonctionne. */
export function aiConsentDeclinedMessage(provider: AiProviderKind): string {
  return aiConsentCopy(provider === 'local' ? 'gemini' : provider, 'fr').declined;
}
