import {
  DEFAULT_CATALOGUE,
  METERS,
  OPERATIONS,
  checkOperation,
  currentPeriod,
  describeQuota,
  formatPrice,
  mergeCatalogue,
  objectAllowance,
  planFor,
  planForMoreObjects,
  planForMoreOf,
  resolveEntitlement,
  routeModel,
  yearlySaving,
  type Catalogue,
  type SubscriptionRecord,
} from '@shared/plans';

const NOW = new Date('2026-03-10T12:00:00Z');
const iso = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString();

const sub = (over: Partial<SubscriptionRecord>): SubscriptionRecord => ({
  tier: 'plus',
  status: 'active',
  current_period_start: iso(-10),
  current_period_end: iso(20),
  ...over,
});

describe('catalogue shape', () => {
  it('defines every meter on every plan, so a quota is never undefined', () => {
    for (const tier of DEFAULT_CATALOGUE.order) {
      const plan = DEFAULT_CATALOGUE.plans[tier];
      for (const meter of METERS) {
        expect(typeof plan.quotas[meter]).toBe('number');
      }
    }
  });

  it('gives each paid tier more AI than the one below it', () => {
    const free = DEFAULT_CATALOGUE.plans.free.quotas.ai_requests;
    const plus = DEFAULT_CATALOGUE.plans.plus.quotas.ai_requests;
    const pro = DEFAULT_CATALOGUE.plans.pro.quotas.ai_requests;
    expect(plus).toBeGreaterThan(free);
    expect(pro).toBeGreaterThan(plus);
  });

  it('keeps Ultra defined but not on sale until its capabilities exist', () => {
    expect(DEFAULT_CATALOGUE.plans.ultra.available).toBe(false);
    expect(DEFAULT_CATALOGUE.plans.ultra.entitlements).toContain('AI_AGENTS');
  });

  it('gives the free plan a genuinely usable product, not a demo', () => {
    const free = DEFAULT_CATALOGUE.plans.free;
    expect(free.quotas.ai_requests).toBeGreaterThanOrEqual(100);
    expect(free.entitlements).toContain('PLANNING_BASIC');
    expect(free.entitlements).toContain('LIFE_RESET_BASIC');
    expect(free.entitlements).toContain('VOICE_BASIC');
    expect(free.quotas.life_resets).toBeGreaterThan(0);
    expect(free.quotas.voice_seconds).toBeGreaterThan(0);
  });

  it('never promises "unlimited" anywhere in the plan copy', () => {
    const copy = JSON.stringify(DEFAULT_CATALOGUE).toLowerCase();
    expect(copy).not.toContain('unlimited');
  });

  it('describes a generous allowance as fair use rather than a countdown', () => {
    expect(describeQuota(DEFAULT_CATALOGUE.plans.plus, 'ai_requests')).toMatch(/fair use/i);
    expect(describeQuota(DEFAULT_CATALOGUE.plans.free, 'ai_requests')).toMatch(/\d/);
    expect(describeQuota(DEFAULT_CATALOGUE.plans.free, 'agent_runs')).toBe('Not included');
  });
});

describe('resolveEntitlement', () => {
  it('treats no subscription as Free', () => {
    const result = resolveEntitlement(DEFAULT_CATALOGUE, null, NOW);
    expect(result.tier).toBe('free');
    expect(result.isPaid).toBe(false);
  });

  it('grants the plan while a trial is running', () => {
    const result = resolveEntitlement(
      DEFAULT_CATALOGUE,
      sub({ status: 'trialing', trial_ends_at: iso(3) }),
      NOW,
    );
    expect(result.tier).toBe('plus');
    expect(result.isTrial).toBe(true);
    expect(result.accessUntil).toBe(iso(3));
  });

  it('drops to Free when the trial has run out', () => {
    const result = resolveEntitlement(
      DEFAULT_CATALOGUE,
      sub({ status: 'trialing', trial_ends_at: iso(-1) }),
      NOW,
    );
    expect(result.tier).toBe('free');
    expect(result.status).toBe('expired');
  });

  it('keeps a cancelled subscription until the period they paid for ends', () => {
    const stillPaid = resolveEntitlement(
      DEFAULT_CATALOGUE,
      sub({ status: 'canceled', current_period_end: iso(5) }),
      NOW,
    );
    expect(stillPaid.tier).toBe('plus');

    const finished = resolveEntitlement(
      DEFAULT_CATALOGUE,
      sub({ status: 'canceled', current_period_end: iso(-1) }),
      NOW,
    );
    expect(finished.tier).toBe('free');
  });

  it('honours a billing grace period', () => {
    const result = resolveEntitlement(
      DEFAULT_CATALOGUE,
      sub({ status: 'grace_period', grace_until: iso(2) }),
      NOW,
    );
    expect(result.tier).toBe('plus');
    expect(result.isPaid).toBe(true);
  });

  it('expires an active subscription whose period has passed', () => {
    const result = resolveEntitlement(
      DEFAULT_CATALOGUE,
      sub({ status: 'active', current_period_end: iso(-2) }),
      NOW,
    );
    expect(result.tier).toBe('free');
    expect(result.status).toBe('expired');
  });

  it('never removes anything but AI capability on downgrade', () => {
    // The entitlement result describes capabilities only — there is no notion of
    // deleting or hiding user data anywhere in it.
    const downgraded = resolveEntitlement(
      DEFAULT_CATALOGUE,
      sub({ status: 'expired', current_period_end: iso(-30) }),
      NOW,
    );
    expect(Object.keys(downgraded)).toEqual(
      expect.arrayContaining(['tier', 'plan', 'status', 'entitlements', 'quotas']),
    );
    expect(JSON.stringify(downgraded)).not.toMatch(/delete|remove|purge/i);
  });
});

