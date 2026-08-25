import {
  DEFAULT_BUDGETS, DEGRADE_AT, affordability, agentMayContinue, remaining, shouldDegrade,
} from '@shared/ai/budget';

describe('budget policy', () => {
  it('matches the approved ceilings', () => {
    expect(DEFAULT_BUDGETS.free.monthlyCeiling).toBe(0.15);
    expect(DEFAULT_BUDGETS.plus.monthlyCeiling).toBe(3.20);
    expect(DEFAULT_BUDGETS.pro.monthlyCeiling).toBe(7.50);
    expect(DEFAULT_BUDGETS.ultra.monthlyCeiling).toBe(16.00);
  });

  it('gives agents only to Pro and Ultra', () => {
    expect(DEFAULT_BUDGETS.free.maxAgentCalls).toBe(0);
    expect(DEFAULT_BUDGETS.plus.maxAgentCalls).toBe(0);
    expect(DEFAULT_BUDGETS.pro.maxAgentCalls).toBeGreaterThan(0);
    expect(DEFAULT_BUDGETS.ultra.maxAgentCalls).toBeGreaterThan(0);
  });

  it('raises every limit monotonically with tier', () => {
    const order = ['free', 'plus', 'pro', 'ultra'] as const;
    for (let i = 1; i < order.length; i++) {
      const lower = DEFAULT_BUDGETS[order[i - 1]];
      const higher = DEFAULT_BUDGETS[order[i]];
      expect(higher.monthlyCeiling).toBeGreaterThan(lower.monthlyCeiling);
      expect(higher.perRequestMax).toBeGreaterThan(lower.perRequestMax);
      expect(higher.maxToolCallsPerRequest).toBeGreaterThanOrEqual(lower.maxToolCallsPerRequest);
      expect(higher.maxContextTokens).toBeGreaterThanOrEqual(lower.maxContextTokens);
    }
  });

  it('keeps every monthly ceiling below the subscription price', () => {
    // Revenue in USD at ~1.08/EUR. A ceiling above this would sell at a loss.
    const revenue = { free: 0, plus: 10.79, pro: 21.59, ultra: 53.99 };
    for (const tier of ['plus', 'pro', 'ultra'] as const) {
      expect(DEFAULT_BUDGETS[tier].monthlyCeiling).toBeLessThan(revenue[tier] * 0.4);
    }
  });
});

describe('affordability', () => {
  it('allows a request that fits', () => {
    const r = affordability(DEFAULT_BUDGETS.pro, { spent: 1, ceiling: 7.5 }, 0.01);
    expect(r.ok).toBe(true);
  });

  it('caps a request at what is actually left, not at the per-request maximum', () => {
    // $0.05 left but the tier allows $0.15 per request: the ceiling must be $0.05.
    const r = affordability(DEFAULT_BUDGETS.pro, { spent: 7.45, ceiling: 7.5 }, 0.01);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ceiling).toBeCloseTo(0.05, 8);
  });

  it('refuses a single request that exceeds the per-request maximum', () => {
    const r = affordability(DEFAULT_BUDGETS.pro, { spent: 0, ceiling: 7.5 }, 5);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('per_request');
  });

  it('refuses everything once the budget is exhausted', () => {
    const r = affordability(DEFAULT_BUDGETS.pro, { spent: 7.5, ceiling: 7.5 }, 0.0001);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('budget_exhausted');
  });

  it('never reports negative remaining budget', () => {
    expect(remaining({ spent: 99, ceiling: 7.5 })).toBe(0);
  });
});

describe('graceful degradation', () => {
  it('degrades near the ceiling instead of refusing', () => {
    expect(shouldDegrade({ spent: 7.5 * DEGRADE_AT, ceiling: 7.5 })).toBe(true);
    expect(shouldDegrade({ spent: 1, ceiling: 7.5 })).toBe(false);
  });

  it('treats a zero ceiling as always degraded', () => {
    expect(shouldDegrade({ spent: 0, ceiling: 0 })).toBe(true);
  });
});

describe('agent budgets', () => {
  it('stops an agent at its call limit', () => {
    const r = agentMayContinue(DEFAULT_BUDGETS.ultra, { callsMade: 20, spent: 0 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('max_calls');
  });

  it('stops an agent at its spend limit', () => {
    const r = agentMayContinue(DEFAULT_BUDGETS.ultra, { callsMade: 1, spent: 1.2 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('max_spend');
  });

  it('lets an agent inside both limits continue', () => {
    expect(agentMayContinue(DEFAULT_BUDGETS.ultra, { callsMade: 3, spent: 0.1 }).ok).toBe(true);
  });

  it('never lets an agent run on a tier without agents', () => {
    expect(agentMayContinue(DEFAULT_BUDGETS.free, { callsMade: 0, spent: 0 }).ok).toBe(false);
    expect(agentMayContinue(DEFAULT_BUDGETS.plus, { callsMade: 0, spent: 0 }).ok).toBe(false);
  });

  it('keeps one agent run inside the monthly ceiling many times over', () => {
    const runs = DEFAULT_BUDGETS.ultra.monthlyCeiling / DEFAULT_BUDGETS.ultra.perAgentRunMax;
    expect(runs).toBeGreaterThanOrEqual(13);
  });
});
