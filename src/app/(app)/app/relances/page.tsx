import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Clock3 } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { listFollowUps, revenueToRecover } from '@/server/services/followUpService';
import { formatCents } from '@/lib/money';
import { formatDate } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page';
import { Badge } from '@/components/ui/badge';
import { FollowUpItem } from './item';

export const metadata: Metadata = { title: 'Relances' };

export default async function FollowUpsPage() {
  const auth = await requirePermission('followup:send');
  const organizationId = auth.organization.organizationId;

  const [toRecover, followUps] = await Promise.all([
    revenueToRecover(organizationId),
    listFollowUps(organizationId, ['SUGGEREE', 'PLANIFIEE']),
  ]);

  const scheduled = followUps.filter((item) => item.status === 'PLANIFIEE');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relances"
        description="Le chiffre d’affaires qui attend une réponse, et les messages prêts à partir."
      />

      <section className="rounded-[16px] border border-accent-border bg-accent-soft/50 p-5 sm:p-6">
        <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent-hover">
          Chiffre d’affaires à récupérer
        </h2>
        <p className="mt-2 text-[36px] font-semibold leading-none tracking-[-0.03em] text-accent-hover tabular sm:text-[42px]">
          {formatCents(toRecover.totalCents, { compact: true })}
        </p>
        <p className="mt-2.5 text-[14px] text-ink-soft">
          {toRecover.quoteCount === 0
            ? 'Aucun devis en attente de réponse.'
            : `${toRecover.quoteCount} devis · ${toRecover.customerCount} client${
                toRecover.customerCount > 1 ? 's' : ''
              } sans réponse.`}
        </p>
      </section>

      {toRecover.quotes.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Aucune relance en attente."
          description="Tous vos devis envoyés ont reçu une réponse. C’est le bon moment pour en préparer un nouveau."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Devis sans réponse</CardTitle>
            <span className="text-[12.5px] text-subtle">Du plus ancien au plus récent</span>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-1">
            {toRecover.quotes.map((quote) => (
              <FollowUpItem
                key={quote.id}
                quote={{
                  id: quote.id,
                  number: quote.number,
                  title: quote.title,
                  totalCents: quote.totalCents,
                  customerName: quote.customerName,
                  customerEmail: quote.customerEmail,
                  daysWaiting: quote.daysWaiting,
                  viewCount: quote.viewCount,
                  lastFollowUpAt: quote.lastFollowUpAt,
                  suggestion: quote.suggestion,
                }}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {scheduled.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Relances planifiées</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <ul className="divide-y divide-line">
              {scheduled.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">
                      {item.quote?.customer
                        ? item.quote.customer.companyName ??
                          [item.quote.customer.firstName, item.quote.customer.lastName]
                            .filter(Boolean)
                            .join(' ')
                        : 'Client'}
                    </p>
                    <p className="text-[12.5px] text-subtle tabular">
                      {item.quote?.number} · prévue le {formatDate(item.scheduledFor)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone="outline">
                      <Clock3 className="h-3 w-3" aria-hidden />
                      Relance {item.attempt}
                    </Badge>
                    <Link
                      href={`/app/devis/${item.quoteId}`}
                      className="text-[13px] font-medium text-accent hover:underline"
                    >
                      Voir
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-center text-[12.5px] text-subtle">
        Les délais et l’activation des relances automatiques se règlent dans{' '}
        <Link href="/app/parametres/automatisations" className="underline hover:text-muted">
          Paramètres → Automatisations
        </Link>
        .
      </p>
    </div>
  );
}
