/**
 * The router. Given a request and the registry, decide which model answers.
 *
 * Deliberately deterministic and side-effect free: no model chooses the model, and the
 * same inputs always produce the same ordering, so routing is unit-testable and a
 * production decision can be reproduced exactly.
 *
 * Elimination first, then scoring. A candidate removed by policy can never be scored
 * back in — capability, privacy and budget are hard gates, not weights.
 */

import { activeModels, type ModelConfig, type Registry } from './registry.ts';
import { estimateCost } from './cost.ts';
import { healthWeight, isAvailable, type HealthRecord } from './health.ts';
import {
  type AIRequest, PRIVACY_RANK, QUALITY_RANK, type AIErrorCode,
} from './types.ts';

/**
 * Why a model was eliminated. Typed rather than a message, because the caller needs to
 * distinguish "you are out of money" from "nothing here can do vision" — different
 * problems with different fixes — and matching on prose is how that goes wrong.
 */
export type RejectionCategory =
  | 'billing'
  | 'verification'
  | 'task'
  | 'capability'
  | 'privacy'
  | 'quality'
  | 'context'
  | 'budget'
  | 'health';

export type Rejection = {
  model: string;
  provider: string;
  category: RejectionCategory;
  reason: string;
};

export type Candidate = {
  model: ModelConfig;
  estimatedCost: number;
  score: number;
};

export type RoutingDecision =
  | { ok: true; candidates: Candidate[]; rejected: Rejection[] }
  | { ok: false; code: AIErrorCode; message: string; rejected: Rejection[] };

/** How much each factor matters, per latency requirement. Configuration, not magic. */
const WEIGHTS = {
  realtime: { quality: 0.30, cost: 0.20, speed: 0.40, health: 0.10 },
  normal: { quality: 0.45, cost: 0.30, speed: 0.15, health: 0.10 },
  batch: { quality: 0.55, cost: 0.35, speed: 0.00, health: 0.10 },
} as const;

const SPEED_SCORE = { fast: 1, normal: 0.6, slow: 0.2 } as const;

export type RouteContext = {
  registry: Registry;
  health: Record<string, HealthRecord>;
  now: number;
  /** Set true only where the business has explicitly accepted prepaid funding. */
  allowPrepaidProviders?: boolean;
  /**
   * Production routing requires pricing read from official documentation.
   *
   * A model priced from a secondary source can still be routed to in development, but
   * it must not carry production traffic: an unverified price means the cost engine,
   * the budget ceiling and every margin figure downstream are built on a guess. Set
   * false only in tests and local work.
   */
  requireVerifiedPricing?: boolean;
};

export function modelKey(m: { provider: string; modelId: string }): string {
  return `${m.provider}:${m.modelId}`;
}

/**
 * Orders every eligible model best-first. The caller executes candidates in order, so
 * fallback is simply "the next one that already passed every gate" — a fallback can
 * never violate budget, privacy or capability, because it was filtered by the same rules.
 */