describe('weighted usage', () => {
  it('charges a heavy operation more than a quick question', () => {
    const chat = OPERATIONS.chat.costs.ai_requests ?? 0;
    const ninety = OPERATIONS.ninety_day.costs.ai_requests ?? 0;
    expect(ninety).toBeGreaterThan(chat);
  });

  it('allows an operation while the allowance covers it', () => {
    const entitlement = resolveEntitlement(DEFAULT_CATALOGUE, sub({}), NOW);
    const result = checkOperation(DEFAULT_CATALOGUE, entitlement, 'chat', { ai_requests: 10 });
    expect(result.allowed).toBe(true);
  });

  it('refuses when the next request would cross the limit, and names the upgrade', () => {
    const entitlement = resolveEntitlement(DEFAULT_CATALOGUE, null, NOW);
    const limit = entitlement.quotas.ai_requests;
    const result = checkOperation(DEFAULT_CATALOGUE, entitlement, 'chat', { ai_requests: limit });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('quota_exceeded');
      expect(result.meter).toBe('ai_requests');
      expect(result.upgradeTo?.tier).toBe('plus');
    }
  });

  it('refuses a capability the plan does not have, before counting anything', () => {
    const entitlement = resolveEntitlement(DEFAULT_CATALOGUE, null, NOW);
    const result = checkOperation(DEFAULT_CATALOGUE, entitlement, 'ninety_day', {});

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('not_entitled');
      expect(result.required).toBe('PLANNING_ADVANCED');
      expect(result.upgradeTo?.tier).toBe('plus');
    }
  });

  it('scales a metered operation by its multiplier — voice by the second', () => {
    const entitlement = resolveEntitlement(DEFAULT_CATALOGUE, null, NOW);
    const short = checkOperation(DEFAULT_CATALOGUE, entitlement, 'voice_transcription', {}, 30);
    expect(short.allowed).toBe(true);
    if (short.allowed) expect(short.costs.voice_seconds).toBe(30);

    const tooLong = checkOperation(
      DEFAULT_CATALOGUE,
      entitlement,
      'voice_transcription',
      {},
      entitlement.quotas.voice_seconds + 1,
    );
    expect(tooLong.allowed).toBe(false);
  });

  it('blocks an operation whose meter is not included at all', () => {
    const entitlement = resolveEntitlement(DEFAULT_CATALOGUE, sub({ tier: 'pro' }), NOW);
    const result = checkOperation(DEFAULT_CATALOGUE, entitlement, 'agent_run', {});
    expect(result.allowed).toBe(false);
  });
});

describe('model routing', () => {
  it('gives each tier its configured model, never a hardcoded one', () => {
    const free = routeModel(resolveEntitlement(DEFAULT_CATALOGUE, null, NOW), 'chat');
    const pro = routeModel(resolveEntitlement(DEFAULT_CATALOGUE, sub({ tier: 'pro' }), NOW), 'chat');

    expect(free.model).toBe(DEFAULT_CATALOGUE.plans.free.models.model);
    expect(pro.model).toBe(DEFAULT_CATALOGUE.plans.pro.models.model);
  });

  it('raises effort for advanced work when the plan has advanced reasoning', () => {
    const pro = resolveEntitlement(DEFAULT_CATALOGUE, sub({ tier: 'pro' }), NOW);
    const ordinary = routeModel(pro, 'chat');
    const deep = routeModel(pro, 'ninety_day');
    expect(deep.effort).not.toBe(ordinary.effort);
  });

  it('does not give priority processing to plans without the entitlement', () => {
    expect(routeModel(resolveEntitlement(DEFAULT_CATALOGUE, sub({}), NOW), 'chat').priority).toBe(false);
    expect(routeModel(resolveEntitlement(DEFAULT_CATALOGUE, sub({ tier: 'pro' }), NOW), 'chat').priority).toBe(true);
  });
});

