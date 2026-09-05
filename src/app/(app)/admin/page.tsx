import type { Metadata } from 'next';
import { requirePlatformAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { formatCents } from '@/lib/money';
import { formatDate } from '@/lib/i18n';
import { PLANS } from '@/lib/billing/plans';
import { PageHeader } from '@/components/ui/page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/app/stat-card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Administration DEVISIA', robots: { index: false } };

export default async function AdminPage() {
  await requirePlatformAdmin();

  const [organizations, users, subscriptions, quoteStats, aiStats, errors] = await Promise.all([
    prisma.organization.findMany({
      where: { deletedAt: null },
      include: {
        subscription: true,
        businessProfile: { select: { trade: true, onboardingCompleted: true } },
        _count: { select: { quotes: true, customers: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.subscription.groupBy({ by: ['plan', 'status'], _count: true }),
    prisma.quote.aggregate({
      where: { deletedAt: null, sentAt: { not: null } },
      _sum: { totalCents: true },
      _count: true,
    }),
    prisma.aIRequest.groupBy({ by: ['kind', 'status'], _count: true }),
    prisma.aIRequest.findMany({
      where: { status: 'ERREUR' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const mrrCents = subscriptions
    .filter((row) => row.status === 'active')
    .reduce((acc, row) => acc + PLANS[row.plan].monthlyPriceCents * row._count, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Interne"
        title="Administration DEVISIA"
        description="Vue plateforme réservée à l’équipe DEVISIA."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Entreprises" value={String(organizations.length)} />
        <StatCard label="Utilisateurs" value={String(users)} />
        <StatCard label="MRR estimé" value={formatCents(mrrCents, { compact: true })} emphasis />
        <StatCard
          label="CA client devisé"
          value={formatCents(quoteStats._sum.totalCents ?? 0, { compact: true })}
          hint={`${quoteStats._count} devis envoyés`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entreprises</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line">
                  {['Entreprise', 'Formule', 'Statut', 'Devis', 'Clients', 'Membres', 'Créée le'].map(
                    (header) => (
                      <th
                        key={header}
                        scope="col"
                        className="py-2 pr-4 text-[11.5px] font-semibold uppercase tracking-wide text-subtle"
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {organizations.map((organization) => (
                  <tr key={organization.id}>
                    <td className="py-2.5 pr-4">
                      <p className="text-[13.5px] font-medium text-ink">{organization.name}</p>
                      <p className="text-[12px] text-subtle">
                        {organization.businessProfile?.trade ?? '—'}
                        {organization.businessProfile?.onboardingCompleted ? '' : ' · onboarding en cours'}
                      </p>
                    </td>
                    <td className="py-2.5 pr-4 text-[13px] text-muted">
                      {organization.subscription ? PLANS[organization.subscription.plan].name : '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={organization.subscription?.status === 'active' ? 'success' : 'neutral'}>
                        {organization.subscription?.status ?? '—'}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-[13px] text-muted tabular">
                      {organization._count.quotes}
                    </td>
                    <td className="py-2.5 pr-4 text-[13px] text-muted tabular">
                      {organization._count.customers}
                    </td>
                    <td className="py-2.5 pr-4 text-[13px] text-muted tabular">
                      {organization._count.members}
                    </td>
                    <td className="py-2.5 pr-4 text-[13px] text-subtle">
                      {formatDate(organization.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Utilisation de l’IA</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <ul className="divide-y divide-line">
              {aiStats.map((row) => (
                <li key={`${row.kind}-${row.status}`} className="flex justify-between py-2.5 text-[13.5px]">
                  <span className="text-ink-soft">
                    {row.kind} · {row.status}
                  </span>
                  <span className="text-muted tabular">{row._count}</span>
                </li>
              ))}
              {aiStats.length === 0 ? (
                <li className="py-4 text-center text-[13px] text-subtle">Aucun appel enregistré.</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dernières erreurs IA</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <ul className="divide-y divide-line">
              {errors.map((row) => (
                <li key={row.id} className="py-2.5">
                  <p className="text-[13px] text-ink-soft">{row.kind}</p>
                  <p className="truncate text-[12px] text-subtle">{row.error ?? '—'}</p>
                </li>
              ))}
              {errors.length === 0 ? (
                <li className="py-4 text-center text-[13px] text-subtle">Aucune erreur récente.</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
