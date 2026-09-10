'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Copy,
  GripVertical,
  HelpCircle,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import {
  VAT_RATES,
  centsToEuros,
  computeQuoteTotals,
  eurosToCents,
  formatCents,
  formatPercent,
} from '@/lib/money';
import { cn } from '@/lib/utils';

export interface EditorLine {
  key: string;
  kind: 'MATERIAU' | 'MAIN_OEUVRE' | 'SERVICE' | 'PACK' | 'FRAIS' | 'REMISE';
  label: string;
  description: string;
  unit: string;
  quantity: number;
  unitPriceEuros: number;
  vatRate: number;
  discountRate: number;
  priceBookItemId: string | null;
  fromCatalog?: boolean;
}

export interface EditorCustomer {
  id: string;
  name: string;
  email: string | null;
}

export interface QuoteEditorValue {
  customerId: string;
  title: string;
  summary: string;
  notes: string;
  terms: string;
  paymentTerms: string;
  validUntil: string;
  discountRate: number;
  depositRate: number;
  estimatedDurationMin: number | null;
  lines: EditorLine[];
}

const KIND_LABELS: Record<EditorLine['kind'], string> = {
  MATERIAU: 'Matériau',
  MAIN_OEUVRE: 'Main-d’œuvre',
  SERVICE: 'Prestation',
  PACK: 'Forfait',
  FRAIS: 'Frais',
  REMISE: 'Remise',
};

export function newLine(partial: Partial<EditorLine> = {}): EditorLine {
  return {
    key: Math.random().toString(36).slice(2),
    kind: 'MATERIAU',
    label: '',
    description: '',
    unit: 'u',
    quantity: 1,
    unitPriceEuros: 0,
    vatRate: 20,
    discountRate: 0,
    priceBookItemId: null,
    ...partial,
  };
}

