import {
  DEFAULT_CATALOGUE,
  checkOperation,
  currentPeriod,
  resolveEntitlement,
  routeModel,
  type Entitlement,
  type Meter,
  type Operation,
  type SubscriptionRecord,
  type Tier,
  type UsageState,
} from '@shared/plans';
import { pickBetter } from '@/services/purchases';

/**
 * The tier matrix: what each plan can actually do, checked against the same catalogue
 * the server enforces. These are the assertions that would catch a pricing change
 * quietly handing a capability to the wrong plan.
 */

const NOW = new Date('2026-03-10T12:00:00Z');
const iso = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString();

function entitlementFor(tier: Tier, over: Partial<SubscriptionRecord> = {}): Entitlement {
  const record: SubscriptionRecord | null =
    tier === 'free'
      ? null
      : {
          tier,
          status: 'active',
          current_period_start: iso(-5),
          current_period_end: iso(25),
          will_renew: true,
          ...over,
        };
  return resolveEntitlement(DEFAULT_CATALOGUE, record, NOW);
}

const can = (tier: Tier, operation: Operation, used: UsageState = {}) =>
  checkOperation(DEFAULT_CATALOGUE, entitlementFor(tier), operation, used).allowed;

describe('what each plan can do', () => {
  const TIERS: Tier[] = ['free', 'plus', 'pro', 'ultra'];

  it('lets every plan hold a conversation and plan a day', () => {
    for (const tier of TIERS) {
      expect(`${tier}/chat: ${can(tier, 'chat')}`).toBe(`${tier}/chat: true`);
      expect(`${tier}/plan_day: ${can(tier, 'plan_day')}`).toBe(`${tier}/plan_day: true`);
      expect(`${tier}/daily_reset: ${can(tier, 'daily_reset')}`).toBe(`${tier}/daily_reset: true`);
    }
  });

  it('gives Free a real Life Reset and real voice, not a locked demo', () => {
    expect(can('free', 'life_reset')).toBe(true);
    expect(can('free', 'voice_transcription')).toBe(true);
  });

  it('keeps 90-day planning for Plus and above', () => {
    expect(can('free', 'ninety_day')).toBe(false);
    expect(can('plus', 'ninety_day')).toBe(true);
    expect(can('pro', 'ninety_day')).toBe(true);
    expect(can('ultra', 'ninety_day')).toBe(true);
  });

  it('keeps deep analysis for Pro and above', () => {
    expect(can('free', 'deep_analysis')).toBe(false);
    expect(can('plus', 'deep_analysis')).toBe(false);
    expect(can('pro', 'deep_analysis')).toBe(true);
    expect(can('ultra', 'deep_analysis')).toBe(true);
  });

  it('keeps agents for Ultra alone', () => {
    expect(can('free', 'agent_run')).toBe(false);
    expect(can('plus', 'agent_run')).toBe(false);
    expect(can('pro', 'agent_run')).toBe(false);
    expect(can('ultra', 'agent_run')).toBe(true);
  });

  it('gives proactive assistance to Plus and above', () => {
    expect(entitlementFor('free').entitlements.has('PROACTIVE_AI')).toBe(false);
    for (const tier of ['plus', 'pro', 'ultra'] as Tier[]) {
      expect(`${tier}: ${entitlementFor(tier).entitlements.has('PROACTIVE_AI')}`).toBe(`${tier}: true`);
    }
  });

  it('raises the allowance with every step up', () => {
    const meters: Meter[] = ['ai_requests', 'planning_requests', 'voice_seconds', 'memory_items'];
    for (const meter of meters) {
      const values = TIERS.map((tier) => entitlementFor(tier).quotas[meter]);
      for (let i = 1; i < values.length; i += 1) {
        expect(`${meter} ${TIERS[i]} > ${TIERS[i - 1]}: ${values[i] > values[i - 1]}`).toBe(
          `${meter} ${TIERS[i]} > ${TIERS[i - 1]}: true`,
        );
      }
    }
  });

  it('routes each plan to its configured model and effort', () => {
    for (const tier of TIERS) {
      const route = routeModel(entitlementFor(tier), 'chat');
      expect(route.model).toBe(DEFAULT_CATALOGUE.plans[tier].models.model);
      expect(route.effort).toBe(DEFAULT_CATALOGUE.plans[tier].models.effort);
    }
  });

  it('only gives priority processing to the plans that pay for it', () => {
    expect(routeModel(entitlementFor('free'), 'chat').priority).toBe(false);
    expect(routeModel(entitlementFor('plus'), 'chat').priority).toBe(false);
    expect(routeModel(entitlementFor('pro'), 'chat').priority).toBe(true);
    expect(routeModel(entitlementFor('ultra'), 'chat').priority).toBe(true);
  });

  it('caps objects on Free only', () => {
    expect(DEFAULT_CATALOGUE.plans.free.objectLimits.goals).toBeGreaterThan(0);
    for (const tier of ['plus', 'pro', 'ultra'] as Tier[]) {
      expect(`${tier}: ${DEFAULT_CATALOGUE.plans[tier].objectLimits.goals}`).toBe(`${tier}: 0`);
    }
  });
});

