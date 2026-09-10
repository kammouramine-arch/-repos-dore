'use client';

import * as React from 'react';
import { Pencil } from 'lucide-react';
import {
  QuoteEditor,
  newLine,
  type EditorCustomer,
  type EditorLine,
} from '@/components/app/quote-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { centsToEuros, formatCents } from '@/lib/money';

interface QuoteData {
  id: string;
  number: string;
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
  items: {
    kind: EditorLine['kind'];
    label: string;
    description: string;
    unit: string;
    quantity: number;
    unitPriceCents: number;
    vatRate: number;
    discountRate: number;
    priceBookItemId: string | null;
  }[];
}

export function QuoteEditorSection({
  quote,
  customers,
  vatExempt,
}: {
  quote: QuoteData;
  customers: EditorCustomer[];
  vatExempt: boolean;
}) {
  const [editing, setEditing] = React.useState(false);

  if (!editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Détail du devis</CardTitle>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" aria-hidden />
            Modifier
          </Button>
        </CardHeader>
        <CardContent className="pt-1">
          <ul className="divide-y divide-line">
            {quote.items.map((item, index) => (
              <li key={`${item.label}-${index}`} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-ink">{item.label}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{item.description}</p>
                  ) : null}
                  <p className="mt-1 text-[12.5px] text-subtle tabular">
                    {item.quantity} {item.unit} × {formatCents(item.unitPriceCents)} HT
                  </p>
                </div>
                <p className="shrink-0 text-[14px] font-medium text-ink tabular">
                  {formatCents(Math.round(item.quantity * item.unitPriceCents * (1 - item.discountRate / 100)))}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <QuoteEditor
      quoteId={quote.id}
      quoteNumber={quote.number}
      vatExempt={vatExempt}
      customers={customers}
      initial={{
        customerId: quote.customerId,
        title: quote.title,
        summary: quote.summary,
        notes: quote.notes,
        terms: quote.terms,
        paymentTerms: quote.paymentTerms,
        validUntil: quote.validUntil,
        discountRate: quote.discountRate,
        depositRate: quote.depositRate,
        estimatedDurationMin: quote.estimatedDurationMin,
        lines: quote.items.map((item) =>
          newLine({
            kind: item.kind,
            label: item.label,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPriceEuros: centsToEuros(item.unitPriceCents),
            vatRate: item.vatRate,
            discountRate: item.discountRate,
            priceBookItemId: item.priceBookItemId,
          }),
        ),
      }}
      onSaved={() => setEditing(false)}
    />
  );
}
