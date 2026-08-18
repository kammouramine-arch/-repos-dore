import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { PLANS, PLAN_ORDER, TRIAL_DAYS } from '@/lib/billing/plans';
import { isBillingConfigured } from '@/lib/billing/stripe';
import { usageSummary } from '@/server/services/usageService';
import { formatCents } from '@/lib/money';
import { formatDate } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/misc';
import { Alert } from '@/components/ui/feedback';
import { PlanActions } from './actions';

export const metadata: Metadata = { title: 'Abonnement' };

const STATUS_LABELS: Record<string, string> = {
  trialing: 'Période d’essai',
  active: 'Actif',
  past_due: 'Paiement en attente',
  canceled: 'Résilié',
  incomplete: 'Incomplet',
};

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const auth = await requirePermission('billing:view');
  const params = await searchParams;
  const organizationId = auth.organization.organizationId;

  const subscription = await prisma.subscription.findUnique({ where: { organizationId } });
  const plan = subscription?.plan ?? 'ESSENTIEL';
  const usage = await usageSummary(organizationId, plan);
  const billingReady = isBillingConfigured();

  const quotas = [
    { label: 'Générations IA', ...usage.aiGenerations },
    { label: 'Relances envoyées', ...usage.followUps },
    { label: 'Devis envoyés', ...usage.quotesSent },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/app/parametres"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Paramètres
      </Link>

      <header>
        <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-[26px]">
          Abonnement
        </h1>
        <p className="mt-1.5 text-[14px] text-muted">
          Votre formule, votre consommation et votre facturation.
        </p>
      </header>

      {params.statut === 'succes' ? (
        <Alert tone="success" icon={Check}>
          Merci ! Votre abonnement est en cours d’activation. Il peut s’écouler quelques secondes
          avant la mise à jour du statut.
        </Alert>
      ) : null}
      {params.statut === 'annule' ? (
        <Alert tone="info">Paiement annulé. Votre formule actuelle reste inchangée.</Alert>
      ) : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Formule {PLANS[plan].name}</CardTitle>
            <p className="mt-1 text-[13px] text-muted">
              {formatCents(PLANS[plan].monthlyPriceCents)} HT / mois
            </p>
          </div>
          <Badge tone={subscription?.status === 'active' ? 'success' : 'accent'}>
            {STATUS_LABELS[subscription?.status ?? 'trialing']}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-5 pt-1">
          {subscription?.status === 'trialing' && subscription.trialEndsAt ? (
            <p className="rounded-[10px] border border-accent-border bg-accent-soft/50 px-4 py-3 text-[13.5px] text-accent-hover">
              Votre essai de {TRIAL_DAYS} jours se termine le {formatDate(subscription.trialEndsAt)}.
            </p>
          ) : null}

          {subscription?.currentPeriodEnd ? (
            <p className="text-[13.5px] text-muted">
              Prochaine échéance : {formatDate(subscription.currentPeriodEnd)}
              {subscription.cancelAtPeriodEnd ? ' — résiliation programmée.' : ''}
            </p>
          ) : null}

          <div className="space-y-4">
            {quotas.map((quota) => (
              <div key={quota.label}>
                <div className="flex items-baseline justify-between text-[13.5px]">
                  <span className="text-ink-soft">{quota.label}</span>
                  <span className="text-muted tabular">
                    {quota.used} {quota.limit == null ? '· illimité' : `/ ${quota.limit}`}
                  </span>
                </div>
                <Progress
                  className="mt-2"
                  value={quota.limit == null ? 6 : (quota.used / quota.limit) * 100}
                />
              </div>
            ))}
          </div>

          <PlanActions
            currentPlan={plan}
            hasSubscription={Boolean(subscription?.stripeSubscriptionId)}
            billingReady={billingReady}
            canManage={auth.organization.role === 'OWNER'}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const definition = PLANS[id];
          const current = id === plan;
          return (
            <Card
              key={id}
              className={current ? 'border-accent ring-1 ring-accent/15' : undefined}
            >
              <CardContent>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[15px] font-semibold text-ink">{definition.name}</p>
                  {current ? <Badge tone="accent">Actuelle</Badge> : null}
                </div>
                <p className="mt-1.5 text-[20px] font-semibold tracking-[-0.02em] text-ink tabular">
                  {formatCents(definition.monthlyPriceCents, { compact: true })}
                  <span className="ml-1 text-[12.5px] font-normal text-muted">/ mois</span>
                </p>
                <ul className="mt-4 space-y-2">
                  {definition.highlights.slice(0, 4).map((highlight) => (
                    <li key={highlight} className="flex gap-2 text-[13px] leading-relaxed text-muted">
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

      {!billingReady ? (
        <Alert tone="info">
          Le paiement en ligne n’est pas encore activé sur cette instance. Renseignez{' '}
          <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code> et les identifiants de
          tarifs pour ouvrir la souscription.
        </Alert>
      ) : null}
    </div>
  );
}
