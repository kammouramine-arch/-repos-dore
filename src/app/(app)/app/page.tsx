import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { getDashboardMetrics, getRecentActivity, type DashboardPeriod } from '@/server/services/dashboardService';
import { prisma } from '@/lib/prisma';
import { formatCents } from '@/lib/money';
import { format, formatRelative, getTranslations } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/app/stat-card';
import { RevenueChart, FunnelChart, QuotesBarChart } from '@/components/app/charts';
import { EmptyState } from '@/components/ui/feedback';

export const metadata: Metadata = { title: 'Tableau de bord' };

const PERIODS: { value: DashboardPeriod; key: 'period7' | 'period30' | 'period90' | 'period365' }[] = [
  { value: 7, key: 'period7' },
  { value: 30, key: 'period30' },
  { value: 90, key: 'period90' },
  { value: 365, key: 'period365' },
];

const ACTIVITY_LABELS: Record<string, string> = {
  CREE: 'Devis créé',
  MODIFIE: 'Devis modifié',
  ENVOYE: 'Devis envoyé',
  CONSULTE: 'Consulté par le client',
  ACCEPTE: 'Accepté par le client',
  REFUSE: 'Refusé par le client',
  MODIFICATION_DEMANDEE: 'Modification demandée',
  RELANCE: 'Relance envoyée',
  PDF_TELECHARGE: 'PDF téléchargé',
  ANNULE: 'Devis annulé',
};

