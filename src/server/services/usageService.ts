import 'server-only';
import type { SubscriptionPlan, UsageMetric } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { PLANS, type PlanLimits } from '@/lib/billing/plans';

function currentPeriod(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

const METRIC_TO_LIMIT: Partial<Record<UsageMetric, keyof PlanLimits>> = {
  AI_GENERATION: 'aiGenerations',
  FOLLOWUP_SENT: 'followUps',
  QUOTE_SENT: 'quotesSent',
};

export async function getUsage(organizationId: string, metric: UsageMetric): Promise<number> {
  const record = await prisma.usageRecord.findUnique({
    where: {
      organizationId_metric_period: { organizationId, metric, period: currentPeriod() },
    },
  });
  return record?.count ?? 0;
}

export async function incrementUsage(
  organizationId: string,
  metric: UsageMetric,
  by = 1,
): Promise<number> {
  const period = currentPeriod();
  const record = await prisma.usageRecord.upsert({
    where: { organizationId_metric_period: { organizationId, metric, period } },
    create: { organizationId, metric, period, count: by },
    update: { count: { increment: by } },
  });
  return record.count;
}

/**
 * Vérifie qu'une action reste dans les limites de la formule.
 * La vérification est toujours faite côté serveur, jamais depuis le client.
 */
export async function assertWithinPlan(
  organizationId: string,
  plan: SubscriptionPlan,
  metric: UsageMetric,
): Promise<void> {
  const limitKey = METRIC_TO_LIMIT[metric];
  if (!limitKey) return;
  const limit = PLANS[plan].limits[limitKey];
  if (limit == null) return;

  const used = await getUsage(organizationId, metric);
  if (used >= limit) {
    throw new AppError(
      'PLAN_LIMIT',
      `Vous avez atteint la limite mensuelle de votre formule ${PLANS[plan].name} (${limit}). Passez à la formule supérieure pour continuer.`,
    );
  }
}

export async function usageSummary(organizationId: string, plan: SubscriptionPlan) {
  const period = currentPeriod();
  const records = await prisma.usageRecord.findMany({ where: { organizationId, period } });
  const byMetric = new Map(records.map((r) => [r.metric, r.count]));
  const limits = PLANS[plan].limits;
  return {
    period,
    aiGenerations: { used: byMetric.get('AI_GENERATION') ?? 0, limit: limits.aiGenerations },
    followUps: { used: byMetric.get('FOLLOWUP_SENT') ?? 0, limit: limits.followUps },
    quotesSent: { used: byMetric.get('QUOTE_SENT') ?? 0, limit: limits.quotesSent },
    seats: limits.seats,
  };
}
