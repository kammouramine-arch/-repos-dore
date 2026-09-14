import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock3, Eye, FileDown, Link2, Mail, Phone, Send, Sparkles, UserRound } from 'lucide-react';
import { requirePermission } from '@/lib/auth/page-session';
import { can } from '@/lib/auth/permissions';
import { prisma } from '@/lib/prisma';
import { getQuote } from '@/server/services/quoteService';
import { appUrl } from '@/lib/env';
import { formatCents } from '@/lib/money';
import { formatDateTime, formatDate, formatRelative, getTranslations } from '@/lib/i18n';
import { fullName } from '@/lib/utils';
import { QUOTE_EVENT_LABELS } from '@devisia/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QuoteStatusBadge } from '@/components/status';
import { CopyButton } from '@/components/app/copy-button';
import { QuoteActions } from './actions';
import { QuoteEditorSection } from './editor-section';
import { DeleteQuoteButton } from './delete-button';

export const metadata: Metadata = { title: 'Devis' };

const EDITABLE = ['BROUILLON', 'ENVOYE', 'CONSULTE', 'MODIFICATION_DEMANDEE'];
const DELETABLE = ['BROUILLON', 'ENVOYE', 'CONSULTE', 'MODIFICATION_DEMANDEE', 'EXPIRE', 'REFUSE'];

/**
 * Fiche d'un devis : le document au centre, le suivi et le client à côté.
 *
 * Les actions qui font avancer le devis (envoyer, relancer, PDF) restent en
 * tête ; le panneau latéral porte ce qu'on consulte sans le modifier.
 */
export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('quote:read');
  const { locale, t } = await getTranslations();
  const { id } = await params;
  const organizationId = auth.organization.organizationId;

  const quote = await getQuote(organizationId, id);
  const [customers, profile] = await Promise.all([
    prisma.customer.findMany({ where: { organizationId, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 300 }),
    prisma.businessProfile.findUnique({ where: { organizationId } }),
  ]);

  const editable = EDITABLE.includes(quote.status);
  const deletable = DELETABLE.includes(quote.status) && can(auth.organization.role, 'quote:delete');
  const publicUrl = appUrl(`/devis/${quote.publicToken}`);
  const customerName = fullName(quote.customer.firstName, quote.customer.lastName, quote.customer.companyName);
  const lastEvent = quote.events[0];

  return (
    <div className="space-y-5">
      <Link href="/app/devis" className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {t.quotes.backToList}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] font-bold tracking-[-0.025em] text-ink sm:text-[26px]">{quote.title}</h1>
            <QuoteStatusBadge status={quote.status} t={t} />
            {quote.aiGenerated ? (
              <Badge tone="accent">
                <Sparkles className="h-3 w-3" aria-hidden />
                {t.quotes.aiPrepared}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1.5 text-[14px] text-muted tabular">
            {quote.number} · {customerName} · <span className="font-semibold text-ink">{formatCents(quote.totalCents)} TTC</span>
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {quote.clientMessage ? (
            <Card className="border-accent-border bg-accent-soft/40">
              <CardHeader>
                <CardTitle>{t.quotes.clientMessage}</CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{quote.clientMessage}</p>
              </CardContent>
            </Card>
          ) : null}

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
                <CardTitle>{t.quotes.details}</CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <ul className="divide-y divide-line">
                  {quote.items.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-ink">{item.label}</p>
                        {item.description ? <p className="mt-0.5 text-[13px] text-muted">{item.description}</p> : null}
                        <p className="mt-1 text-[12.5px] text-subtle tabular">
                          {Number(item.quantity)} {item.unit} × {formatCents(item.unitPriceCents)}
                        </p>
                      </div>
                      <p className="shrink-0 text-[14px] font-medium text-ink tabular">{formatCents(item.lineTotalCents)}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-right text-[15px] font-semibold text-ink tabular">
                  {t.quotes.quoteTotal} : {formatCents(quote.totalCents)}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t.quotes.history}</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <ol className="relative space-y-4 border-l border-line pl-5">
                {quote.events.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[23px] top-1.5 h-2 w-2 rounded-full bg-accent-border ring-2 ring-canvas" aria-hidden />
                    <p className="text-[13.5px] text-ink">
                      {QUOTE_EVENT_LABELS[event.type as keyof typeof QUOTE_EVENT_LABELS] ?? event.type}
                      {event.actor === 'client' ? <span className="ml-1.5 text-[12px] text-subtle">{t.quotes.byClient}</span> : null}
                    </p>
                    <p className="text-[12px] text-subtle tabular">{formatDateTime(event.createdAt, locale)}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>{t.quotes.statusCard}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 pt-2 text-[13.5px]">
              <div className="flex items-start gap-3">
                <Send className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
                <div>
                  <p className="text-[12px] text-subtle">{t.quotes.sentOn}</p>
                  <p className="font-medium text-ink">{quote.sentAt ? formatDate(quote.sentAt, locale) : t.quotes.notSentYet}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Eye className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
                <div>
                  <p className="text-[12px] text-subtle">{t.quotes.views}</p>
                  <p className="font-medium text-ink tabular">
                    {quote.viewCount}
                    {quote.lastViewedAt ? (
                      <span className="ml-1.5 text-[12.5px] font-normal text-muted">
                        {t.quotes.lastView} : {formatRelative(quote.lastViewedAt, locale)}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
                <div>
                  <p className="text-[12px] text-subtle">{t.quotes.validity}</p>
                  <p className="font-medium text-ink">{quote.validUntil ? formatDate(quote.validUntil, locale) : t.quotes.noValidity}</p>
                </div>
              </div>
              {lastEvent ? (
                <p className="border-t border-line pt-3 text-[12.5px] text-muted">
                  {t.quotes.lastActivity} : {QUOTE_EVENT_LABELS[lastEvent.type as keyof typeof QUOTE_EVENT_LABELS] ?? lastEvent.type} · {formatRelative(lastEvent.createdAt, locale)}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.quotes.customerCard}</CardTitle>
              <Link href={`/app/clients/${quote.customerId}`} className="text-[12.5px] font-medium text-accent hover:underline">
                {t.common.seeMore}
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-2 text-[13.5px]">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <UserRound className="h-4 w-4 text-subtle" aria-hidden />
                {customerName}
              </p>
              {quote.customer.email ? (
                <a href={`mailto:${quote.customer.email}`} className="flex items-center gap-2 text-muted hover:text-accent">
                  <Mail className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{quote.customer.email}</span>
                </a>
              ) : (
                <p className="text-[12.5px] text-warning">{t.quotes.noEmail}</p>
              )}
              {quote.customer.phone ? (
                <a href={`tel:${quote.customer.phone}`} className="flex items-center gap-2 text-muted hover:text-accent">
                  <Phone className="h-4 w-4 shrink-0" aria-hidden />
                  {quote.customer.phone}
                </a>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.quotes.publicLink}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
                <p className="min-w-0 flex-1 truncate text-[12.5px] text-muted" title={publicUrl}>
                  {publicUrl.replace(/^https?:\/\//, '')}
                </p>
                <CopyButton value={publicUrl} label={t.common.copy} copiedLabel={t.common.copied} />
              </div>
            </CardContent>
          </Card>

          {deletable ? (
            <div className="flex justify-end">
              <DeleteQuoteButton quoteId={quote.id} number={quote.number} />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