function variation(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const auth = await requireAuth();
  const { locale, t } = await getTranslations();
  const params = await searchParams;
  const period = (PERIODS.find((item) => String(item.value) === params.periode)?.value ??
    30) as DashboardPeriod;

  const organizationId = auth.organization.organizationId;
  const [metrics, activity, quoteCount] = await Promise.all([
    getDashboardMetrics(organizationId, period),
    getRecentActivity(organizationId, 8),
    prisma.quote.count({ where: { organizationId, deletedAt: null } }),
  ]);

  const firstName = auth.user.firstName ?? auth.user.email.split('@')[0];

  if (quoteCount === 0) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-ink sm:text-[28px]">
            {t.dashboard.greeting}, {firstName}.
          </h1>
          <p className="mt-1.5 text-[14.5px] text-muted">{t.dashboard.welcomeTitle}</p>
        </header>

        <EmptyState
          icon={FileText}
          title={t.quotes.emptyTitle}
          description={t.quotes.emptyBody}
          action={
            <Button asChild size="lg">
              <Link href="/app/devis/nouveau">
                <Sparkles className="h-4 w-4" aria-hidden />
                {t.quotes.emptyCta}
              </Link>
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: 'Complétez votre entreprise',
              body: 'Logo, SIRET, TVA et conditions apparaîtront sur vos devis.',
              href: '/app/parametres/entreprise',
              cta: 'Configurer',
            },
            {
              title: 'Ajoutez vos prix',
              body: 'Votre catalogue rend les devis générés immédiatement justes.',
              href: '/app/catalogue',
              cta: 'Ouvrir le catalogue',
            },
            {
              title: 'Créez un client',
              body: 'Un devis part toujours vers un client identifié.',
              href: '/app/clients',
              cta: 'Ajouter un client',
            },
          ].map((step) => (
            <Card key={step.href}>
              <CardContent>
                <p className="text-[14.5px] font-semibold text-ink">{step.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{step.body}</p>
                <Link
                  href={step.href}
                  className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
                >
                  {step.cta}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-ink sm:text-[28px]">
            {t.dashboard.greeting}, {firstName}.
          </h1>
          <p className="mt-1.5 text-[14.5px] text-muted">{t.dashboard.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <nav
            className="hidden items-center gap-1 rounded-[10px] border border-line bg-canvas p-1 sm:flex"
            aria-label={t.dashboard.period}
          >
            {PERIODS.map((item) => (
              <Link
                key={item.value}
                href={`/app?periode=${item.value}`}
                className={`rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                  item.value === period ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
                }`}
                aria-current={item.value === period ? 'true' : undefined}
              >
                {t.dashboard[item.key]}
              </Link>
            ))}
          </nav>
          <Button asChild>
            <Link href="/app/devis/nouveau">
              <Plus className="h-4 w-4" aria-hidden />
              {t.quotes.new}
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t.dashboard.revenueWon}>
        <StatCard
          label={t.dashboard.revenueWon}
          value={formatCents(metrics.revenueWonCents, { compact: true })}
          trend={variation(metrics.revenueWonCents, metrics.previous.revenueWonCents)}
          hint={t.dashboard.vsPrevious}
        />
        <StatCard
          label={t.dashboard.quotesSent}
          value={String(metrics.quotesSent)}
          trend={variation(metrics.quotesSent, metrics.previous.quotesSent)}
        />
        <StatCard
          label={t.dashboard.acceptanceRate}
          value={`${metrics.acceptanceRate} %`}
          hint={format(t.dashboard.accepted, { count: metrics.quotesAccepted })}
        />
        <StatCard
          label={t.dashboard.averageQuote}
          value={formatCents(metrics.averageQuoteCents, { compact: true })}
          hint={format(t.dashboard.newLeadsHint, { count: metrics.newLeads })}
        />
      </section>

      {/* Section centrale : chiffre d'affaires à récupérer */}
      <section
        className="rounded-[16px] border border-accent-border bg-accent-soft/50 p-5 sm:p-6"
        aria-labelledby="a-recuperer"
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h2
              id="a-recuperer"
              className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent-hover"
            >
              {t.dashboard.toRecoverTitle}
            </h2>
            <p className="mt-2 text-[36px] font-semibold leading-none tracking-[-0.03em] text-accent-hover tabular sm:text-[42px]">
              {formatCents(metrics.toRecover.totalCents, { compact: true })}
            </p>
            <p className="mt-2.5 text-[14px] text-ink-soft">
              {metrics.toRecover.quoteCount === 0
                ? t.dashboard.toRecoverEmpty
                : format(t.dashboard.toRecoverDetail, {
                    quotes: metrics.toRecover.quoteCount,
                    customers: metrics.toRecover.customerCount,
                  })}
            </p>
          </div>

          {metrics.toRecover.quoteCount > 0 ? (
            <Button asChild size="lg">
              <Link href="/app/relances">
                <Send className="h-4 w-4" aria-hidden />
                {t.dashboard.followUpNow}
              </Link>
            </Button>
          ) : null}
        </div>

        {metrics.toRecover.quotes.length > 0 ? (
          <ul className="mt-5 space-y-2">
            {metrics.toRecover.quotes.slice(0, 4).map((quote) => (
              <li key={quote.id}>
                <Link
                  href={`/app/devis/${quote.id}`}
                  className="flex items-center justify-between gap-3 rounded-[11px] border border-accent-border/60 bg-canvas px-4 py-3 transition-colors hover:border-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">{quote.customerName}</p>
                    <p className="text-[12px] text-subtle tabular">
                      {quote.number} ·{' '}
                      {format(t.dashboard.waitingSince, { days: quote.daysWaiting })} ·{' '}
                      {quote.viewCount > 0 ? t.dashboard.viewed : t.dashboard.notViewed}
                    </p>
                  </div>
                  <span className="shrink-0 text-[14px] font-semibold text-ink tabular">
                    {formatCents(quote.totalCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t.dashboard.revenueOverTime}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <RevenueChart data={metrics.series} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.funnel}</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart data={metrics.funnel} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.quotesSent}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <QuotesBarChart data={metrics.series} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.topServices}</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topServices.length === 0 ? (
              <p className="py-6 text-center text-[13.5px] text-subtle">
                {t.dashboard.noServices}
              </p>
            ) : (
              <ul className="space-y-3">
                {metrics.topServices.map((service) => (
                  <li key={service.label} className="flex items-center justify-between gap-4">
                    <span className="min-w-0 truncate text-[13.5px] text-ink-soft">{service.label}</span>
                    <span className="shrink-0 text-[13px] font-medium text-ink tabular">
                      {formatCents(service.revenueCents, { compact: true })}
                      <span className="ml-2 text-[11.5px] font-normal text-subtle">
                        ×{service.count}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.recentActivity}</CardTitle>
          <Link
            href="/app/devis"
            className="flex items-center gap-1 text-[13px] font-medium text-accent hover:underline"
          >
            {t.common.seeAll}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </CardHeader>
        <CardContent className="pt-3">
          {activity.length === 0 ? (
            <p className="py-4 text-center text-[13.5px] text-subtle">{t.dashboard.noActivity}</p>
          ) : (
            <ul className="divide-y divide-line">
              {activity.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/app/devis/${event.quoteId}`}
                    className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-surface/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] text-ink">
                        {ACTIVITY_LABELS[event.type] ?? event.type} —{' '}
                        <span className="text-muted">{event.quoteTitle}</span>
                      </p>
                      <p className="text-[12px] text-subtle tabular">
                        {event.quoteNumber} · {formatRelative(event.createdAt, locale)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-medium text-ink tabular">
                      {formatCents(event.totalCents, { compact: true })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