export function QuoteEditor({
  initial,
  customers,
  quoteId,
  quoteNumber,
  aiMeta,
  vatExempt = false,
  onSaved,
}: {
  initial: QuoteEditorValue;
  customers: EditorCustomer[];
  quoteId?: string;
  quoteNumber?: string;
  aiMeta?: { confidence: number; questions: string[]; warnings: string[]; degraded: boolean } | null;
  vatExempt?: boolean;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = React.useState<QuoteEditorValue>(initial);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const totals = React.useMemo(
    () =>
      computeQuoteTotals({
        lines: value.lines.map((line) => ({
          quantity: line.quantity,
          unitPriceCents: eurosToCents(line.unitPriceEuros),
          discountRate: line.discountRate,
          vatRate: line.vatRate,
        })),
        globalDiscountRate: value.discountRate,
        depositRate: value.depositRate,
        vatExempt,
      }),
    [value, vatExempt],
  );

  const update = <K extends keyof QuoteEditorValue>(key: K, next: QuoteEditorValue[K]) =>
    setValue((current) => ({ ...current, [key]: next }));

  const updateLine = (key: string, patch: Partial<EditorLine>) =>
    setValue((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    }));

  const removeLine = (key: string) =>
    setValue((current) => ({ ...current, lines: current.lines.filter((line) => line.key !== key) }));

  const duplicateLine = (key: string) =>
    setValue((current) => {
      const index = current.lines.findIndex((line) => line.key === key);
      if (index < 0) return current;
      const copy = { ...current.lines[index]!, key: Math.random().toString(36).slice(2) };
      const lines = [...current.lines];
      lines.splice(index + 1, 0, copy);
      return { ...current, lines };
    });

  const moveLine = (key: string, direction: -1 | 1) =>
    setValue((current) => {
      const index = current.lines.findIndex((line) => line.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.lines.length) return current;
      const lines = [...current.lines];
      const [item] = lines.splice(index, 1);
      lines.splice(target, 0, item!);
      return { ...current, lines };
    });

  async function save(sendAfter = false) {
    setError(null);

    if (!value.customerId) {
      setError('Sélectionnez un client avant d’enregistrer le devis.');
      return;
    }
    if (value.lines.length === 0) {
      setError('Ajoutez au moins une ligne au devis.');
      return;
    }
    if (value.lines.some((line) => !line.label.trim())) {
      setError('Chaque ligne doit avoir une désignation.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerId: value.customerId,
        title: value.title.trim(),
        summary: value.summary.trim() || null,
        notes: value.notes.trim() || null,
        terms: value.terms.trim() || null,
        paymentTerms: value.paymentTerms.trim() || null,
        validUntil: value.validUntil ? new Date(value.validUntil).toISOString() : null,
        discountRate: value.discountRate,
        depositRate: value.depositRate,
        estimatedDurationMin: value.estimatedDurationMin,
        aiGenerated: Boolean(aiMeta),
        aiConfidence: aiMeta?.confidence ?? null,
        aiWarnings: aiMeta?.warnings ?? [],
        aiQuestions: aiMeta?.questions ?? [],
        items: value.lines.map((line) => ({
          kind: line.kind,
          label: line.label.trim(),
          description: line.description.trim() || null,
          unit: line.unit || 'u',
          quantity: line.quantity,
          unitPriceCents: eurosToCents(line.unitPriceEuros),
          discountRate: line.discountRate,
          vatRate: line.vatRate,
          priceBookItemId: line.priceBookItemId,
        })),
      };

      const response = await fetch(quoteId ? `/api/quotes/${quoteId}` : '/api/quotes', {
        method: quoteId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as
        | { data: { id: string } }
        | { error: { message: string } };

      if (!response.ok || 'error' in result) {
        setError('error' in result ? result.error.message : 'Enregistrement impossible.');
        return;
      }

      toast({
        title: quoteId ? 'Devis enregistré' : 'Devis créé',
        description: sendAfter ? 'Vous pouvez maintenant l’envoyer au client.' : undefined,
      });

      if (onSaved) onSaved(result.data.id);
      else router.push(`/app/devis/${result.data.id}`);
      router.refresh();
    } catch {
      setError('Connexion impossible. Réessayez dans un instant.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {aiMeta ? (
        <div className="flex flex-wrap items-center gap-2.5 rounded-[13px] border border-accent-border bg-accent-soft/50 px-4 py-3">
          <Sparkles className="h-4 w-4 shrink-0 text-accent" aria-hidden />
          <p className="flex-1 text-[13.5px] text-ink-soft">
            Devis préparé automatiquement. Vérifiez les quantités et les prix avant l’envoi.
          </p>
          <Badge tone={aiMeta.confidence >= 60 ? 'success' : 'warning'}>
            Confiance {aiMeta.confidence} %
          </Badge>
          {aiMeta.degraded ? <Badge tone="neutral">Mode local</Badge> : null}
        </div>
      ) : null}

      {aiMeta && aiMeta.questions.length > 0 ? (
        <Alert tone="warning" icon={HelpCircle} title="Informations à compléter">
          <ul className="mt-1.5 space-y-1">
            {aiMeta.questions.map((question) => (
              <li key={question}>• {question}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {aiMeta && aiMeta.warnings.length > 0 ? (
        <Alert tone="info" icon={AlertTriangle} title="Points de vigilance">
          <ul className="mt-1.5 space-y-1">
            {aiMeta.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {error ? <Alert tone="danger" icon={AlertTriangle}>{error}</Alert> : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_308px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{quoteNumber ? `Devis ${quoteNumber}` : 'Nouveau devis'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <Field label="Client" htmlFor="customerId" required>
                <Select
                  id="customerId"
                  value={value.customerId}
                  onChange={(event) => update('customerId', event.target.value)}
                  required
                >
                  <option value="">Sélectionner un client…</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.email ? ` — ${customer.email}` : ''}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Objet du devis" htmlFor="title" required>
                <Input
                  id="title"
                  value={value.title}
                  onChange={(event) => update('title', event.target.value)}
                  maxLength={160}
                  placeholder="Remplacement du siphon sous évier"
                  required
                />
              </Field>

              <Field
                label="Résumé de l’intervention"
                htmlFor="summary"
                hint="visible par le client"
              >
                <Textarea
                  id="summary"
                  value={value.summary}
                  onChange={(event) => update('summary', event.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Décrivez brièvement le contexte et les travaux prévus."
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lignes du devis</CardTitle>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => update('lines', [...value.lines, newLine()])}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Ajouter une ligne
              </Button>
            </CardHeader>

            <CardContent className="space-y-3 pt-2">
              {value.lines.length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-line-strong py-10 text-center text-[13.5px] text-subtle">
                  Aucune ligne. Ajoutez une prestation ou un matériau.
                </p>
              ) : null}

              {value.lines.map((line, index) => {
                const lineTotal = computeQuoteTotals({
                  lines: [
                    {
                      quantity: line.quantity,
                      unitPriceCents: eurosToCents(line.unitPriceEuros),
                      discountRate: line.discountRate,
                      vatRate: line.vatRate,
                    },
                  ],
                  vatExempt,
                });

                return (
                  <div
                    key={line.key}
                    className="rounded-[12px] border border-line bg-canvas p-3.5 transition-colors hover:border-line-strong"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col items-center gap-0.5 pt-1.5">
                        <button
                          type="button"
                          onClick={() => moveLine(line.key, -1)}
                          disabled={index === 0}
                          className="rounded p-0.5 text-subtle transition-colors hover:text-ink disabled:opacity-30"
                          aria-label="Monter la ligne"
                        >
                          <GripVertical className="h-3.5 w-3.5 rotate-90" aria-hidden />
                        </button>
                        <span className="text-[11px] text-subtle tabular">{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => moveLine(line.key, 1)}
                          disabled={index === value.lines.length - 1}
                          className="rounded p-0.5 text-subtle transition-colors hover:text-ink disabled:opacity-30"
                          aria-label="Descendre la ligne"
                        >
                          <GripVertical className="h-3.5 w-3.5 rotate-90" aria-hidden />
                        </button>
                      </div>

                      <div className="min-w-0 flex-1 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            value={line.label}
                            onChange={(event) => updateLine(line.key, { label: event.target.value })}
                            placeholder="Désignation"
                            className="h-9 flex-1 min-w-[180px] font-medium"
                            aria-label={`Désignation ligne ${index + 1}`}
                          />
                          <Select
                            value={line.kind}
                            onChange={(event) =>
                              updateLine(line.key, { kind: event.target.value as EditorLine['kind'] })
                            }
                            className="h-9 w-[142px]"
                            aria-label={`Type ligne ${index + 1}`}
                          >
                            {Object.entries(KIND_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </Select>
                          {line.fromCatalog ? <Badge tone="accent">Catalogue</Badge> : null}
                        </div>

                        <Textarea
                          value={line.description}
                          onChange={(event) =>
                            updateLine(line.key, { description: event.target.value })
                          }
                          placeholder="Description destinée au client (facultatif)"
                          rows={2}
                          className="min-h-[52px] text-[13px]"
                          aria-label={`Description ligne ${index + 1}`}
                        />

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                          <label className="block">
                            <span className="mb-1 block text-[11.5px] text-subtle">Quantité</span>
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              value={line.quantity}
                              onChange={(event) =>
                                updateLine(line.key, { quantity: Number(event.target.value) || 0 })
                              }
                              className="h-9 tabular"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[11.5px] text-subtle">Unité</span>
                            <Input
                              value={line.unit}
                              onChange={(event) => updateLine(line.key, { unit: event.target.value })}
                              maxLength={16}
                              className="h-9"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[11.5px] text-subtle">P.U. HT (€)</span>
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              value={line.unitPriceEuros}
                              onChange={(event) =>
                                updateLine(line.key, {
                                  unitPriceEuros: Number(event.target.value) || 0,
                                })
                              }
                              className="h-9 tabular"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[11.5px] text-subtle">Remise (%)</span>
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="1"
                              min="0"
                              max="100"
                              value={line.discountRate}
                              onChange={(event) =>
                                updateLine(line.key, {
                                  discountRate: Math.min(100, Math.max(0, Number(event.target.value) || 0)),
                                })
                              }
                              className="h-9 tabular"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[11.5px] text-subtle">TVA</span>
                            <Select
                              value={String(line.vatRate)}
                              onChange={(event) =>
                                updateLine(line.key, { vatRate: Number(event.target.value) })
                              }
                              className="h-9"
                              disabled={vatExempt}
                            >
                              {VAT_RATES.map((rate) => (
                                <option key={rate.value} value={rate.value}>
                                  {formatPercent(rate.value)}
                                </option>
                              ))}
                            </Select>
                          </label>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 pl-1">
                        <span className="whitespace-nowrap text-[14px] font-semibold text-ink tabular">
                          {formatCents(lineTotal.subtotalCents)}
                        </span>
                        <div className="flex gap-0.5">
                          <button
                            type="button"
                            onClick={() => duplicateLine(line.key)}
                            className="rounded-[6px] p-1.5 text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
                            aria-label={`Dupliquer la ligne ${index + 1}`}
                          >
                            <Copy className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLine(line.key)}
                            className="rounded-[6px] p-1.5 text-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                            aria-label={`Supprimer la ligne ${index + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conditions et notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Validité" htmlFor="validUntil">
                  <Input
                    id="validUntil"
                    type="date"
                    value={value.validUntil}
                    onChange={(event) => update('validUntil', event.target.value)}
                  />
                </Field>
                <Field label="Acompte (%)" htmlFor="depositRate">
                  <Input
                    id="depositRate"
                    type="number"
                    min="0"
                    max="100"
                    value={value.depositRate}
                    onChange={(event) =>
                      update('depositRate', Math.min(100, Math.max(0, Number(event.target.value) || 0)))
                    }
                    className="tabular"
                  />
                </Field>
              </div>

              <Field label="Modalités de paiement" htmlFor="paymentTerms">
                <Textarea
                  id="paymentTerms"
                  value={value.paymentTerms}
                  onChange={(event) => update('paymentTerms', event.target.value)}
                  rows={2}
                  maxLength={1000}
                />
              </Field>

              <Field label="Conditions" htmlFor="terms">
                <Textarea
                  id="terms"
                  value={value.terms}
                  onChange={(event) => update('terms', event.target.value)}
                  rows={3}
                  maxLength={4000}
                />
              </Field>

              <Field label="Notes internes" htmlFor="notes" hint="non visibles par le client">
                <Textarea
                  id="notes"
                  value={value.notes}
                  onChange={(event) => update('notes', event.target.value)}
                  rows={2}
                  maxLength={4000}
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* Récapitulatif collant */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-1 text-[13.5px]">
              <div className="flex justify-between text-muted">
                <span>Total HT</span>
                <span className="tabular">{formatCents(totals.subtotalCents)}</span>
              </div>

              <div className="flex items-center justify-between gap-3 text-muted">
                <label htmlFor="discountRate" className="whitespace-nowrap">
                  Remise globale
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    id="discountRate"
                    type="number"
                    min="0"
                    max="100"
                    value={value.discountRate}
                    onChange={(event) =>
                      update('discountRate', Math.min(100, Math.max(0, Number(event.target.value) || 0)))
                    }
                    className="h-8 w-[68px] text-right tabular"
                  />
                  <span className="text-subtle">%</span>
                </div>
              </div>

              {totals.discountCents > 0 ? (
                <div className="flex justify-between text-muted">
                  <span>Montant de la remise</span>
                  <span className="tabular">− {formatCents(totals.discountCents)}</span>
                </div>
              ) : null}

              {vatExempt ? (
                <div className="flex justify-between text-muted">
                  <span>TVA</span>
                  <span>Non applicable</span>
                </div>
              ) : (
                totals.vatBreakdown
                  .filter((bucket) => bucket.baseCents !== 0)
                  .map((bucket) => (
                    <div key={bucket.rate} className="flex justify-between text-muted">
                      <span>TVA {formatPercent(bucket.rate)}</span>
                      <span className="tabular">{formatCents(bucket.vatCents)}</span>
                    </div>
                  ))
              )}

              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <span className="font-semibold text-ink">Total TTC</span>
                <span className="text-[21px] font-semibold tracking-[-0.02em] text-ink tabular">
                  {formatCents(totals.totalCents)}
                </span>
              </div>

              {totals.depositCents > 0 ? (
                <p className="text-right text-[12.5px] text-subtle tabular">
                  Acompte : {formatCents(totals.depositCents)}
                </p>
              ) : null}

              {totals.marginCents != null ? (
                <p className="rounded-[9px] bg-surface px-3 py-2 text-[12.5px] text-muted">
                  Marge estimée :{' '}
                  <span className="font-medium text-ink tabular">
                    {formatCents(totals.marginCents)}
                  </span>
                </p>
              ) : null}

              <div className="space-y-2 pt-2">
                <Button
                  className="w-full"
                  size="lg"
                  loading={saving}
                  onClick={() => void save()}
                >
                  <Save className="h-4 w-4" aria-hidden />
                  {quoteId ? 'Enregistrer les modifications' : 'Enregistrer le devis'}
                </Button>
                <p className={cn('text-center text-[12px] text-subtle')}>
                  {centsToEuros(totals.totalCents) > 0
                    ? 'Vous pourrez l’envoyer après enregistrement.'
                    : 'Ajoutez des lignes pour calculer le montant.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
