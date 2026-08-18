'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { CheckCircle2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VAT_RATES } from '@/lib/money';
import type { SettingsState } from '@/app/(app)/app/parametres/actions';

export interface BusinessProfileValue {
  legalName: string;
  ownerName: string;
  email: string;
  phone: string;
  website: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  siret: string;
  vatNumber: string;
  insurance: string;
  trade: string;
  vatStatus: string;
  defaultVatRate: number;
  defaultHourlyEuros: number;
  paymentTerms: string;
  quoteValidityDays: number;
  quoteTerms: string;
  quoteFooter: string;
  brandColor: string;
  logoUrl: string | null;
}

export const TRADES = [
  { value: 'PLOMBIER', label: 'Plomberie' },
  { value: 'ELECTRICIEN', label: 'Électricité' },
  { value: 'CHAUFFAGISTE', label: 'Chauffage' },
  { value: 'CLIMATICIEN', label: 'Climatisation' },
  { value: 'PEINTRE', label: 'Peinture' },
  { value: 'COUVREUR', label: 'Couverture' },
  { value: 'MENUISIER', label: 'Menuiserie' },
  { value: 'MACON', label: 'Maçonnerie' },
  { value: 'PAYSAGISTE', label: 'Paysage' },
  { value: 'RENOVATION', label: 'Rénovation' },
  { value: 'NETTOYAGE', label: 'Nettoyage' },
  { value: 'DEPANNAGE', label: 'Dépannage' },
  { value: 'AUTRE', label: 'Autre' },
];

const VAT_STATUSES = [
  { value: 'ASSUJETTI', label: 'Assujetti à la TVA' },
  { value: 'FRANCHISE_EN_BASE', label: 'Franchise en base (art. 293 B)' },
  { value: 'AUTOLIQUIDATION', label: 'Autoliquidation' },
];

/**
 * Formulaire de profil d'entreprise, partagé entre l'onboarding et les
 * paramètres pour garantir une seule source de vérité.
 */
export function BusinessProfileForm({
  value,
  action,
  submitLabel = 'Enregistrer',
  compact = false,
}: {
  value: BusinessProfileValue;
  action: (state: SettingsState, formData: FormData) => Promise<SettingsState>;
  submitLabel?: string;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {} as SettingsState);
  const [logo, setLogo] = React.useState<{ id: string; url: string } | null>(
    value.logoUrl ? { id: '', url: value.logoUrl } : null,
  );
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function uploadLogo(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('kind', 'LOGO');
    try {
      const response = await fetch('/api/files', { method: 'POST', body: form });
      const payload = (await response.json()) as
        | { data: { id: string; url: string } }
        | { error: { message: string } };
      if (response.ok && 'data' in payload) setLogo(payload.data);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? (
        <Alert tone="success" icon={CheckCircle2}>
          {state.success}
        </Alert>
      ) : null}

      {logo?.id ? <input type="hidden" name="logoFileId" value={logo.id} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Identité de l’entreprise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[12px] border border-line bg-surface">
              {logo?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo.url} alt="Logo de l'entreprise" className="h-full w-full object-contain" />
              ) : (
                <span className="text-[11px] text-subtle">Logo</span>
              )}
            </div>
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4" aria-hidden />
                {logo?.url ? 'Changer le logo' : 'Ajouter un logo'}
              </Button>
              <p className="mt-1.5 text-[12px] text-subtle">PNG ou JPG, 12 Mo maximum.</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadLogo(file);
                event.target.value = '';
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Raison sociale"
              htmlFor="legalName"
              required
              error={state.fieldErrors?.legalName?.[0]}
            >
              <Input id="legalName" name="legalName" required defaultValue={value.legalName} />
            </Field>
            <Field label="Dirigeant" htmlFor="ownerName">
              <Input id="ownerName" name="ownerName" defaultValue={value.ownerName} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Métier principal" htmlFor="trade">
              <Select id="trade" name="trade" defaultValue={value.trade}>
                {TRADES.map((trade) => (
                  <option key={trade.value} value={trade.value}>
                    {trade.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Couleur de marque" htmlFor="brandColor" hint="PDF et page client">
              <Input
                id="brandColor"
                name="brandColor"
                type="color"
                defaultValue={value.brandColor}
                className="h-10 w-full cursor-pointer p-1"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email de contact" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={value.email} />
            </Field>
            <Field label="Téléphone" htmlFor="phone">
              <Input id="phone" name="phone" type="tel" defaultValue={value.phone} />
            </Field>
          </div>

          <Field label="Adresse" htmlFor="addressLine1">
            <Input id="addressLine1" name="addressLine1" defaultValue={value.addressLine1} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <Field label="Code postal" htmlFor="postalCode">
              <Input id="postalCode" name="postalCode" defaultValue={value.postalCode} />
            </Field>
            <Field label="Ville" htmlFor="city">
              <Input id="city" name="city" defaultValue={value.city} />
            </Field>
          </div>

          {!compact ? (
            <Field label="Site web" htmlFor="website">
              <Input id="website" name="website" defaultValue={value.website} placeholder="https://" />
            </Field>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations légales et fiscales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SIRET" htmlFor="siret" error={state.fieldErrors?.siret?.[0]}>
              <Input id="siret" name="siret" defaultValue={value.siret} inputMode="numeric" className="tabular" />
            </Field>
            <Field label="N° TVA intracommunautaire" htmlFor="vatNumber">
              <Input id="vatNumber" name="vatNumber" defaultValue={value.vatNumber} className="tabular" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Statut TVA" htmlFor="vatStatus">
              <Select id="vatStatus" name="vatStatus" defaultValue={value.vatStatus}>
                {VAT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Taux de TVA par défaut" htmlFor="defaultVatRate">
              <Select id="defaultVatRate" name="defaultVatRate" defaultValue={String(value.defaultVatRate)}>
                {VAT_RATES.map((rate) => (
                  <option key={rate.value} value={rate.value}>
                    {rate.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {!compact ? (
            <Field label="Assurance professionnelle" htmlFor="insurance" hint="affichée sur le devis">
              <Input
                id="insurance"
                name="insurance"
                defaultValue={value.insurance}
                placeholder="Décennale n° 123456 — Assureur"
              />
            </Field>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paramètres des devis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Taux horaire par défaut (€ HT)" htmlFor="defaultHourly">
              <Input
                id="defaultHourly"
                name="defaultHourly"
                inputMode="decimal"
                defaultValue={value.defaultHourlyEuros}
                className="tabular"
              />
            </Field>
            <Field label="Validité des devis (jours)" htmlFor="quoteValidityDays">
              <Input
                id="quoteValidityDays"
                name="quoteValidityDays"
                type="number"
                min={1}
                max={365}
                defaultValue={value.quoteValidityDays}
                className="tabular"
              />
            </Field>
          </div>

          <Field label="Modalités de paiement" htmlFor="paymentTerms">
            <Textarea
              id="paymentTerms"
              name="paymentTerms"
              rows={2}
              defaultValue={value.paymentTerms}
              placeholder="Acompte de 30 % à la commande, solde à la fin des travaux."
            />
          </Field>

          <Field label="Conditions générales" htmlFor="quoteTerms">
            <Textarea
              id="quoteTerms"
              name="quoteTerms"
              rows={4}
              defaultValue={value.quoteTerms}
              placeholder="Devis valable sous réserve d'accessibilité du chantier…"
            />
          </Field>

          {!compact ? (
            <Field label="Pied de page du devis" htmlFor="quoteFooter">
              <Input id="quoteFooter" name="quoteFooter" defaultValue={value.quoteFooter} maxLength={200} />
            </Field>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
