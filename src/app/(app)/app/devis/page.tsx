import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import type { QuoteStatus } from '@prisma/client';
import { requirePermission } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { formatCents } from '@/lib/money';
import { formatDate } from '@/lib/i18n';
import { fullName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page';
import { QuoteStatusBadge, quoteStatusLabel } from '@/components/status';

export const metadata: Metadata = { title: 'Devis' };

const FILTERS: { value: QuoteStatus | 'TOUS'; label: string }[] = [
  { value: 'TOUS', label: 'Tous' },
  { value: 'BROUILLON', label: 'Brouillons' },
  { value: 'ENVOYE', label: 'Envoyés' },
  { value: 'CONSULTE', label: 'Consultés' },
  { value: 'ACCEPTE', label: 'Acceptés' },
  { value: 'REFUSE', label: 'Refusés' },
];

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const auth = await requirePermission('quote:read');
  const params = await searchParams;
  const filter = FILTERS.find((item) => item.value === params.statut)?.value ?? 'TOUS';

  const where = {
    organizationId: auth.organization.organizationId,
    deletedAt: null,
    ...(filter !== 'TOUS' ? { status: filter } : {}),
  };

  const [quotes, counts] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { customer: true },
    }),
    prisma.quote.groupBy({
      by: ['status'],
      where: { organizationId: auth.organization.organizationId, deletedAt: null },
      _count: true,
      _sum: { totalCents: true },
    }),
  ]);

  const totalByStatus = new Map(counts.map((row) => [row.status, row._count]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devis"
        description="Tous vos devis, de la préparation à l’acceptation."
        actions={
          <Button asChild>
            <Link href="/app/devis/nouveau">
              <Plus className="h-4 w-4" aria-hidden />
              Nouveau devis
            </Link>
          </Button>
        }
      />

      <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1" aria-label="Filtrer par statut">
        {FILTERS.map((item) => {
          const count = item.value === 'TOUS' ? undefined : totalByStatus.get(item.value);
          return (
            <Link
              key={item.value}
              href={item.value === 'TOUS' ? '/app/devis' : `/app/devis?statut=${item.value}`}
              className={`whitespace-nowrap rounded-[9px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                item.value === filter
                  ? 'bg-ink text-white'
                  : 'border border-line bg-canvas text-muted hover:text-ink'
              }`}
              aria-current={item.value === filter ? 'true' : undefined}
            >
              {item.label}
              {count ? <span className="ml-1.5 opacity-60 tabular">{count}</span> : null}
            </Link>
          );
        })}
      </nav>

      {quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={filter === 'TOUS' ? 'Vous n’avez encore aucun devis.' : 'Aucun devis dans ce statut.'}
          description={
            filter === 'TOUS'
              ? 'Votre premier devis est à moins d’une minute.'
              : 'Changez de filtre pour voir les autres devis.'
          }
          action={
            filter === 'TOUS' ? (
              <Button asChild size="lg">
                <Link href="/app/devis/nouveau">Créer mon premier devis</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <Card className="overflow-hidden">
          {/* Tableau sur desktop, cartes sur mobile */}
          <table className="hidden w-full text-left sm:table">
            <thead>
              <tr className="border-b border-line bg-surface/60">
                {['Numéro', 'Client', 'Objet', 'Statut', 'Montant TTC', 'Date'].map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-subtle"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {quotes.map((quote) => (
                <tr key={quote.id} className="transition-colors hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/devis/${quote.id}`}
                      className="text-[13.5px] font-medium text-ink tabular hover:text-accent"
                    >
                      {quote.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[13.5px] text-ink-soft">
                    {fullName(quote.customer.firstName, quote.customer.lastName, quote.customer.companyName)}
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-3 text-[13.5px] text-muted">
                    {quote.title}
                  </td>
                  <td className="px-4 py-3">
                    <QuoteStatusBadge status={quote.status} />
                  </td>
                  <td className="px-4 py-3 text-[13.5px] font-medium text-ink tabular">
                    {formatCents(quote.totalCents)}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-subtle">
                    {formatDate(quote.sentAt ?? quote.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-line sm:hidden">
            {quotes.map((quote) => (
              <li key={quote.id}>
                <Link href={`/app/devis/${quote.id}`} className="block px-4 py-3.5 active:bg-surface">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ink">
                        {fullName(quote.customer.firstName, quote.customer.lastName, quote.customer.companyName)}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-muted">{quote.title}</p>
                      <p className="mt-1 text-[12px] text-subtle tabular">
                        {quote.number} · {quoteStatusLabel(quote.status)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[14px] font-semibold text-ink tabular">
                      {formatCents(quote.totalCents, { compact: true })}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
