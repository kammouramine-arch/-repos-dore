'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
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
import { eurosToCents } from '@/lib/money';

export function LeadDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const estimated = String(formData.get('estimated') ?? '').trim();
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: String(formData.get('contactName') ?? ''),
          title: String(formData.get('title') ?? ''),
          description: String(formData.get('description') ?? '') || null,
          email: String(formData.get('email') ?? '') || null,
          phone: String(formData.get('phone') ?? '') || null,
          city: String(formData.get('city') ?? '') || null,
          estimatedCents: estimated ? eurosToCents(estimated) : null,
          source: 'MANUEL',
        }),
      });

      const payload = (await response.json()) as { error?: { message: string } };
      if (!response.ok) {
        setError(payload.error?.message ?? 'Création impossible.');
        return;
      }

      setOpen(false);
      toast({ title: 'Prospect créé' });
      router.refresh();
    } catch {
      setError('Connexion impossible. Réessayez.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>
        <Button>
          <Plus className="h-4 w-4" aria-hidden />
          Nouveau prospect
        </Button>
      </span>

      <DialogContent>
        <form action={submit}>
          <DialogHeader>
            <DialogTitle>Nouveau prospect</DialogTitle>
            <DialogDescription>
              Notez la demande maintenant : vous préparerez le devis juste après.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {error ? <Alert tone="danger">{error}</Alert> : null}

            <Field label="Nom du contact" htmlFor="contactName" required>
              <Input id="contactName" name="contactName" required maxLength={120} />
            </Field>

            <Field label="Objet de la demande" htmlFor="title" required>
              <Input
                id="title"
                name="title"
                required
                maxLength={160}
                placeholder="Remplacement chauffe-eau"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Téléphone" htmlFor="phone">
                <Input id="phone" name="phone" type="tel" />
              </Field>
              <Field label="Email" htmlFor="email">
                <Input id="email" name="email" type="email" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ville" htmlFor="city">
                <Input id="city" name="city" />
              </Field>
              <Field label="Budget estimé (€)" htmlFor="estimated" hint="facultatif">
                <Input id="estimated" name="estimated" inputMode="decimal" className="tabular" />
              </Field>
            </div>

            <Field label="Description du besoin" htmlFor="description">
              <Textarea id="description" name="description" rows={4} maxLength={4000} />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={pending}>
              Créer le prospect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
