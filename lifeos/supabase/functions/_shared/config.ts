import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type Catalogue,
  DEFAULT_CATALOGUE,
  type Meter,
  type Operation,
  type Tier,
  currentPeriod,
  checkOperation,
  mergeCatalogue,
  resolveEntitlement,
  routeModel,
  type Entitlement,
  type SubscriptionRecord,
} from './plans.ts';

/**
 * Loads the effective plan catalogue: the compiled defaults, with any override stored
 * in `app_config.plans` merged on top, and per-tier model overrides from environment
 * variables applied last.
 *
 * That ordering means pricing and quotas can be changed from the database at any
 * time, and a model can be swapped per environment with a secret — neither requires
 * a new app release, and no model name is hardcoded outside the catalogue.
 */

const TIERS: Tier[] = ['free', 'plus', 'pro', 'ultra'];

let cache: { catalogue: Catalogue; loadedAt: number } | null = null;
const CACHE_MS = 60_000;

function applyEnvOverrides(catalogue: Catalogue): Catalogue {
  const plans = { ...catalogue.plans };

  for (const tier of TIERS) {
    const plan = plans[tier];
    if (!plan) continue;

    const model = Deno.env.get(`AI_MODEL_${tier.toUpperCase()}`);
    const effort = Deno.env.get(`AI_EFFORT_${tier.toUpperCase()}`);
    const advanced = Deno.env.get(`AI_MODEL_${tier.toUpperCase()}_ADVANCED`);
    if (!model && !effort && !advanced) continue;

    plans[tier] = {
      ...plan,
      models: {
        ...plan.models,
        ...(model ? { model } : {}),
        ...(effort ? { effort: effort as Catalogue['plans']['free']['models']['effort'] } : {}),
        ...(advanced ? { advancedModel: advanced } : {}),
      },
    };
  }

  return { ...catalogue, plans };
}

export async function loadCatalogue(db: SupabaseClient): Promise<Catalogue> {
  if (cache && Date.now() - cache.loadedAt < CACHE_MS) return cache.catalogue;

  let override: Record<string, unknown> | null = null;
  try {
    const { data } = await db.from('app_config').select('value').eq('key', 'plans').maybeSingle();
    override = (data?.value ?? null) as Record<string, unknown> | null;
  } catch {
    // A configuration read failure must never take the assistant down: the compiled
    // catalogue is a complete, working fallback.
    override = null;
  }

  const catalogue = applyEnvOverrides(mergeCatalogue(DEFAULT_CATALOGUE, override as never));
  cache = { catalogue, loadedAt: Date.now() };
  return catalogue;
}

export type BillingContext = {
  catalogue: Catalogue;
  entitlement: Entitlement;
  period: { start: string; end: string };
  subscription: SubscriptionRecord;
};

/** Everything about what this user is allowed to do, resolved once per request. */
export async function loadBilling(db: SupabaseClient, now = new Date()): Promise<BillingContext> {
  const [catalogue, subscription] = await Promise.all([
    loadCatalogue(db),
    db
      .from('subscriptions')
      .select(
        'tier, status, current_period_start, current_period_end, trial_ends_at, grace_until, will_renew',
      )
      .maybeSingle()
      .then(({ data }) => (data ?? null) as SubscriptionRecord | null),
  ]);

  return {
    catalogue,
    entitlement: resolveEntitlement(catalogue, subscription, now),
    period: currentPeriod(subscription, now),
    subscription: subscription ?? { tier: 'free', status: 'free' },
  };
}

export type SpendResult =
  | { ok: true; spent: Partial<Record<Meter, number>>; model: string; effort: string; priority: boolean }
  | {
      ok: false;
      code: 'not_entitled' | 'quota_exceeded';
      message: string;
      meter?: Meter;
      upgradeTo?: Tier;
      upgradeName?: string;
    };

/**
 * Checks entitlement and allowance, then spends it atomically.
 *
 * Everything metered goes through here — there is no per-screen or per-endpoint quota
 * logic anywhere else. If a later meter in the same operation fails, the earlier ones
 * are refunded so a rejected request costs the user nothing.
 */
export async function spendForOperation(
  admin: SupabaseClient,
  billing: BillingContext,
  userId: string,
  operation: Operation,
  options: { multiplier?: number } = {},
): Promise<SpendResult> {
  const { catalogue, entitlement, period } = billing;

  // Read current usage so the check reflects what has already been spent.
  const { data: rows } = await admin
    .from('usage_counters')
    .select('meter, used')
    .eq('user_id', userId)
    .eq('period_start', period.start);

  const used: Partial<Record<Meter, number>> = {};
  for (const row of rows ?? []) used[row.meter as Meter] = Number(row.used);

  const check = checkOperation(catalogue, entitlement, operation, used, options.multiplier ?? 1);
  const route = routeModel(entitlement, operation);

  if (!check.allowed) {
    const upgrade = check.upgradeTo;
    return {
      ok: false,
      code: check.reason,
      meter: check.meter,
      upgradeTo: upgrade?.tier,
      upgradeName: upgrade?.name,
      message:
        check.reason === 'not_entitled'
          ? upgrade
            ? `That is part of ${upgrade.name}.`
            : 'That capability is not available on your plan.'
          : upgrade
            ? `You have used your ${entitlement.plan.name} allowance for this period. ${upgrade.name} raises it.`
            : 'You have used your allowance for this period.',
    };
  }

  const spent: Partial<Record<Meter, number>> = {};

  for (const [meter, amount] of Object.entries(check.costs) as [Meter, number][]) {
    const { data, error } = await admin.rpc('consume_usage', {
      p_user: userId,
      p_period_start: period.start,
      p_meter: meter,
      p_amount: amount,
      p_limit: entitlement.quotas[meter] ?? 0,
      p_operation: operation,
      p_tier: entitlement.tier,
      p_model: route.model,
    });

    const allowed = Array.isArray(data) ? data[0]?.allowed : (data as { allowed?: boolean })?.allowed;
    if (error || allowed === false) {
      // Lost a race for the last unit — give back whatever this attempt already took.
      await refundAll(admin, userId, period.start, spent);
      const upgrade = catalogue.plans[entitlement.tier === 'free' ? 'plus' : 'pro'];
      return {
        ok: false,
        code: 'quota_exceeded',
        meter,
        upgradeTo: upgrade?.available ? upgrade.tier : undefined,
        upgradeName: upgrade?.available ? upgrade.name : undefined,
        message: 'You have used your allowance for this period.',
      };
    }
    spent[meter] = amount;
  }

  return { ok: true, spent, ...route };
}

export async function refundAll(
  admin: SupabaseClient,
  userId: string,
  periodStart: string,
  spent: Partial<Record<Meter, number>>,
): Promise<void> {
  for (const [meter, amount] of Object.entries(spent) as [Meter, number][]) {
    await admin.rpc('refund_usage', {
      p_user: userId,
      p_period_start: periodStart,
      p_meter: meter,
      p_amount: amount,
    });
  }
}