describe('runtime configuration', () => {
  it('changes a price without restating the plan', () => {
    const catalogue = mergeCatalogue(DEFAULT_CATALOGUE, {
      plans: { plus: { pricing: { monthly: { amount: 799 } } } },
    } as never);

    expect(catalogue.plans.plus.pricing.monthly?.amount).toBe(799);
    expect(catalogue.plans.plus.pricing.monthly?.productId).toBe(
      DEFAULT_CATALOGUE.plans.plus.pricing.monthly?.productId,
    );
    expect(catalogue.plans.plus.quotas.ai_requests).toBe(DEFAULT_CATALOGUE.plans.plus.quotas.ai_requests);
  });

  it('changes a quota, a model and a trial length from configuration', () => {
    const catalogue = mergeCatalogue(DEFAULT_CATALOGUE, {
      plans: {
        free: { quotas: { ai_requests: 40 }, trialDays: 14 },
        pro: { models: { model: 'some-other-model' } },
      },
    } as never);

    expect(catalogue.plans.free.quotas.ai_requests).toBe(40);
    expect(catalogue.plans.free.trialDays).toBe(14);
    expect(catalogue.plans.pro.models.model).toBe('some-other-model');
  });

  it('can switch a future plan on', () => {
    const catalogue: Catalogue = mergeCatalogue(DEFAULT_CATALOGUE, {
      plans: { ultra: { available: true } },
    } as never);
    expect(catalogue.plans.ultra.available).toBe(true);
    expect(planFor(catalogue, 'AI_AGENTS')?.tier).toBe('ultra');
  });

  it('ignores a missing override entirely', () => {
    expect(mergeCatalogue(DEFAULT_CATALOGUE, null)).toBe(DEFAULT_CATALOGUE);
  });
});

describe('upgrade targeting', () => {
  it('offers the cheapest plan that has the capability', () => {
    expect(planFor(DEFAULT_CATALOGUE, 'PLANNING_ADVANCED')?.tier).toBe('plus');
    expect(planFor(DEFAULT_CATALOGUE, 'ADVANCED_REASONING')?.tier).toBe('pro');
  });

  it('offers the cheapest plan with a bigger allowance', () => {
    const free = DEFAULT_CATALOGUE.plans.free.quotas.ai_requests;
    expect(planForMoreOf(DEFAULT_CATALOGUE, 'ai_requests', free)?.tier).toBe('plus');
  });

  it('returns nothing when no available plan offers a capability', () => {
    expect(planFor(DEFAULT_CATALOGUE, 'AI_AGENTS')).toBeNull();
  });
});

describe('object allowances', () => {
  it('caps the free plan and points at the plan that does not', () => {
    const free = DEFAULT_CATALOGUE.plans.free;
    expect(objectAllowance(free, 'goals', 3).atLimit).toBe(true);
    expect(objectAllowance(free, 'goals', 2).atLimit).toBe(false);
    expect(planForMoreObjects(DEFAULT_CATALOGUE, 'goals', free.objectLimits.goals)?.tier).toBe('plus');
  });

  it('does not ration rows on a paid plan', () => {
    const allowance = objectAllowance(DEFAULT_CATALOGUE.plans.plus, 'projects', 50);
    expect(allowance.capped).toBe(false);
    expect(allowance.atLimit).toBe(false);
  });
});

describe('billing periods', () => {
  it('follows the subscription period when there is one', () => {
    const period = currentPeriod(sub({ current_period_start: iso(-5), current_period_end: iso(25) }), NOW);
    expect(period.start).toBe(iso(-5).slice(0, 10));
  });

  it('falls back to the calendar month for free accounts', () => {
    const period = currentPeriod(null, NOW);
    expect(period.start).toBe('2026-03-01');
    expect(period.end).toBe('2026-04-01');
  });

  it('ignores a stale period that has already ended', () => {
    const period = currentPeriod(sub({ current_period_start: iso(-90), current_period_end: iso(-60) }), NOW);
    expect(period.start).toBe('2026-03-01');
  });
});

describe('pricing presentation', () => {
  it('formats money from minor units', () => {
    expect(formatPrice({ amount: 999, currency: 'EUR', productId: 'x' })).toMatch(/9[.,]99/);
    expect(formatPrice(null)).toBe('Free');
  });

  it('only claims a yearly saving when there is one', () => {
    expect(yearlySaving(DEFAULT_CATALOGUE.plans.plus)).toBeGreaterThan(0);
    expect(yearlySaving(DEFAULT_CATALOGUE.plans.free)).toBeNull();

    const noSaving = {
      ...DEFAULT_CATALOGUE.plans.plus,
      pricing: {
        monthly: { amount: 999, currency: 'EUR', productId: 'm' },
        yearly: { amount: 11988, currency: 'EUR', productId: 'y' },
      },
    };
    expect(yearlySaving(noSaving)).toBeNull();
  });
});
