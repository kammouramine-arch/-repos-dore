'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Send, Sparkles } from 'lucide-react';
import type { QuoteStatus } from '@prisma/client';
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

export function QuoteActions({
  quoteId,
  status,
  publicUrl,
  customerEmail,
  customerName,
  quoteNumber,
}: {
  quoteId: string;
  status: QuoteStatus;
  publicUrl: string;
  customerEmail: string | null;
  customerName: string;
  quoteNumber: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [sendOpen, setSendOpen] = React.useState(false);
  const [followUpOpen, setFollowUpOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [draft, setDraft] = React.useState<{ objet: string; message: string; degraded: boolean } | null>(
    null,
  );

  const sendable = ['BROUILLON', 'ENVOYE', 'CONSULTE', 'MODIFICATION_DEMANDEE'].includes(status);
  const followable = ['ENVOYE', 'CONSULTE', 'MODIFICATION_DEMANDEE'].includes(status);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copie impossible', tone: 'error' });
    }
  }

  async function send(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quoteId}/envoi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: String(formData.get('message') ?? '') || null,
          to: String(formData.get('to') ?? '') || null,
        }),
      });
      const payload = (await response.json()) as
        | { data: { recipient: string } }
        | { error: { message: string } };

      if (!response.ok || 'error' in payload) {
        setError('error' in payload ? payload.error.message : 'Envoi impossible.');
        return;
      }

      setSendOpen(false);
      toast({
        title: 'Devis envoyé',
        description: `${quoteNumber} a été envoyé à ${payload.data.recipient}.`,
      });
      router.refresh();
    } catch {
      setError('Connexion impossible. Réessayez dans un instant.');
    } finally {
      setPending(false);
    }
  }

  async function openFollowUp() {
    setFollowUpOpen(true);
    setDraft(null);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quoteId}/relance`);
      const payload = (await response.json()) as
        | { data: { objet: string; message: string; degraded: boolean } }
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

  async function sendFollowUp(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quoteId}/relance`, {
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
      setFollowUpOpen(false);
      toast({ title: 'Relance envoyée', description: `${customerName} a reçu votre message.` });
      router.refresh();
    } catch {
      setError('Connexion impossible.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => void copyLink()}>
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied ? 'Copié' : 'Copier le lien'}
      </Button>

      {followable ? (
        <Button variant="secondary" size="sm" onClick={() => void openFollowUp()}>
          <Sparkles className="h-4 w-4" aria-hidden />
          Relancer
        </Button>
      ) : null}

      {sendable ? (
        <Button size="sm" onClick={() => setSendOpen(true)}>
          <Send className="h-4 w-4" aria-hidden />
          {status === 'BROUILLON' ? 'Envoyer le devis' : 'Renvoyer'}
        </Button>
      ) : null}

      {/* Envoi */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent size="sm">
          <form action={send}>
            <DialogHeader>
              <DialogTitle>Envoyer le devis {quoteNumber}</DialogTitle>
              <DialogDescription>
                Le client reçoit le PDF en pièce jointe et un lien pour le consulter à tout moment.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-4">
              {error ? <Alert tone="danger">{error}</Alert> : null}

              <Field label="Destinataire" htmlFor="to" required>
                <Input
                  id="to"
                  name="to"
                  type="email"
                  defaultValue={customerEmail ?? ''}
                  required
                  placeholder="client@exemple.fr"
                />
              </Field>

              <Field label="Message d’accompagnement" htmlFor="message" hint="facultatif">
                <Textarea
                  id="message"
                  name="message"
                  rows={4}
                  maxLength={2000}
                  defaultValue={`Bonjour ${customerName},\n\nVeuillez trouver ci-joint le devis correspondant à notre échange. Je reste à votre disposition pour toute question.`}
                />
              </Field>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setSendOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" loading={pending}>
                <Send className="h-4 w-4" aria-hidden />
                Envoyer maintenant
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Relance */}
      <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
        <DialogContent size="sm">
          <form action={sendFollowUp}>
            <DialogHeader>
              <DialogTitle>Relancer {customerName}</DialogTitle>
              <DialogDescription>
                Message préparé pour vous. Modifiez-le librement avant l’envoi.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-4">
              {error ? <Alert tone="danger">{error}</Alert> : null}
              {!draft && !error ? (
                <p className="py-6 text-center text-[13.5px] text-subtle">Préparation du message…</p>
              ) : null}

              {draft ? (
                <>
                  <Field label="Objet" htmlFor="subject" required>
                    <Input id="subject" name="subject" defaultValue={draft.objet} required maxLength={160} />
                  </Field>
                  <Field label="Message" htmlFor="body" required>
                    <Textarea id="body" name="body" defaultValue={draft.message} rows={9} required maxLength={4000} />
                  </Field>
                  {draft.degraded ? (
                    <p className="text-[12.5px] text-subtle">
                      Message issu d’un modèle professionnel local.
                    </p>
                  ) : null}
                </>
              ) : null}
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setFollowUpOpen(false)}>
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
