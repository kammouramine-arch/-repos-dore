'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Send } from 'lucide-react';
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
import { Field, Input, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { formatCents } from '@/lib/money';
import { FOLLOW_UP_TONE_LABELS, type FollowUpTone } from '@devisia/shared';
import { Badge } from '@/components/ui/badge';

interface QuoteSummary {
  id: string;
  number: string;
  title: string;
  totalCents: number;
  customerName: string;
  customerEmail: string | null;
  daysWaiting: number;
  viewCount: number;
  lastFollowUpAt: string | null;
  suggestion: {
    situation: string;
    tone: FollowUpTone;
    reason: string;
    recommended: boolean;
  };
}

export function FollowUpItem({ quote }: { quote: QuoteSummary }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<{ objet: string; message: string } | null>(null);

  async function prepare(tone: FollowUpTone = quote.suggestion.tone) {
    setOpen(true);
    setDraft(null);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quote.id}/relance?ton=${tone}`);
      const payload = (await response.json()) as
        | { data: { objet: string; message: string } }
        | { error: { message: string } };
      if (!response.ok || 'error' in payload) {
        setError('error' in payload ? payload.error.message : 'Préparation impossible.');
        return;
      }
      setDraft(payload.data);
    } catch {
      setError('Préparation impossible.');
    }
  }

  async function send(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quote.id}/relance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: String(formData.get('subject') ?? ''),
          body: String(formData.get('body') ?? ''),
        }),
      });
      const payload = (await response.json()) as { error?: { message: string } };
      if (!response.ok) {
        setError(payload.error?.message ?? 'Envoi impossible.');
        return;
      }
      setOpen(false);
      toast({ title: 'Relance envoyée', description: `${quote.customerName} a reçu votre message.` });
      router.refresh();
    } catch {
      setError('Connexion impossible.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line p-3.5 transition-colors hover:border-line-strong">
        <div className="min-w-0 flex-1">
          <Link href={`/app/devis/${quote.id}`} className="text-[14px] font-medium text-ink hover:text-accent">
            {quote.customerName}
          </Link>
          <p className="mt-0.5 truncate text-[13px] text-muted">{quote.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-subtle tabular">
            <span>{quote.number}</span>
            <span>·</span>
            <span>
              {quote.daysWaiting} jour{quote.daysWaiting > 1 ? 's' : ''} sans réponse
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              {quote.viewCount > 0 ? (
                <>
                  <Eye className="h-3 w-3" aria-hidden />
                  Consulté {quote.viewCount} fois
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3" aria-hidden />
                  Jamais ouvert
                </>
              )}
            </span>
            {quote.lastFollowUpAt ? (
              <>
                <span>·</span>
                <span>Déjà relancé</span>
              </>
            ) : null}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
            <Badge tone={quote.suggestion.recommended ? 'accent' : 'neutral'}>
              Ton {FOLLOW_UP_TONE_LABELS[quote.suggestion.tone].toLowerCase()}
            </Badge>
            {quote.suggestion.reason}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[15px] font-semibold text-ink tabular">
            {formatCents(quote.totalCents)}
          </span>
          <Button
            size="sm"
            variant={quote.suggestion.recommended ? 'primary' : 'secondary'}
            onClick={() => void prepare()}
            disabled={!quote.customerEmail}
          >
            <Send className="h-3.5 w-3.5" aria-hidden />
            Relancer
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <form action={send}>
            <DialogHeader>
              <DialogTitle>Relancer {quote.customerName}</DialogTitle>
              <DialogDescription>
                Message préparé à partir des données du devis. Modifiez-le avant l’envoi.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-4">
              {error ? <Alert tone="danger">{error}</Alert> : null}
              {!draft && !error ? (
                <p className="py-6 text-center text-[13.5px] text-subtle">Préparation du message…</p>
              ) : null}

              {draft ? (
                <>
                  <Field label="Objet" htmlFor={`subject-${quote.id}`} required>
                    <Input id={`subject-${quote.id}`} name="subject" defaultValue={draft.objet} required />
                  </Field>
                  <Field label="Message" htmlFor={`body-${quote.id}`} required>
                    <Textarea id={`body-${quote.id}`} name="body" defaultValue={draft.message} rows={9} required />
                  </Field>
                </>
              ) : null}
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" loading={pending} disabled={!draft}>
                Envoyer la relance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
