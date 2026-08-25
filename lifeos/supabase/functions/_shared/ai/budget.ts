/**
 * The monetary budget, which is deliberately separate from the operation allowance.
 *
 * An allowance answers "how many things may this user do"; a budget answers "how much
 * may those things cost us". They are different questions: 500 cheap agent runs and 500
 * expensive ones consume the same allowance and very different amounts of money. The
 * allowance is the user-facing promise; the budget is what keeps the promise fundable.
 *
 * The reservation itself is done in Postgres — see `reserve_ai_budget` — because two
 * concurrent requests must not both be told there is money left. This module holds the
 * pure decisions so they can be tested without a database.
 */

import type { Tier } from '../plans.ts';

export type BudgetPolicy = {
  /** USD a user of this tier may cost us per period. */
  monthlyCeiling: number;
  /** USD any single request may cost, however much budget remains. */
  perRequestMax: number;
  /** USD one agent run may cost across all of its model calls. */
  perAgentRunMax: number;
  /** Model calls one agent run may make before it is stopped. */
  maxAgentCalls: number;
  /** Tool calls allowed inside a single request. */
  maxToolCallsPerRequest: number;
  /** Input tokens allowed in one request. */
  maxContextTokens: number;
  maxOutputTokens: number;
  /** Requests per day that may use an `advanced` or better model. */
  maxExpensivePerDay: number;
};

/**
 * Approved starting configuration. These are internal safety limits, not the
 * user-facing product promise, and they are overridable from `app_config` so tuning
 * them never needs a release.
 */
export const DEFAULT_BUDGETS: Record<Tier, BudgetPolicy> = {
  free: {
    monthlyCeiling: 0.15, perRequestMax: 0.01, perAgentRunMax: 0, maxAgentCalls: 0,
    maxToolCallsPerRequest: 4, maxContextTokens: 16_000, maxOutputTokens: 1_000,
    maxExpensivePerDay: 0,
  },
  plus: {
    monthlyCeiling: 3.20, perRequestMax: 0.06, perAgentRunMax: 0, maxAgentCalls: 0,
    maxToolCallsPerRequest: 8, maxContextTokens: 64_000, maxOutputTokens: 2_000,
    maxExpensivePerDay: 10,
  },
  pro: {
    monthlyCeiling: 7.50, perRequestMax: 0.15, perAgentRunMax: 0.60, maxAgentCalls: 12,
    maxToolCallsPerRequest: 12, maxContextTokens: 200_000, maxOutputTokens: 4_000,
    maxExpensivePerDay: 30,
  },
  ultra: {
    monthlyCeiling: 16.00, perRequestMax: 0.40, perAgentRunMax: 1.20, maxAgentCalls: 20,
    maxToolCallsPerRequest: 20, maxContextTokens: 400_000, maxOutputTokens: 8_000,
    maxExpensivePerDay: 80,
  },
};

/**
 * Below this share of the ceiling the user is routed normally; above it the router is
 * told to prefer cheaper models. Degrading quality beats refusing service, and it beats
 * a surprise bill.
 */
export const DEGRADE_AT = 0.9;

export type BudgetState = {
  spent: number;
  ceiling: number;
};

export function remaining(state: BudgetState): number {
  return Math.max(0, state.ceiling - state.spent);
}

export function shouldDegrade(state: BudgetState): boolean {
  if (state.ceiling <= 0) return true;
  return state.spent / state.ceiling >= DEGRADE_AT;
}

export type AffordCheck =
  | { ok: true; ceiling: number }
  | { ok: false; reason: 'per_request' | 'budget_exhausted'; ceiling: number };

/**
 * The ceiling a single request may spend: the smaller of the per-request cap and what
 * is actually left. Returning the minimum is what stops the last request of the month
 * from overspending the budget by the width of the per-request cap.
 */
export function affordability(policy: BudgetPolicy, state: BudgetState, estimate: number): AffordCheck {
  const left = remaining(state);
  const ceiling = Math.min(policy.perRequestMax, left);
  if (left <= 0) return { ok: false, reason: 'budget_exhausted', ceiling: 0 };
  if (estimate > ceiling) {
    return { ok: false, reason: estimate > policy.perRequestMax ? 'per_request' : 'budget_exhausted', ceiling };
  }
  return { ok: true, ceiling };
}

export type AgentBudget = {
  callsMade: number;
  spent: number;
};

/** Stops an agent loop before it becomes the reason a month's budget disappeared. */
export function agentMayContinue(
  policy: BudgetPolicy,
  used: AgentBudget,
): { ok: true } | { ok: false; reason: 'max_calls' | 'max_spend' } {
  if (used.callsMade >= policy.maxAgentCalls) return { ok: false, reason: 'max_calls' };
  if (used.spent >= policy.perAgentRunMax) return { ok: false, reason: 'max_spend' };
  return { ok: true };
}
