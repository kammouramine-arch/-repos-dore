import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail, MapPin, Phone, Plus } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { getCustomer } from '@/server/services/customerService';
import { formatCents } from '@/lib/money';
import { formatDate } from '@/lib/i18n';
import { fullName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/app/stat-card';
import { QuoteStatusBadge, LeadStatusBadge } from '@/components/status';

export const metadata: Metadata = { title: 'Fiche client' };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePermission('customer:read');
  const { id } = await params;
  const { customer, stats } = await getCustomer(auth.organization.organizationId, id);
  const name = fullName(customer.firstName, customer.lastName, customer.companyName);

  return (
    <div className="space-y-6">
      <Link
        href="/app/clients"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Retour aux clients
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-[26px]">
            {name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-muted">
            {customer.email ? (
              <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-accent">
                <Mail className="h-3.5 w-3.5" aria-hidden />
                {customer.email}
              </a>
            ) : null}
            {customer.phone ? (
              <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 hover:text-accent">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {customer.phone}
              </a>
            ) : null}
            {customer.city ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {[customer.postalCode, customer.city].filter(Boolean).join(' ')}
              </span>
            ) : null}
          </div>
        </div>

        <Button asChild>
          <Link href="/app/devis/nouveau">
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau devis
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Chiffre d’affaires" value={formatCents(stats.revenueCents, { compact: true })} />
        <StatCard label="En attente" value={formatCents(stats.pendingCents, { compact: true })} />
        <StatCard label="Devis" value={`${stats.acceptedCount}/${stats.quoteCount}`} hint="acceptés" />
        <StatCard label="Chantiers" value={String(stats.jobCount)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Devis</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            {customer.quotes.length === 0 ? (
              <p className="py-6 text-center text-[13.5px] text-subtle">Aucun devis pour ce client.</p>
            ) : (
              <ul className="divide-y divide-line">
                {customer.quotes.map((quote) => (
                  <li key={quote.id}>
                    <Link
                      href={`/app/devis/${quote.id}`}
                      className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-surface/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium text-ink">{quote.title}</p>
                        <p className="mt-0.5 text-[12px] text-subtle tabular">
                          {quote.number} · {formatDate(quote.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <QuoteStatusBadge status={quote.status} />
                        <span className="text-[13.5px] font-medium text-ink tabular">
                          {formatCents(quote.totalCents)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chantiers</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {customer.jobs.length === 0 ? (
                <p className="py-4 text-center text-[13.5px] text-subtle">Aucun chantier.</p>
              ) : (
                <ul className="space-y-2.5">
                  {customer.jobs.map((job) => (
                    <li key={job.id} className="text-[13.5px]">
                      <p className="font-medium text-ink">{job.title}</p>
                      <p className="text-[12.5px] text-subtle">
                        {job.city ?? '—'} · {formatDate(job.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {customer.leads.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Demandes</CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <ul className="space-y-2.5">
                  {customer.leads.map((lead) => (
                    <li key={lead.id} className="flex items-center justify-between gap-3">
                      <Link
                        href={`/app/prospects/${lead.id}`}
                        className="min-w-0 flex-1 truncate text-[13.5px] text-ink hover:text-accent"
                      >
                        {lead.title}
                      </Link>
                      <LeadStatusBadge status={lead.status} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {customer.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-muted">
                  {customer.notes}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
