import type { Metadata } from 'next';
import Link from 'next/link';
import { Apple, Check, CreditCard, ExternalLink, Mail, Smartphone, Sparkles } from 'lucide-react';
import { requirePermission } from '@/lib/auth/page-session';
import { prisma } from '@/lib/prisma';
import { PLANS, PLAN_ORDER, TRIAL_DAYS, effectiveMonthlyPriceCents} from '@/lib/billing/plans';
import { isBillingConfigured } from '@/lib/billing/stripe';
import { usageSummary } from '@/server/services/usageService';
import { getBillingHistory } from '@/server/services/billingHistoryService';
import { toSubscriptionDTO } from '@/server/services/sessionDto';
import { accessStateFor } from '@devisia/shared';
import { formatCents } from '@/lib/money';
import { formatDate, format, getTranslations } from '@/lib/i18n';
import { PageHeader } from '@/components/ui/page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/misc';
import { Alert } from '@/components/ui/feedback';
import { PlanActions } from './actions';

export const metadata: Metadata = { title: 'Abonnement' };

const STATUS_TONE: Record<string, 'success' | 'accent' | 'warning' | 'neutral'> = {
  trialing: 'accent',
  active: 'success',
  past_due: 'warning',
  canceled: 'neutral',
  incomplete: 'warning',
};

/**
 * Abonnement et facturation.
 *
 * Un seul droit d'accès pour l'iPhone et le web : la formule et son état
 * viennent de l'abonnement, quel que soit le moyen de paiement. Apple gère
 * les siens depuis l'iPhone ; le paiement en ligne (Stripe) est branché ici
 * dès que l'instance est configurée, sans jamais simuler un paiement.
 */
