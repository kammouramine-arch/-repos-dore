/**
 * LifeOS AI — the single entry point.
 *
 * Callers pass an AIRequest and receive an AIResponse. They never learn which provider
 * answered, and they cannot reach one directly: the adapters are only imported here.
 *
 * The order below is the whole design. Eligibility is decided before any money is
 * reserved, money is reserved before any provider is called, and what actually happened
 * is reconciled against the estimate afterwards — including when the call fails.
 */

import type { AIRequest, AIResponse } from './types.ts';
import { AIError, RETRYABLE_CODES } from './types.ts';
import { type Registry, activeModels } from './registry.ts';
import { route, modelKey, type RouteContext } from './router.ts';
import { reconcile } from './cost.ts';
import { ADAPTERS, requireKey, type KeyReader } from './adapters/index.ts';
import { recordFailure, recordSuccess, emptyHealth, type HealthRecord } from './health.ts';

export type RunOptions = {
  registry: Registry;
  health: Record<string, HealthRecord>;
  readKey: KeyReader;
  now?: () => number;
  timeoutMs?: number;
  allowPrepaidProviders?: boolean;
  /** Production requires officially documented pricing; see RouteContext. */
  requireVerifiedPricing?: boolean;
  /** How many candidates to try before giving up. 1 disables fallback. */
  maxAttempts?: number;
  /** Called once per attempt, successful or not, so every attempt is accounted for. */
  onAttempt?: (record: AttemptRecord) => void | Promise<void>;
};

export type AttemptRecord = {
  requestId: string;
  userId: string;
  tier: string;
  taskType: string;
  provider: string;
  model: string;
  estimatedCost: number;
  actualCost: number;
  accountingMethod: 'metered' | 'estimated';
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  latencyMs: number;
  success: boolean;
  errorCode: string | null;
  fallbackUsed: boolean;
  fallbackReason: string | null;
};

export async function runAI(request: AIRequest, options: RunOptions): Promise<AIResponse> {
  const now = options.now ?? (() => Date.now());
  const ctx: RouteContext = {
    registry: options.registry,
    health: options.health,
    now: now(),
    allowPrepaidProviders: options.allowPrepaidProviders,
    requireVerifiedPricing: options.requireVerifiedPricing,
  };

  const decision = route(request, ctx);
  if (!decision.ok) {
    throw new AIError(decision.code, decision.message);
  }

  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const attempts = decision.candidates.slice(0, maxAttempts);
  let lastError: AIError | null = null;

  for (let i = 0; i < attempts.length; i++) {
    const { model, estimatedCost } = attempts[i];
    const provider = options.registry.providers[model.provider];
    const key = modelKey(model);
    const isFallback = i > 0;
    const fallbackReason = isFallback ? (lastError?.code ?? 'unknown') : null;
    const started = now();

    try {
      const apiKey = requireKey(provider, options.readKey);
      const adapter = ADAPTERS[model.provider];
      const raw = await adapter(request, model, provider, apiKey, options.timeoutMs ?? 120_000);

      const cost = reconcile(model, estimatedCost, raw.usage);
      options.health[key] = recordSuccess(options.health[key] ?? emptyHealth(key));

      const response: AIResponse = {
        ...raw,
        estimatedCost: cost.estimated,
        actualCost: cost.actual,
        accountingMethod: cost.accountingMethod,
        fallbackUsed: isFallback,
        fallbackReason,
      };

      await options.onAttempt?.({
        requestId: request.requestId, userId: request.userId, tier: request.tier,
        taskType: request.taskType, provider: model.provider, model: model.modelId,
        estimatedCost: cost.estimated, actualCost: cost.actual,
        accountingMethod: cost.accountingMethod,
        inputTokens: raw.usage.inputTokens, outputTokens: raw.usage.outputTokens,
        cachedTokens: raw.usage.cachedTokens, latencyMs: raw.latencyMs,
        success: true, errorCode: null, fallbackUsed: isFallback, fallbackReason,
      });

      return response;
    } catch (e) {
      const error = e instanceof AIError
        ? e
        : new AIError('UNKNOWN_PROVIDER_ERROR', e instanceof Error ? e.message : 'failed', { retryable: true });
      lastError = error;
      options.health[key] = recordFailure(options.health[key] ?? emptyHealth(key), now());

      /*
        A failed attempt still costs latency and may have burned provider quota, so it is
        recorded — but at zero cost, because nothing usable was produced and the user
        must not be charged for our failure.
      */
      await options.onAttempt?.({
        requestId: request.requestId, userId: request.userId, tier: request.tier,
        taskType: request.taskType, provider: model.provider, model: model.modelId,
        estimatedCost, actualCost: 0, accountingMethod: 'estimated',
        inputTokens: 0, outputTokens: 0, cachedTokens: 0, latencyMs: now() - started,
        success: false, errorCode: error.code, fallbackUsed: isFallback, fallbackReason,
      });

      // A configuration or auth fault will repeat identically on the next candidate of
      // the same shape, and a non-retryable error means our request was wrong.
      if (!RETRYABLE_CODES.includes(error.code)) throw error;
    }
  }

  throw lastError ?? new AIError('NO_ELIGIBLE_MODEL', 'Every candidate model failed.');
}

/** Diagnostics for the smoke test and the admin surface. Never includes keys. */
export function describeRegistry(registry: Registry) {
  const active = activeModels(registry);
  return {
    version: registry.version,
    providersEnabled: Object.values(registry.providers).filter((p) => p.enabled).map((p) => p.provider),
    providersDisabled: Object.values(registry.providers).filter((p) => !p.enabled).map((p) => p.provider),
    activeModels: active.map((m) => `${m.provider}:${m.modelId}`),
    unverifiedPricing: active.filter((m) => m.pricingVerification !== 'official')
      .map((m) => `${m.provider}:${m.modelId}`),
  };
}

export * from './types.ts';
export * from './registry.ts';
export { route } from './router.ts';
export * from './budget.ts';