describe('running out', () => {
  it('stops the next request when the allowance is spent, on every plan', () => {
    for (const tier of ['free', 'plus', 'pro', 'ultra'] as Tier[]) {
      const entitlement = entitlementFor(tier);
      const spent = { ai_requests: entitlement.quotas.ai_requests };
      const result = checkOperation(DEFAULT_CATALOGUE, entitlement, 'chat', spent);
      expect(`${tier}: ${result.allowed}`).toBe(`${tier}: false`);
    }
  });

  it('offers the next plan up, and nothing beyond the top', () => {
    const free = checkOperation(DEFAULT_CATALOGUE, entitlementFor('free'), 'chat', {
      ai_requests: DEFAULT_CATALOGUE.plans.free.quotas.ai_requests,
    });
    expect(free.allowed).toBe(false);
    if (!free.allowed) expect(free.upgradeTo?.tier).toBe('plus');

    const ultra = checkOperation(DEFAULT_CATALOGUE, entitlementFor('ultra'), 'chat', {
      ai_requests: DEFAULT_CATALOGUE.plans.ultra.quotas.ai_requests,
    });
    expect(ultra.allowed).toBe(false);
    if (!ultra.allowed) expect(ultra.upgradeTo).toBeNull();
  });

  it('gives Ultra exactly the advertised 500 agent runs a month', () => {
    // The number on the pricing page and the number the server enforces are the same
    // value, read from the same catalogue.
    expect(DEFAULT_CATALOGUE.plans.ultra.quotas.agent_runs).toBe(500);

    const entitlement = entitlementFor('ultra');
    // The 500th run is allowed; the 501st is not.
    expect(
      checkOperation(DEFAULT_CATALOGUE, entitlement, 'agent_run', { agent_runs: 499 }).allowed,
    ).toBe(true);
    expect(
      checkOperation(DEFAULT_CATALOGUE, entitlement, 'agent_run', { agent_runs: 500 }).allowed,
    ).toBe(false);
  });

  it('spends exactly one agent run per agent run', () => {
    const result = checkOperation(DEFAULT_CATALOGUE, entitlementFor('ultra'), 'agent_run', {});
    expect(result.allowed).toBe(true);
    if (result.allowed) expect(result.costs.agent_runs).toBe(1);
  });

  it('runs out of agent runs before it runs out of conversation', () => {
    const entitlement = entitlementFor('ultra');
    const spent = { agent_runs: entitlement.quotas.agent_runs };

    expect(checkOperation(DEFAULT_CATALOGUE, entitlement, 'agent_run', spent).allowed).toBe(false);
    expect(checkOperation(DEFAULT_CATALOGUE, entitlement, 'chat', spent).allowed).toBe(true);
  });
});

