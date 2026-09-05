import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock3, Eye, FileDown, Link2, Send } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getQuote } from '@/server/services/quoteService';
import { appUrl } from '@/lib/env';
import { formatCents } from '@/lib/money';
import { formatDateTime, formatDate } from '@/lib/i18n';
import { fullName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuoteStatusBadge } from '@/components/status';
import { QuoteActions } from './actions';
import { QuoteEditorSection } from './editor-section';

export const metadata: Metadata = { title: 'Devis' };

const EVENT_LABELS: Record<string, string> = {
  CREE: 'Devis créé',
  MODIFIE: 'Devis modifié',
  ENVOYE: 'Devis envoyé au client',
  CONSULTE: 'Devis consulté',
  ACCEPTE: 'Devis consulté',
  REFUSE: 'Devis consulté',
  MODIFICATION_DEMANDEE: 'Devis consulté',
  RELANCE: 'Relance envoyée',
  PDF_TELECHARGE: 'PDF téléchargé',
  ANNULE: 'Devis annulé',
};

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('quote:read');
  const { id } = await params;
  const organizationId = auth.organization.organizationId;

  const quote = await getQuote(organizationId, id);
  const [customers, profile] = await Promise.all([
    prisma.customer.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    prisma.businessProfile.findUnique({ where: { organizationId } }),
  ]);

  const editable = ['BROUILLON', 'ENVOYE', 'CONSULTE', 'MODIFICATION_DEMANDEE'].includes(quote.status);
  const publicUrl = appUrl(`/devis/${quote.publicToken}`);
  const customerName = fullName(
    quote.customer.firstName,
    quote.customer.lastName,
    quote.customer.companyName,
  );

  return (
    <div className="space-y-6">
      <Link
        href="/app/devis"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Retour aux devis
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-[26px]">
              {quote.title}
            </h1>
            <QuoteStatusBadge status={quote.status} />
          </div>
          <p className="mt-1.5 text-[14px] text-muted tabular">
            {quote.number} · {customerName} ·{' '}
            <span className="font-medium text-ink">{formatCents(quote.totalCents)} TTC</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <a href={`/api/quotes/${quote.id}/pdf`} target="_blank" rel="noreferrer">
              <FileDown className="h-4 w-4" aria-hidden />
              PDF
            </a>
          </Button>
          <QuoteActions
            quoteId={quote.id}
            status={quote.status}
            publicUrl={publicUrl}
            customerEmail={quote.customer.email}
            customerName={customerName}
            quoteNumber={quote.number}
          />
        </div>
      </header>

      {/* Suivi client */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Send className="h-[18px] w-[18px] text-subtle" aria-hidden />
            <div>
              <p className="text-[12px] text-subtle">Envoyé</p>
              <p className="text-[14px] font-medium text-ink">
                {quote.sentAt ? formatDate(quote.sentAt) : 'Pas encore envoyé'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Eye className="h-[18px] w-[18px] text-subtle" aria-hidden />
            <div>
              <p className="text-[12px] text-subtle">Consultations</p>
              <p className="text-[14px] font-medium text-ink tabular">
                {quote.viewCount}
                {quote.lastViewedAt ? (
                  <span className="ml-1.5 text-[12.5px] font-normal text-muted">
                    dernière : {formatDate(quote.lastViewedAt)}
                  </span>
                ) : null}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Clock3 className="h-[18px] w-[18px] text-subtle" aria-hidden />
            <div>
              <p className="text-[12px] text-subtle">Validité</p>
              <p className="text-[14px] font-medium text-ink">
                {quote.validUntil ? formatDate(quote.validUntil) : 'Non précisée'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {quote.clientMessage ? (
        <Card>
          <CardHeader>
            <CardTitle>Message du client</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">
              {quote.clientMessage}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center gap-2 rounded-[12px] border border-line bg-surface/60 px-4 py-3">
        <Link2 className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-[13px] text-muted">{publicUrl}</p>
        <span className="shrink-0 text-[12px] text-subtle">Lien client</span>
      </div>

      {editable ? (
        <QuoteEditorSection
          quote={{
            id: quote.id,
            number: quote.number,
            customerId: quote.customerId,
            title: quote.title,
            summary: quote.summary ?? '',
            notes: quote.notes ?? '',
            terms: quote.terms ?? profile?.quoteTerms ?? '',
            paymentTerms: quote.paymentTerms ?? profile?.paymentTerms ?? '',
            validUntil: quote.validUntil ? quote.validUntil.toISOString().slice(0, 10) : '',
            discountRate: Number(quote.discountRate),
            depositRate: Number(quote.depositRate),
            estimatedDurationMin: quote.estimatedDurationMin,
            items: quote.items.map((item) => ({
              kind: item.kind,
              label: item.label,
              description: item.description ?? '',
              unit: item.unit,
              quantity: Number(item.quantity),
              unitPriceCents: item.unitPriceCents,
              vatRate: Number(item.vatRate),
              discountRate: Number(item.discountRate),
              priceBookItemId: item.priceBookItemId,
            })),
          }}
          customers={customers.map((customer) => ({
            id: customer.id,
            name: fullName(customer.firstName, customer.lastName, customer.companyName),
            email: customer.email,
          }))}
          vatExempt={profile?.vatStatus === 'FRANCHISE_EN_BASE'}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Détail du devis</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <ul className="divide-y divide-line">
              {quote.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-ink">{item.label}</p>
                    {item.description ? (
                      <p className="mt-0.5 text-[13px] text-muted">{item.description}</p>
                    ) : null}
                    <p className="mt-1 text-[12.5px] text-subtle tabular">
                      {Number(item.quantity)} {item.unit} × {formatCents(item.unitPriceCents)}
                    </p>
                  </div>
                  <p className="shrink-0 text-[14px] font-medium text-ink tabular">
                    {formatCents(item.lineTotalCents)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-right text-[15px] font-semibold text-ink tabular">
              Total TTC : {formatCents(quote.totalCents)}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <ol className="relative space-y-4 border-l border-line pl-5">
            {quote.events.map((event) => (
              <li key={event.id} className="relative">
                <span
                  className="absolute -left-[23px] top-1.5 h-2 w-2 rounded-full bg-line-strong"
                  aria-hidden
                />
                <p className="text-[13.5px] text-ink">
                  {EVENT_LABELS[event.type] ?? event.type}
                  {event.actor === 'client' ? (
                    <span className="ml-1.5 text-[12px] text-subtle">par le client</span>
                  ) : null}
                </p>
                <p className="text-[12px] text-subtle tabular">{formatDateTime(event.createdAt)}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
