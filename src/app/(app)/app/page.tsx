import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Mic, Plus, Send } from 'lucide-react';
import { requireAuth } from '@/lib/auth/page-session';
import { getDashboardMetrics, getRecentActivity, type DashboardPeriod } from '@/server/services/dashboardService';
import { getHomeOverview } from '@/server/services/homeService';
import { formatCents } from '@/lib/money';
import { format, formatRelative, getTranslations } from '@/lib/i18n';
import { QUOTE_EVENT_LABELS } from '@devisia/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/app/stat-card';
import { RevenueChart } from '@/components/app/charts';
import { BrandHero, HeroOverlap } from '@/components/app/brand-hero';
import { SetupProgress } from '@/components/app/home/setup-progress';
import { StatusBreakdown } from '@/components/app/home/status-breakdown';
import { RecentCustomers, RecentQuotes } from '@/components/app/home/recent-lists';
import { QuickActions } from '@/components/app/home/quick-actions';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Accueil' };

const PERIODS: { value: DashboardPeriod; key: 'period7' | 'period30' | 'period90' | 'period365' }[] = [
  { value: 7, key: 'period7' },
  { value: 30, key: 'period30' },
  { value: 90, key: 'period90' },
  { value: 365, key: 'period365' },
];

function variation(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : 100;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Accueil.
 *
 * Même philosophie que l'accueil iOS : tant qu'il n'y a pas d'activité, on
 * montre un chemin (le premier devis) plutôt que des compteurs à zéro. Les
 * chiffres apparaissent quand ils veulent dire quelque chose, et l'écran
 * répond d'abord à « qu'est-ce que je dois faire aujourd'hui ? ».
 */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const auth = await requireAuth();
  const { locale, t } = await getTranslations();
  const params = await searchParams;
  const period = (PERIODS.find((item) => String(item.value) === params.periode)?.value ?? 30) as DashboardPeriod;

  const organizationId = auth.organization.organizationId;
  const [metrics, activity, home] = await Promise.all([
    getDashboardMetrics(organizationId, period),
    getRecentActivity(organizationId, 6),
    getHomeOverview(organizationId),
  ]);

  const firstName = auth.user.firstName?.trim() || auth.user.email.split('@')[0] || '';
  const started = home.totalQuotes > 0 || metrics.newLeads > 0;
  const recover = metrics.toRecover.quoteCount;
  const subtitle = !started
    ? t.dashboard.subtitleReady
    : recover > 0
      ? recover === 1
        ? t.dashboard.subtitleRecoverOne
        : format(t.dashboard.subtitleRecover, { count: recover })
      : metrics.pendingQuotes > 0
        ? format(t.dashboard.subtitleInProgress, { count: metrics.pendingQuotes })
        : t.dashboard.subtitleUpToDate;
  const setupPending = !(home.setup.business && home.setup.catalogue && home.setup.clients);

  return (
    <div>
      <BrandHero
        eyebrow={t.dashboard.workspace}
        title={`${t.dashboard.greeting} ${firstName}.`}
        subtitle={subtitle}
        actions={
          started ? (
            <>
              <nav className="hidden items-center gap-0.5 rounded-[10px] bg-white/14 p-1 sm:flex" aria-label={t.dashboard.period}>
                {PERIODS.map((item) => (
                  <Link
                    key={item.value}
                    href={`/app?periode=${item.value}`}
                    className={cn(
                      'rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                      item.value === period ? 'bg-white text-accent-hover shadow-xs' : 'text-white/85 hover:bg-white/10 hover:text-white',
                    )}
                    aria-current={item.value === period ? 'true' : undefined}
                  >
                    {t.dashboard[item.key]}
                  </Link>
                ))}
              </nav>
              <Button asChild className="bg-white text-accent-hover shadow-md hover:bg-white/90">
                <Link href="/app/devis/nouveau">
                  <Plus className="h-4 w-4" aria-hidden />
                  {t.quotes.new}
                </Link>
              </Button>
            </>
          ) : null
        }
      />

      <HeroOverlap>
        {!started ? (
          <>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <Link
                href="/app/devis/nouveau"
                className="pressable relative overflow-hidden rounded-[24px] bg-accent-deep p-7 text-white shadow-lg transition-transform sm:p-8"
              >
                <span className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent opacity-40" aria-hidden />
                <span className="flex h-13 w-13 items-center justify-center rounded-[17px] bg-white/18 p-3">
                  <Mic className="h-6 w-6" aria-hidden />
                </span>
                <span className="mt-5 block text-[26px] font-bold leading-tight tracking-[-0.03em]">{t.dashboard.firstQuoteTitle}</span>
                <span className="mt-2 block max-w-md text-[15px] leading-relaxed text-white/88">{t.dashboard.firstQuoteBody}</span>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-semibold">
                  {t.dashboard.start}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </Link>
              <SetupProgress status={home.setup} t={t} />
            </div>
            <QuickActions t={t} followUps={0} />
          </>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t.dashboard.quotedRevenue}>
              <StatCard
                label={t.dashboard.quotedRevenue}
                value={formatCents(metrics.quotedRevenueCents, { compact: true })}
                trend={variation(metrics.quotedRevenueCents, metrics.previous.quotedRevenueCents)}
                hint={t.dashboard.vsPrevious}
              />
              <StatCard
                label={t.dashboard.quotesSent}
                value={String(metrics.quotesSent)}
                trend={variation(metrics.quotesSent, metrics.previous.quotesSent)}
              />
              <StatCard
                label={t.dashboard.toRecoverLabel}
                value={formatCents(metrics.toRecover.totalCents, { compact: true })}
                hint={format(t.dashboard.toRecoverHint, { count: metrics.toRecover.quoteCount })}
                emphasis={metrics.toRecover.quoteCount > 0}
              />
              <StatCard
                label={t.dashboard.averageQuote}
                value={formatCents(metrics.averageQuoteCents, { compact: true })}
                hint={format(t.dashboard.newLeadsHint, { count: metrics.newLeads })}
              />
            </section>

            <QuickActions t={t} followUps={metrics.toRecover.quoteCount} />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-5">
                {metrics.toRecover.quoteCount > 0 ? (
                  <section className="rounded-[16px] border border-accent-border bg-accent-soft/60 p-5 sm:p-6" aria-labelledby="a-recuperer">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 id="a-recuperer" className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent-hover">
                          {t.dashboard.toRecoverTitle}
                        </h2>
                        <p className="mt-2 text-[34px] font-bold leading-none tracking-[-0.03em] text-accent-hover tabular sm:text-[40px]">
                          {formatCents(metrics.toRecover.totalCents, { compact: true })}
                        </p>
                        <p className="mt-2.5 text-[14px] text-ink-soft">
                          {format(t.dashboard.toRecoverDetail, { quotes: metrics.toRecover.quoteCount, customers: metrics.toRecover.customerCount })}
                        </p>
                      </div>
                      <Button asChild size="lg">
                        <Link href="/app/relances">
                          <Send className="h-4 w-4" aria-hidden />
                          {t.dashboard.followUpNow}
                        </Link>
                      </Button>
                    </div>
                    <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {metrics.toRecover.quotes.slice(0, 4).map((quote) => (
                        <li key={quote.id} className="min-w-0">
                          <Link
                            href={`/app/devis/${quote.id}`}
                            className="pressable flex min-w-0 items-center justify-between gap-3 rounded-[12px] border border-accent-border/70 bg-canvas px-4 py-3 transition-colors hover:border-accent"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13.5px] font-semibold text-ink">{quote.customerName}</span>
                              <span className="block text-[12px] text-subtle tabular">
                                {quote.number} · {format(t.dashboard.waitingSince, { days: quote.daysWaiting })} ·{' '}
                                {quote.viewCount > 0 ? t.dashboard.viewed : t.dashboard.notViewed}
                              </span>
                            </span>
                            <span className="shrink-0 text-[14px] font-semibold text-ink tabular">{formatCents(quote.totalCents)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <RecentQuotes quotes={home.recentQuotes} t={t} locale={locale} />

                <Card>
                  <CardHeader>
                    <CardTitle>{t.dashboard.revenueOverTime}</CardTitle>
                    <Link href="/app/analytique" className="flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
                      {t.nav.analytics}
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <RevenueChart data={metrics.series} />
                  </CardContent>
                </Card>
              </div>

              <div className="min-w-0 space-y-5">
                {setupPending ? <SetupProgress status={home.setup} t={t} /> : null}
                <StatusBreakdown counts={home.statusCounts} total={home.totalQuotes} t={t} />
                <RecentCustomers customers={home.recentCustomers} t={t} locale={locale} />
                <Card>
                  <CardHeader>
                    <CardTitle>{t.dashboard.recentActivity}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    {activity.length === 0 ? (
                      <p className="py-4 text-center text-[13.5px] text-subtle">{t.dashboard.noActivity}</p>
                    ) : (
                      <ol className="relative space-y-3.5 border-l border-line pl-4">
                        {activity.map((event) => (
                          <li key={event.id} className="relative">
                            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent-border ring-2 ring-canvas" aria-hidden />
                            <Link href={`/app/devis/${event.quoteId}`} className="group block">
                              <p className="text-[13px] text-ink group-hover:text-accent">
                                {QUOTE_EVENT_LABELS[event.type as keyof typeof QUOTE_EVENT_LABELS] ?? event.type}
                                <span className="text-muted"> — {event.quoteTitle}</span>
                              </p>
                              <p className="text-[11.5px] text-subtle tabular">
                                {event.quoteNumber} · {formatRelative(event.createdAt, locale)} · {formatCents(event.totalCents, { compact: true })}
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ol>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </HeroOverlap>
    </div>
  );
}
