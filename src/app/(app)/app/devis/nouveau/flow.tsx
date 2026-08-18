'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { QuoteCapture } from '@/components/app/quote-capture';
import {
  QuoteEditor,
  newLine,
  type EditorCustomer,
  type EditorLine,
  type QuoteEditorValue,
} from '@/components/app/quote-editor';
import { Alert } from '@/components/ui/feedback';
import { centsToEuros } from '@/lib/money';

interface GeneratedLine {
  kind: EditorLine['kind'];
  label: string;
  description: string | null;
  unit: string;
  quantity: number;
  unitPriceCents: number;
  discountRate: number;
  vatRate: number;
  priceBookItemId: string | null;
  fromCatalog: boolean;
}

interface GeneratedQuote {
  title: string;
  summary: string;
  workDescription: string[];
  lines: GeneratedLine[];
  questions: string[];
  warnings: string[];
  confidence: number;
  estimatedDurationMin: number | null;
  degraded: boolean;
}

export function NewQuoteFlow({
  customers,
  defaults,
  capabilities,
}: {
  customers: EditorCustomer[];
  defaults: { terms: string; paymentTerms: string; validityDays: number; vatExempt: boolean };
  capabilities: { generation: boolean; vision: boolean; transcription: boolean };
}) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<{
    value: QuoteEditorValue;
    meta: { confidence: number; questions: string[]; warnings: string[]; degraded: boolean };
  } | null>(null);

  const validUntil = React.useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + defaults.validityDays);
    return date.toISOString().slice(0, 10);
  }, [defaults.validityDays]);

  async function generate({ description, fileIds }: { description: string; fileIds: string[] }) {
    const response = await fetch('/api/ai/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, fileIds }),
    });

    const payload = (await response.json()) as
      | { data: GeneratedQuote }
      | { error: { message: string } };

    if (!response.ok || 'error' in payload) {
      throw new Error('error' in payload ? payload.error.message : 'Préparation impossible.');
    }

    const generated = payload.data;
    const summary = [generated.summary, ...generated.workDescription.map((task) => `• ${task}`)]
      .filter(Boolean)
      .join('\n');

    setDraft({
      value: {
        customerId: customers.length === 1 ? customers[0]!.id : '',
        title: generated.title,
        summary,
        notes: '',
        terms: defaults.terms,
        paymentTerms: defaults.paymentTerms,
        validUntil,
        discountRate: 0,
        depositRate: 0,
        estimatedDurationMin: generated.estimatedDurationMin,
        lines: generated.lines.map((line) =>
          newLine({
            kind: line.kind,
            label: line.label,
            description: line.description ?? '',
            unit: line.unit,
            quantity: line.quantity,
            unitPriceEuros: centsToEuros(line.unitPriceCents),
            vatRate: line.vatRate,
            discountRate: line.discountRate,
            priceBookItemId: line.priceBookItemId,
            fromCatalog: line.fromCatalog,
          }),
        ),
      },
      meta: {
        confidence: generated.confidence,
        questions: generated.questions,
        warnings: generated.warnings,
        degraded: generated.degraded,
      },
    });
  }

  if (!draft) {
    return (
      <div className="space-y-5">
        <header className="text-center">
          <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-ink sm:text-[28px]">
            Nouveau devis
          </h1>
          <p className="mt-1.5 text-[14.5px] text-muted">
            Un devis complet à partir de votre description du chantier.
          </p>
        </header>

        {customers.length === 0 ? (
          <div className="mx-auto max-w-2xl">
            <Alert tone="info" icon={UserPlus} title="Aucun client enregistré">
              Vous pourrez créer le devis, mais il faudra un client pour l’enregistrer.{' '}
              <Link href="/app/clients" className="font-medium underline">
                Ajouter un client
              </Link>
              .
            </Alert>
          </div>
        ) : null}

        {!capabilities.generation ? (
          <div className="mx-auto max-w-2xl">
            <Alert tone="info">
              Mode local actif : le devis est préparé à partir de votre catalogue de prix, sans
              fournisseur d’IA externe. Renseignez <code>ANTHROPIC_API_KEY</code> pour activer
              l’analyse enrichie et la lecture des photos.
            </Alert>
          </div>
        ) : null}

        <QuoteCapture
          onGenerated={generate}
          transcriptionAvailable={capabilities.transcription}
          visionAvailable={capabilities.vision}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-[26px]">
            Vérifiez votre devis
          </h1>
          <p className="mt-1 text-[14px] text-muted">
            Ajustez les lignes si nécessaire, puis enregistrez.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDraft(null)}
          className="text-[13.5px] text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Recommencer la description
        </button>
      </header>

      <QuoteEditor
        initial={draft.value}
        customers={customers}
        aiMeta={draft.meta}
        vatExempt={defaults.vatExempt}
        onSaved={(id) => router.push(`/app/devis/${id}`)}
      />
    </div>
  );
}
