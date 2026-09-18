'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { VAT_RATES, centsToEuros, eurosToCents, formatPercent } from '@/lib/money';

export interface PriceBookItemView {
  id: string;
  reference: string | null;
  name: string;
  description: string | null;
  category: 'MATERIAU' | 'SERVICE' | 'MAIN_OEUVRE' | 'PACK';
  unit: string;
  costPriceCents: number;
  salePriceCents: number;
  vatRate: number;
  supplier: string | null;
  keywords: string[];
  isActive: boolean;
  marginCents: number;
  marginRate: number | null;
}

const CATEGORIES = [
  { value: 'MATERIAU', label: 'Matériau' },
  { value: 'SERVICE', label: 'Prestation' },
  { value: 'MAIN_OEUVRE', label: 'Main-d’œuvre' },
  { value: 'PACK', label: 'Forfait' },
];

export function PriceBookForm({
  item,
  open,
  onOpenChange,
}: {
  item?: PriceBookItemView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cost, setCost] = React.useState(item ? String(centsToEuros(item.costPriceCents)) : '');
  const [sale, setSale] = React.useState(item ? String(centsToEuros(item.salePriceCents)) : '');

  const margin = React.useMemo(() => {
    const costCents = eurosToCents(cost || '0');
    const saleCents = eurosToCents(sale || '0');
    if (saleCents === 0) return null;
    return Math.round(((saleCents - costCents) / saleCents) * 10000) / 100;
  }, [cost, sale]);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const payload = {
        name: String(formData.get('name') ?? ''),
        reference: String(formData.get('reference') ?? '') || null,
        description: String(formData.get('description') ?? '') || null,
        category: String(formData.get('category') ?? 'MATERIAU'),
        unit: String(formData.get('unit') ?? 'u'),
        costPriceCents: eurosToCents(String(formData.get('cost') ?? '0')),
        salePriceCents: eurosToCents(String(formData.get('sale') ?? '0')),
        vatRate: Number(formData.get('vatRate') ?? 20),
        supplier: String(formData.get('supplier') ?? '') || null,
        keywords: String(formData.get('keywords') ?? '')
          .split(',')
          .map((keyword) => keyword.trim())
          .filter(Boolean)
          .slice(0, 20),
      };

      const response = await fetch(item ? `/api/pricebook/${item.id}` : '/api/pricebook', {
        method: item ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { error?: { message: string } };
      if (!response.ok) {
        setError(result.error?.message ?? 'Enregistrement impossible.');
        return;
      }

      onOpenChange(false);
      toast({ title: item ? 'Article mis à jour' : 'Article ajouté' });
      router.refresh();
    } catch {
      setError('Connexion impossible.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form action={submit}>
          <DialogHeader>
            <DialogTitle>{item ? 'Modifier l’article' : 'Nouvel article'}</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {error ? <Alert tone="danger">{error}</Alert> : null}

            <Field label="Désignation" htmlFor="name" required>
              <Input
                id="name"
                name="name"
                required
                maxLength={160}
                defaultValue={item?.name}
                placeholder="Installation chauffe-eau 200 L"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Catégorie" htmlFor="category">
                <Select id="category" name="category" defaultValue={item?.category ?? 'MATERIAU'}>
                  {CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Unité" htmlFor="unit">
                <Input id="unit" name="unit" defaultValue={item?.unit ?? 'u'} maxLength={16} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prix d’achat HT (€)" htmlFor="cost">
                <Input
                  id="cost"
                  name="cost"
                  inputMode="decimal"
                  value={cost}
                  onChange={(event) => setCost(event.target.value)}
                  className="tabular"
                  placeholder="650"
                />
              </Field>
              <Field
                label="Prix de vente HT (€)"
                htmlFor="sale"
                required
                hint={margin != null ? `marge ${formatPercent(margin)}` : undefined}
              >
                <Input
                  id="sale"
                  name="sale"
                  inputMode="decimal"
                  required
                  value={sale}
                  onChange={(event) => setSale(event.target.value)}
                  className="tabular"
                  placeholder="950"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="TVA" htmlFor="vatRate">
                <Select id="vatRate" name="vatRate" defaultValue={String(item?.vatRate ?? 20)}>
                  {VAT_RATES.map((rate) => (
                    <option key={rate.value} value={rate.value}>
                      {rate.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Référence" htmlFor="reference" hint="facultatif">
                <Input id="reference" name="reference" defaultValue={item?.reference ?? ''} maxLength={64} />
              </Field>
            </div>

            <Field label="Description" htmlFor="description" hint="reprise dans le devis">
              <Textarea id="description" name="description" rows={2} defaultValue={item?.description ?? ''} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fournisseur" htmlFor="supplier">
                <Input id="supplier" name="supplier" defaultValue={item?.supplier ?? ''} maxLength={120} />
              </Field>
              <Field
                label="Mots-clés"
                htmlFor="keywords"
                hint="séparés par des virgules"
              >
                <Input
                  id="keywords"
                  name="keywords"
                  defaultValue={item?.keywords.join(', ') ?? ''}
                  placeholder="ballon, cumulus, eau chaude"
                />
              </Field>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={pending}>
              {item ? 'Enregistrer' : 'Ajouter au catalogue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
