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

export function CustomerDialog({
  trigger,
  onCreated,
}: {
  trigger?: React.ReactNode;
  onCreated?: (customer: { id: string }) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: String(formData.get('firstName') ?? '') || null,
          lastName: String(formData.get('lastName') ?? '') || null,
          companyName: String(formData.get('companyName') ?? '') || null,
          email: String(formData.get('email') ?? '') || null,
          phone: String(formData.get('phone') ?? '') || null,
          addressLine1: String(formData.get('addressLine1') ?? '') || null,
          postalCode: String(formData.get('postalCode') ?? '') || null,
          city: String(formData.get('city') ?? '') || null,
          notes: String(formData.get('notes') ?? '') || null,
        }),
      });

      const payload = (await response.json()) as
        | { data: { id: string } }
        | { error: { message: string } };

      if (!response.ok || 'error' in payload) {
        setError('error' in payload ? payload.error.message : 'Création impossible.');
        return;
      }

      setOpen(false);
      toast({ title: 'Client créé' });
      onCreated?.(payload.data);
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
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau client
          </Button>
        )}
      </span>

      <DialogContent>
        <form action={submit}>
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
            <DialogDescription>
              Un nom ou une raison sociale suffit pour commencer.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {error ? <Alert tone="danger">{error}</Alert> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom" htmlFor="firstName">
                <Input id="firstName" name="firstName" autoComplete="given-name" />
              </Field>
              <Field label="Nom" htmlFor="lastName">
                <Input id="lastName" name="lastName" autoComplete="family-name" />
              </Field>
            </div>

            <Field label="Entreprise" htmlFor="companyName" hint="facultatif">
              <Input id="companyName" name="companyName" autoComplete="organization" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" htmlFor="email" hint="pour l’envoi des devis">
                <Input id="email" name="email" type="email" autoComplete="email" />
              </Field>
              <Field label="Téléphone" htmlFor="phone">
                <Input id="phone" name="phone" type="tel" autoComplete="tel" />
              </Field>
            </div>

            <Field label="Adresse" htmlFor="addressLine1">
              <Input id="addressLine1" name="addressLine1" autoComplete="address-line1" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <Field label="Code postal" htmlFor="postalCode">
                <Input id="postalCode" name="postalCode" autoComplete="postal-code" />
              </Field>
              <Field label="Ville" htmlFor="city">
                <Input id="city" name="city" autoComplete="address-level2" />
              </Field>
            </div>

            <Field label="Notes" htmlFor="notes" hint="internes">
              <Textarea id="notes" name="notes" rows={2} maxLength={4000} />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={pending}>
              Créer le client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
