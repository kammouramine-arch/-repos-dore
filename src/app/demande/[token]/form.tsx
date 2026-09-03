'use client';

import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';

export function LeadRequestForm({
  token,
  brandColor,
  companyName,
}: {
  token: string;
  brandColor: string;
  companyName: string;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/prospects/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: String(formData.get('contactName') ?? ''),
          email: String(formData.get('email') ?? '') || undefined,
          phone: String(formData.get('phone') ?? '') || undefined,
          addressLine1: String(formData.get('addressLine1') ?? '') || undefined,
          postalCode: String(formData.get('postalCode') ?? '') || undefined,
          city: String(formData.get('city') ?? '') || undefined,
          description: String(formData.get('description') ?? ''),
        }),
      });

      const payload = (await response.json()) as { error?: { message: string } };
      if (!response.ok) {
        setError(payload.error?.message ?? "Votre demande n'a pas pu être envoyée.");
        return;
      }
      setSent(true);
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau et réessayez.');
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-[14px] border border-success/25 bg-success-soft px-5 py-8 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-success" aria-hidden />
        <p className="mt-4 text-[16px] font-semibold text-ink">Demande envoyée</p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          {companyName} a bien reçu votre demande et vous recontactera rapidement.
        </p>
      </div>
    );
  }

  return (
    <form action={submit} className="space-y-4" noValidate>
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Field label="Votre nom" htmlFor="contactName" required>
        <Input id="contactName" name="contactName" required maxLength={120} autoComplete="name" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Téléphone" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" />
        </Field>
      </div>

      <Field label="Adresse du chantier" htmlFor="addressLine1">
        <Input id="addressLine1" name="addressLine1" autoComplete="address-line1" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[130px_1fr]">
        <Field label="Code postal" htmlFor="postalCode">
          <Input id="postalCode" name="postalCode" autoComplete="postal-code" />
        </Field>
        <Field label="Ville" htmlFor="city">
          <Input id="city" name="city" autoComplete="address-level2" />
        </Field>
      </div>

      <Field label="Décrivez votre besoin" htmlFor="description" required>
        <Textarea
          id="description"
          name="description"
          required
          rows={5}
          maxLength={4000}
          placeholder="Ex. : fuite sous l'évier de la cuisine, à réparer rapidement."
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={pending} style={{ background: brandColor }}>
        Envoyer ma demande
      </Button>
    </form>
  );
}
