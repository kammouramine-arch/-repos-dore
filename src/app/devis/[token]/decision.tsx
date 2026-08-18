'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Decision = 'ACCEPTE' | 'REFUSE' | 'MODIFICATION_DEMANDEE';

const COPY: Record<Decision, { title: string; description: string; cta: string }> = {
  ACCEPTE: {
    title: 'Accepter le devis',
    description:
      'Votre acceptation vaut bon pour accord. L’entreprise en est informée immédiatement et vous recontactera pour planifier l’intervention.',
    cta: 'Je valide ce devis',
  },
  REFUSE: {
    title: 'Refuser le devis',
    description: 'Vous pouvez indiquer la raison de votre refus : cela aide l’entreprise à s’ajuster.',
    cta: 'Confirmer le refus',
  },
  MODIFICATION_DEMANDEE: {
    title: 'Demander une modification',
    description: 'Précisez ce que vous souhaitez modifier : quantités, prestations, planning, budget.',
    cta: 'Envoyer ma demande',
  },
};

export function QuoteDecision({
  token,
  brandColor,
  companyName,
}: {
  token: string;
  brandColor: string;
  companyName: string;
}) {
  const router = useRouter();
  const [decision, setDecision] = React.useState<Decision | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(formData: FormData) {
    if (!decision) return;
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/public/devis/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          message: String(formData.get('message') ?? '') || undefined,
          signatureName: String(formData.get('signatureName') ?? '') || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(payload?.error?.message ?? "Votre réponse n'a pas pu être enregistrée.");
        return;
      }

      setDecision(null);
      router.refresh();
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau et réessayez.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="rounded-[16px] border border-line bg-canvas p-5 shadow-sm sm:p-6">
        <p className="text-[15px] font-semibold text-ink">Votre réponse</p>
        <p className="mt-1 text-[13.5px] text-muted">
          {companyName} est prévenu immédiatement de votre décision.
        </p>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Button
            size="lg"
            className="flex-1"
            style={{ background: brandColor }}
            onClick={() => setDecision('ACCEPTE')}
          >
            <Check className="h-4 w-4" aria-hidden />
            Accepter le devis
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="flex-1"
            onClick={() => setDecision('MODIFICATION_DEMANDEE')}
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
            Demander une modification
          </Button>
          <Button size="lg" variant="ghost" onClick={() => setDecision('REFUSE')}>
            <X className="h-4 w-4" aria-hidden />
            Refuser
          </Button>
        </div>
      </div>

      <Dialog open={decision != null} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent size="sm">
          {decision ? (
            <form action={submit}>
              <DialogHeader>
                <DialogTitle>{COPY[decision].title}</DialogTitle>
                <DialogDescription>{COPY[decision].description}</DialogDescription>
              </DialogHeader>

              <DialogBody className="space-y-4">
                {error ? (
                  <p className="rounded-[10px] border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger" role="alert">
                    {error}
                  </p>
                ) : null}

                {decision === 'ACCEPTE' ? (
                  <Field label="Votre nom" htmlFor="signatureName" required>
                    <Input
                      id="signatureName"
                      name="signatureName"
                      required
                      maxLength={120}
                      placeholder="Prénom et nom"
                      autoComplete="name"
                    />
                  </Field>
                ) : null}

                <Field
                  label={decision === 'ACCEPTE' ? 'Message (facultatif)' : 'Votre message'}
                  htmlFor="message"
                  required={decision !== 'ACCEPTE'}
                >
                  <Textarea
                    id="message"
                    name="message"
                    required={decision !== 'ACCEPTE'}
                    maxLength={2000}
                    rows={4}
                    placeholder={
                      decision === 'MODIFICATION_DEMANDEE'
                        ? 'Ce que vous souhaitez modifier…'
                        : 'Votre message…'
                    }
                  />
                </Field>
              </DialogBody>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDecision(null)}>
                  Annuler
                </Button>
                <Button type="submit" loading={pending}>
                  {COPY[decision].cta}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
