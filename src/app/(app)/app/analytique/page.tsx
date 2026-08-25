import type { Metadata } from 'next';
import { requirePermission } from '@/lib/auth/session';
import { getDashboardMetrics } from '@/server/services/dashboardService';
import { usageSummary } from '@/server/services/usageService';
import { prisma } from '@/lib/prisma';
import { formatCents } from '@/lib/money';
import { PLANS } from '@/lib/billing/plans';
import { PageHeader } from '@/components/ui/page';
import { getTranslations } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/app/stat-card';
import { RevenueChart, FunnelChart } from '@/components/app/charts';
import { Progress } from '@/components/ui/misc';

export const metadata: Metadata = { title: 'Analytique' };

export default async function AnalyticsPage() {
  const auth = await requirePermission('analytics:read');
  const { t } = await getTranslations();
  const organizationId = auth.organization.organizationId;

  const subscription = await prisma.subscription.findUnique({ where: { organizationId } });
  const plan = subscription?.plan ?? 'ESSENTIEL';

  const [metrics, usage] = await Promise.all([
    getDashboardMetrics(organizationId, 90),
    usageSummary(organizationId, plan),
  ]);

  const quotas = [
    { label: t.analytics.aiGenerations, ...usage.aiGenerations },
    { label: t.analytics.followUpsSent, ...usage.followUps },
    { label: t.analytics.quotesSent, ...usage.quotesSent },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.analytics.title}
        description={t.analytics.subtitle}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t.dashboard.revenueWon} value={formatCents(metrics.revenueWonCents, { compact: true })} />
        <StatCard label={t.dashboard.revenuePotential} value={formatCents(metrics.revenuePotentialCents, { compact: true })} />
        <StatCard label={t.dashboard.acceptanceRate} value={`${metrics.acceptanceRate} %`} />
        <StatCard label={t.dashboard.averageQuote} value={formatCents(metrics.averageQuoteCents, { compact: true })} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Chiffre d’affaires sur 90 jours</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Consommation — formule {PLANS[plan].name}</CardTitle>
          <span className="text-[12.5px] text-subtle tabular">Période {usage.period}</span>
        </CardHeader>
        <CardContent className="space-y-5 pt-1">
          {quotas.map((quota) => (
            <div key={quota.label}>
              <div className="flex items-baseline justify-between text-[13.5px]">
                <span className="text-ink-soft">{quota.label}</span>
                <span className="text-muted tabular">
                  {quota.used} {quota.limit == null ? `· ${t.analytics.unlimited}` : `/ ${quota.limit}`}
                </span>
              </div>
              {quota.limit == null ? null : (
                <Progress className="mt-2" value={(quota.used / quota.limit) * 100} />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.topServices}</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          {metrics.topServices.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] text-subtle">
              {t.analytics.noData}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {metrics.topServices.map((service) => (
                <li key={service.label} className="flex items-center justify-between gap-4 py-3">
                  <span className="min-w-0 truncate text-[13.5px] text-ink-soft">{service.label}</span>
                  <span className="shrink-0 text-[13.5px] font-medium text-ink tabular">
                    {formatCents(service.revenueCents)}
                    <span className="ml-2 text-[12px] font-normal text-subtle">×{service.count}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
