import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { getLead, LEAD_SOURCE_LABELS } from '@/server/services/leadService';
import { formatCents } from '@/lib/money';
import { formatDate, formatRelative } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeadStatusBadge, QuoteStatusBadge } from '@/components/status';
import { LeadWorkflow } from './workflow';

export const metadata: Metadata = { title: 'Prospect' };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('lead:read');
  const { id } = await params;
  const lead = await getLead(auth.organization.organizationId, id);

  return (
    <div className="space-y-6">
      <Link
        href="/app/prospects"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Retour aux prospects
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-[26px]">
              {lead.contactName}
            </h1>
            <LeadStatusBadge status={lead.status} />
          </div>
          <p className="mt-1.5 text-[14.5px] text-muted">{lead.title}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-muted">
            {lead.phone ? (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-accent">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {lead.phone}
              </a>
            ) : null}
            {lead.email ? (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:text-accent">
                <Mail className="h-3.5 w-3.5" aria-hidden />
                {lead.email}
              </a>
            ) : null}
            {lead.city ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {[lead.postalCode, lead.city].filter(Boolean).join(' ')}
              </span>
            ) : null}
          </div>
        </div>

        <LeadWorkflow
          leadId={lead.id}
          status={lead.status}
          hasCustomer={lead.customerId != null}
          customerId={lead.customerId}
        />
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {lead.description ? (
            <Card>
              <CardHeader>
                <CardTitle>Demande du client</CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">
                  {lead.description}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Devis liés</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {lead.quotes.length === 0 ? (
                <p className="py-5 text-center text-[13.5px] text-subtle">
                  Aucun devis pour cette demande.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {lead.quotes.map((quote) => (
                    <li key={quote.id}>
                      <Link
                        href={`/app/devis/${quote.id}`}
                        className="flex items-center justify-between gap-4 py-3 hover:bg-surface/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-medium text-ink">{quote.title}</p>
                          <p className="text-[12px] text-subtle tabular">
                            {quote.number} · {formatDate(quote.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
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

          {lead.files.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Photos transmises</CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {lead.files.map((file) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={file.id}
                      src={`/api/files/${file.id}`}
                      alt={file.fileName}
                      className="aspect-square w-full rounded-[10px] border border-line object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-1 text-[13.5px]">
            <div className="flex justify-between gap-3">
              <span className="text-muted">Source</span>
              <span className="text-ink">{LEAD_SOURCE_LABELS[lead.source]}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Reçu</span>
              <span className="text-ink">{formatDate(lead.createdAt)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Dernière activité</span>
              <span className="text-ink">{formatRelative(lead.lastActivityAt)}</span>
            </div>
            {lead.estimatedCents ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted">Budget estimé</span>
                <span className="text-ink tabular">{formatCents(lead.estimatedCents)}</span>
              </div>
            ) : null}
            {lead.customer ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted">Client</span>
                <Link href={`/app/clients/${lead.customer.id}`} className="text-accent hover:underline">
                  Voir la fiche
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