export function route(request: AIRequest, ctx: RouteContext): RoutingDecision {
  const rejected: Rejection[] = [];
  const eligible: Candidate[] = [];
  const candidates: Candidate[] = [];

  const inputTokens = request.metadata?.estimatedInputTokens as number | undefined;
  const tokens = typeof inputTokens === 'number' ? inputTokens : 0;

  for (const model of activeModels(ctx.registry)) {
    const provider = ctx.registry.providers[model.provider];
    const key = modelKey(model);
    const reject = (category: RejectionCategory, reason: string) =>
      rejected.push({ model: model.modelId, provider: model.provider, category, reason });

    // ── Hard gates ────────────────────────────────────────────────────────────
    if (provider.billingMode === 'prepaid' && !ctx.allowPrepaidProviders) {
      reject('billing', 'provider requires prepaid funding and prepaid providers are not enabled');
      continue;
    }
    const verificationRequired = ctx.requireVerifiedPricing !== false;
    if (verificationRequired && model.pricingVerification !== 'official') {
      reject('verification', `pricing is ${model.pricingVerification}, not confirmed from official documentation`);
      continue;
    }
    if (model.supportedTasks.length > 0 && !model.supportedTasks.includes(request.taskType)) {
      reject('task', `model is restricted to ${model.supportedTasks.join(', ')}`);
      continue;
    }
    const missing = request.requiredCapabilities.filter((c) => !model.capabilities.includes(c));
    if (missing.length > 0) {
      reject('capability', `missing capability: ${missing.join(', ')}`);
      continue;
    }
    if (PRIVACY_RANK[request.privacyRequirement] > PRIVACY_RANK[provider.maxPrivacyClass]) {
      reject('privacy', `provider is not cleared for ${request.privacyRequirement} data`);
      continue;
    }
    if (QUALITY_RANK[model.qualityClass] < QUALITY_RANK[request.qualityRequirement]) {
      reject('quality', `quality ${model.qualityClass} is below required ${request.qualityRequirement}`);
      continue;
    }
    if (model.maxContext > 0 && tokens > model.maxContext) {
      reject('context', `context ${tokens} exceeds ${model.maxContext}`);
      continue;
    }

    const cost = estimateCost(model, tokens, request.maxOutputTokens);
    if (cost > request.maxCost) {
      reject('budget', `estimated $${cost.toFixed(5)} exceeds per-request ceiling $${request.maxCost.toFixed(5)}`);
      continue;
    }
    if (cost > request.budgetRemaining) {
      reject('budget', `estimated $${cost.toFixed(5)} exceeds remaining budget $${request.budgetRemaining.toFixed(5)}`);
      continue;
    }
    if (!isAvailable(ctx.health[key], ctx.now)) {
      reject('health', 'circuit breaker is open');
      continue;
    }

    // Scored below, once the whole eligible set is known.
    eligible.push({ model, estimatedCost: cost, score: 0 });
  }

  if (eligible.length === 0) {
    /*
      Report the most actionable cause, not the first one. A model rejected on budget got
      further than one rejected on capability — it could do the job and we could not
      afford it — so budget wins the diagnosis, then privacy, then capability. This is
      the difference between telling a user "you are out of allowance" and "something
      went wrong".
    */
    const has = (c: RejectionCategory) => rejected.some((r) => r.category === c);
    const code: AIErrorCode = has('verification') && !has('budget') && !has('privacy')
      ? 'PROVIDER_CONFIGURATION_ERROR'
      : has('budget')
      ? 'BUDGET_EXCEEDED'
      : has('privacy')
        ? 'PRIVACY_NOT_PERMITTED'
        : has('capability')
          ? 'MODEL_UNSUPPORTED_CAPABILITY'
          : 'NO_ELIGIBLE_MODEL';

    const closest = rejected.find((r) => r.category === 'budget')
      ?? rejected.find((r) => r.category === 'privacy')
      ?? rejected[0];

    return {
      ok: false,
      code,
      message: closest
        ? `No model satisfied this request. Closest: ${closest.provider}/${closest.model} — ${closest.reason}`
        : 'No models are enabled in the registry.',
      rejected,
    };
  }

  /*
    Cost is scored relative to the other candidates, not to the request's ceiling.

    Scoring against the ceiling looks reasonable and is quietly wrong: when a tier allows
    $0.40 per request and every candidate costs under a cent, all of them score ~1.0 on
    cost, quality becomes the only thing that discriminates, and the router picks the
    most expensive model in the registry to answer "hello". Ranking against the actual
    spread keeps a 20x price difference meaningful whatever the ceiling happens to be.
  */
  const costs = eligible.map((c) => c.estimatedCost);
  const cheapest = Math.min(...costs);
  const dearest = Math.max(...costs);
  const spread = dearest - cheapest;

  for (const candidate of eligible) {
    const model = candidate.model;
    const w = WEIGHTS[request.latencyRequirement];

    /*
      Quality is scored as headroom above what the task asked for, with diminishing
      returns. Meeting the bar scores well; exceeding it by two classes adds little,
      because paying for frontier reasoning to plan a Tuesday is not "best experience",
      it is waste. Raising qualityRequirement is how a caller asks for more.
    */
    const headroom = QUALITY_RANK[model.qualityClass] - QUALITY_RANK[request.qualityRequirement];
    const qualityScore = Math.min(1, 0.7 + headroom * 0.15);

    const costScore = spread > 0 ? 1 - (candidate.estimatedCost - cheapest) / spread : 1;
    const speedScore = SPEED_SCORE[model.speedClass];
    const health = healthWeight(ctx.health[modelKey(model)]);

    candidate.score =
      w.quality * qualityScore +
      w.cost * costScore +
      w.speed * speedScore +
      w.health * health;

    candidates.push(candidate);
  }


  candidates.sort((a, b) =>
    b.score - a.score ||
    a.model.fallbackPriority - b.model.fallbackPriority ||
    modelKey(a.model).localeCompare(modelKey(b.model)),
  );

  return { ok: true, candidates, rejected };
}
