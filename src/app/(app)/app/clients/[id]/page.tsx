import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Mail, MapPin, Phone, Plus } from 'lucide-react';
import { requirePermission } from '@/lib/auth/page-session';
import { can } from '@/lib/auth/permissions';
import { getCustomer } from '@/server/services/customerService';
import { prisma } from '@/lib/prisma';
import { formatCents } from '@/lib/money';
import { formatDate, formatRelative, format, getTranslations } from '@/lib/i18n';
import { fullName } from '@/lib/utils';
import { QUOTE_EVENT_LABELS } from '@devisia/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/app/stat-card';
import { QuoteStatusBadge, LeadStatusBadge } from '@/components/status';
import { Avatar } from '@/components/app/shell';
import { CustomerActions, CustomerNotes } from './actions';

export const metadata: Metadata = { title: 'Fiche client' };

/**
 * Fiche client : l'identité et les moyens de contact d'abord, puis ce que
 * l'artisan a chiffré pour cette personne, ce qui attend une réponse, et
 * l'historique. Modification en modale, suppression confirmée.
 */
export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('customer:read');
  const { locale, t } = await getTranslations();
  const { id } = await params;
  const organizationId = auth.organization.organizationId;
  const [{ customer, stats }, activity] = await Promise.all([
    getCustomer(organizationId, id),
    prisma.quoteEvent.findMany({
      where: { quote: { organizationId, customerId: id, deletedAt: null }, type: { notIn: ['ACCEPTE', 'REFUSE', 'MODIFICATION_DEMANDEE'] } },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { id: true, type: true, createdAt: true, quoteId: true, quote: { select: { number: true, title: true } } },
    }),
  ]);
  const name = fullName(customer.firstName, customer.lastName, customer.companyName);
  const address = [customer.addressLine1, [customer.postalCode, customer.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const canDelete = can(auth.organization.role, 'customer:delete');

  return (
    <div className="space-y-5">
      <Link href="/app/clients" className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {t.customers.backToList}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar name={name} url={null} size="lg" />
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold tracking-[-0.025em] text-ink sm:text-[26px]">{name}</h1>
            <p className="mt-1 text-[13px] text-subtle">{format(t.customers.customerSince, { date: formatDate(customer.createdAt, locale) })}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-muted">
              {customer.email ? (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-accent">
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  {customer.email}
                </a>
              ) : null}
              {customer.phone ? (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 tabular hover:text-accent">
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  {customer.phone}
                </a>
              ) : null}
              {address ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {address}
                </span>
              ) : null}
              {!customer.email && !customer.phone && !address ? <span>{t.customers.noContact}</span> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CustomerActions
            customer={{
              id: customer.id,
              firstName: customer.firstName,
              lastName: customer.lastName,
              companyName: customer.companyName,
              email: customer.email,
              phone: customer.phone,
              addressLine1: customer.addressLine1,
              postalCode: customer.postalCode,
              city: customer.city,
              notes: customer.notes,
            }}
            name={name}
            canDelete={canDelete}
          />
          <Button asChild size="sm">
            <Link href={`/app/devis/nouveau?client=${customer.id}`}>
              <Plus className="h-4 w-4" aria-hidden />
              {t.customers.newQuoteFor}
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t.customers.quotedRevenue} value={formatCents(stats.revenueCents, { compact: true })} />
        <StatCard label={t.customers.pending} value={formatCents(stats.pendingCents, { compact: true })} emphasis={stats.pendingCents > 0} />
        <StatCard label={t.customers.sentQuotes} value={String(stats.sentCount)} hint={format(t.dashboard.quotesTotal, { count: stats.quoteCount })} />
        <StatCard label={t.customers.jobs} value={String(stats.jobCount)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{t.quotes.title}</CardTitle>
              <Link href={`/app/devis?q=${encodeURIComponent(customer.lastName ?? customer.companyName ?? '')}`} className="flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
                {t.common.seeAll}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </CardHeader>
            <CardContent className="pt-1">
              {customer.quotes.length === 0 ? (
                <p className="py-6 text-center text-[13.5px] text-subtle">{t.customers.noQuotes}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {customer.quotes.map((quote) => (
                    <li key={quote.id}>
                      <Link href={`/app/devis/${quote.id}`} className="pressable -mx-2 flex items-center justify-between gap-4 rounded-[10px] px-2 py-3 transition-colors hover:bg-surface">
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold text-ink">{quote.title}</p>
                          <p className="mt-0.5 text-[12px] text-subtle tabular">
                            {quote.number} · {formatDate(quote.sentAt ?? quote.createdAt, locale)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="hidden sm:block">
                            <QuoteStatusBadge status={quote.status} t={t} />
                          </span>
                          <span className="text-[13.5px] font-semibold text-ink tabular">{formatCents(quote.totalCents)}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.customers.activity}</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {activity.length === 0 ? (
                <p className="py-4 text-center text-[13.5px] text-subtle">{t.customers.noActivity}</p>
              ) : (
                <ol className="relative space-y-3.5 border-l border-line pl-4">
                  {activity.map((event) => (
                    <li key={event.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent-border ring-2 ring-canvas" aria-hidden />
                      <Link href={`/app/devis/${event.quoteId}`} className="group block">
                        <p className="text-[13px] text-ink group-hover:text-accent">
                          {QUOTE_EVENT_LABELS[event.type as keyof typeof QUOTE_EVENT_LABELS] ?? event.type}
                          <span className="text-muted"> — {event.quote.title}</span>
                        </p>
                        <p className="text-[11.5px] text-subtle tabular">
                          {event.quote.number} · {formatRelative(event.createdAt, locale)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{t.customers.notes}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <CustomerNotes customerId={customer.id} initial={customer.notes ?? ''} />
            </CardContent>
          </Card>

          {customer.jobs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t.customers.jobs}</CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <ul className="space-y-2.5">
                  {customer.jobs.map((job) => (
                    <li key={job.id} className="text-[13.5px]">
                      <p className="font-medium text-ink">{job.title}</p>
                      <p className="text-[12.5px] text-subtle">
                        {job.city ?? '—'} · {formatDate(job.createdAt, locale)}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {customer.leads.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t.customers.requests}</CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <ul className="space-y-2.5">
                  {customer.leads.map((lead) => (
                    <li key={lead.id} className="flex items-center justify-between gap-3">
                      <Link href={`/app/prospects/${lead.id}`} className="min-w-0 flex-1 truncate text-[13.5px] text-ink hover:text-accent">
                        {lead.title}
                      </Link>
                      <LeadStatusBadge status={lead.status} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