export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const auth = await requirePermission('billing:view');
  const { locale, t } = await getTranslations();
  const params = await searchParams;
  const organizationId = auth.organization.organizationId;

  const subscription = await prisma.subscription.findUnique({ where: { organizationId } });
  const plan = subscription?.plan ?? 'ESSENTIEL';
  const dto = subscription ? toSubscriptionDTO(subscription) : null;
  const access = accessStateFor(dto);
  const provider = dto?.provider ?? 'trial';
  const billingReady = isBillingConfigured();
  const [usage, history] = await Promise.all([
    usageSummary(organizationId, plan),
    getBillingHistory(organizationId, locale).catch(() => null),
  ]);

  const statusLabel: Record<string, string> = {
    trialing: t.common.trial,
    active: t.common.active,
    past_due: t.common.toRegularize,
    canceled: t.common.canceled,
    incomplete: t.common.incomplete,
  };
  const providerLabel = provider === 'apple' ? t.settings.providerApple : provider === 'stripe' ? t.settings.providerStripe : t.settings.providerTrial;
  const quotas = [
    { label: t.analytics.aiGenerations, ...usage.aiGenerations },
    { label: t.analytics.aiImageAnalyses, ...usage.aiImageAnalyses },
    { label: t.analytics.followUpsSent, ...usage.followUps },
    { label: t.analytics.quotesSent, ...usage.quotesSent },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t.settings.billing} description={t.settings.sameOnMobile} />

      {params.statut === 'succes' ? (
        <Alert tone="success" icon={Check}>
          Merci ! Votre abonnement est en cours d’activation. Il peut s’écouler quelques secondes avant la mise à jour du statut.
        </Alert>
      ) : null}
      {params.statut === 'annule' ? <Alert tone="info">Paiement annulé. Votre formule actuelle reste inchangée.</Alert> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-subtle">{t.settings.plan}</p>
              <CardTitle className="mt-1 text-[22px] tracking-[-0.02em]">{PLANS[plan].name}</CardTitle>
              <p className="mt-1 text-[13px] text-muted">
                {formatCents(effectiveMonthlyPriceCents(plan))} {t.settings.exclTax} {t.settings.perMonth} · {format(t.settings.seats, { count: PLANS[plan].limits.seats })}
              </p>
            </div>
            <Badge tone={STATUS_TONE[subscription?.status ?? 'trialing'] ?? 'neutral'}>{statusLabel[subscription?.status ?? 'trialing']}</Badge>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <dl className="grid gap-3 text-[13.5px] sm:grid-cols-2">
              <div className="rounded-[12px] bg-surface px-4 py-3">
                <dt className="text-[12px] text-subtle">{t.settings.provider}</dt>
                <dd className="mt-0.5 flex items-center gap-2 font-medium text-ink">
                  {provider === 'apple' ? <Apple className="h-4 w-4" aria-hidden /> : provider === 'stripe' ? <CreditCard className="h-4 w-4" aria-hidden /> : <Sparkles className="h-4 w-4 text-accent" aria-hidden />}
                  {providerLabel}
                </dd>
              </div>
              <div className="rounded-[12px] bg-surface px-4 py-3">
                <dt className="text-[12px] text-subtle">
                  {access.inTrial ? t.settings.trialEnds : subscription?.cancelAtPeriodEnd ? t.settings.periodEnd : t.settings.renewal}
                </dt>
                <dd className="mt-0.5 font-medium text-ink tabular">
                  {access.inTrial && subscription?.trialEndsAt
                    ? `${formatDate(subscription.trialEndsAt, locale)} · ${access.trialDaysLeft} j`
                    : subscription?.currentPeriodEnd
                      ? formatDate(subscription.currentPeriodEnd, locale)
                      : '—'}
                </dd>
              </div>
            </dl>

            {dto?.pendingPlan && dto.pendingPlan !== plan ? (
              <Alert tone="info">{format(t.settings.pendingChange, { plan: PLANS[dto.pendingPlan].name, date: dto.pendingAt ? formatDate(dto.pendingAt, locale) : '—' })}</Alert>
            ) : null}

            {access.inTrial ? (
              <p className="text-[13px] text-muted">
                {format(t.settings.trialAccess, { days: TRIAL_DAYS, plan: PLANS[plan].name })}
              </p>
            ) : null}

            {provider === 'apple' ? (
              <div className="space-y-3 rounded-[12px] border border-line px-4 py-4">
                <p className="text-[13.5px] leading-relaxed text-ink-soft">{t.settings.managedByApple}</p>
                {history?.manageUrl ? (
                  <Button asChild variant="secondary" size="sm">
                    <a href={history.manageUrl} target="_blank" rel="noreferrer">
                      <Apple className="h-4 w-4" aria-hidden />
                      {t.settings.appleManage}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </Button>
                ) : null}
              </div>
            ) : billingReady || provider === 'stripe' ? (
              <PlanActions
                currentPlan={plan}
                status={subscription?.status ?? 'trialing'}
                hasSubscription={Boolean(subscription?.stripeSubscriptionId)}
                billingReady={billingReady}
                canManage={auth.organization.role === 'OWNER'}
                cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
                periodEnd={subscription?.currentPeriodEnd?.toISOString() ?? null}
              />
            ) : (
              <div className="space-y-3 rounded-[12px] border border-accent-border bg-accent-soft/50 px-4 py-4">
                <p className="text-[14px] font-semibold text-ink">{t.settings.onlinePaymentSoon}</p>
                <p className="text-[13.5px] leading-relaxed text-ink-soft">{t.settings.onlinePaymentSoonBody}</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/app/aide">
                      <Smartphone className="h-4 w-4" aria-hidden />
                      {t.settings.chooseOnIphone}
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a href="mailto:contact@devisera.fr?subject=Abonnement%20DEVISERA">
                      <Mail className="h-4 w-4" aria-hidden />
                      {t.settings.contactUs}
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.settings.usage}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {quotas.map((quota) => (
              <div key={quota.label}>
                <div className="flex items-baseline justify-between text-[13.5px]">
                  <span className="text-ink-soft">{quota.label}</span>
                  <span className="text-muted tabular">
                    {quota.used} {quota.limit == null ? `· ${t.analytics.unlimited}` : `/ ${quota.limit}`}
                  </span>
                </div>
                {quota.limit == null ? null : <Progress className="mt-2" value={(quota.used / quota.limit) * 100} />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3" aria-labelledby="formules">
        <h2 id="formules" className="text-[15px] font-semibold text-ink">
          {t.settings.plansTitle}
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const definition = PLANS[id];
            const current = id === plan;
            return (
              <Card key={id} className={current ? 'border-accent ring-2 ring-accent/15' : undefined}>
                <CardContent className="flex h-full flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[16px] font-semibold text-ink">{definition.name}</p>
                    {current ? <Badge tone="accent">{t.settings.current}</Badge> : definition.recommended ? <Badge tone="success">{t.settings.recommended}</Badge> : null}
                  </div>
                  <p className="mt-2 text-[24px] font-bold tracking-[-0.02em] text-ink tabular">
                    {formatCents(effectiveMonthlyPriceCents(definition.id), { compact: true })}
                    <span className="ml-1 text-[12.5px] font-normal text-muted">
                      {t.settings.exclTax} {t.settings.perMonth}
                    </span>
                  </p>
                  <p className="mt-1 text-[12.5px] text-muted">{definition.tagline}</p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {definition.highlights.map((highlight) => (
                      <li key={highlight} className="flex gap-2 text-[13px] leading-relaxed text-ink-soft">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.paymentsTitle}</CardTitle>
          {history?.receiptsUrl ? (
            <a href={history.receiptsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
              {t.settings.receipt}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
        </CardHeader>
        <CardContent className="pt-2">
          {!history || history.entries.length === 0 ? (
            <p className="text-[13.5px] text-muted">{history?.note || t.settings.noPayments}</p>
          ) : (
            <ul className="divide-y divide-line">
              {history.entries.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[13.5px]">
                  <div>
                    <p className="font-medium text-ink">{entry.description}</p>
                    <p className="text-[12px] text-subtle tabular">{formatDate(entry.date, locale)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={entry.status === 'paid' ? 'success' : entry.status === 'failed' ? 'danger' : 'neutral'}>{entry.status}</Badge>
                    <span className="font-semibold text-ink tabular">{formatCents(entry.amountCents)}</span>
                    {entry.receiptUrl ? (
                      <a href={entry.receiptUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        {t.settings.receipt}
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