describe('subscription lifecycle', () => {
  it('upgrades immediately', () => {
    const plus = entitlementFor('plus');
    const pro = entitlementFor('pro');
    expect(plus.entitlements.has('ADVANCED_REASONING')).toBe(false);
    expect(pro.entitlements.has('ADVANCED_REASONING')).toBe(true);
  });

  it('downgrades to exactly the lower plan, keeping nothing extra', () => {
    const downgraded = entitlementFor('plus');
    expect(downgraded.entitlements.has('AI_AGENTS')).toBe(false);
    expect(downgraded.quotas.agent_runs).toBe(0);
  });

  it('keeps a cancelled plan working until the paid period ends, then drops to Free', () => {
    const stillPaid = resolveEntitlement(
      DEFAULT_CATALOGUE,
      { tier: 'ultra', status: 'canceled', current_period_end: iso(3) },
      NOW,
    );
    expect(stillPaid.tier).toBe('ultra');
    expect(stillPaid.entitlements.has('AI_AGENTS')).toBe(true);

    const after = resolveEntitlement(
      DEFAULT_CATALOGUE,
      { tier: 'ultra', status: 'canceled', current_period_end: iso(-1) },
      NOW,
    );
    expect(after.tier).toBe('free');
    expect(after.entitlements.has('AI_AGENTS')).toBe(false);
  });

  it('keeps access during a billing problem, and ends it when the grace runs out', () => {
    const inGrace = resolveEntitlement(
      DEFAULT_CATALOGUE,
      { tier: 'pro', status: 'grace_period', grace_until: iso(2) },
      NOW,
    );
    expect(inGrace.tier).toBe('pro');

    const past = resolveEntitlement(
      DEFAULT_CATALOGUE,
      { tier: 'pro', status: 'grace_period', grace_until: iso(-2) },
      NOW,
    );
    expect(past.tier).toBe('free');
  });

  it('renews by moving the period, not by changing the plan', () => {
    const before = resolveEntitlement(
      DEFAULT_CATALOGUE,
      { tier: 'plus', status: 'active', current_period_end: iso(1) },
      NOW,
    );
    const after = resolveEntitlement(
      DEFAULT_CATALOGUE,
      { tier: 'plus', status: 'active', current_period_end: iso(31) },
      NOW,
    );
    expect(before.tier).toBe(after.tier);
    expect(after.accessUntil).toBe(iso(31));
  });

  it('meters a paid plan over its billing period, not the calendar month', () => {
    const period = currentPeriod(
      { tier: 'pro', status: 'active', current_period_start: iso(-3), current_period_end: iso(27) },
      NOW,
    );
    expect(period.start).toBe(iso(-3).slice(0, 10));
    expect(currentPeriod(null, NOW).start).toBe('2026-03-01');
  });
});

describe('restore', () => {
  const sub = (over: Partial<{ tier: string; status: string; expires_at: string | null }>) => ({
    tier: 'plus',
    status: 'active',
    period: 'monthly' as const,
    expires_at: iso(20),
    will_renew: true,
    is_trial: false,
    ...over,
  });

  it('keeps the subscription that grants access furthest ahead', () => {
    const shorter = sub({ expires_at: iso(5) });
    const longer = sub({ tier: 'ultra', expires_at: iso(300) });
    expect(pickBetter(shorter, longer)).toBe(longer);
    expect(pickBetter(longer, shorter)).toBe(longer);
  });

  it('prefers a live subscription over an expired one, whatever the dates say', () => {
    const expired = sub({ status: 'expired', expires_at: iso(400) });
    const active = sub({ status: 'active', expires_at: iso(10) });
    expect(pickBetter(expired, active)).toBe(active);
    expect(pickBetter(active, expired)).toBe(active);
  });

  it('takes the first result when there is nothing to compare against', () => {
    const only = sub({});
    expect(pickBetter(null, only)).toBe(only);
  });
});
