/**
 * Where the pure AI layer meets the database.
 *
 * Everything in the other files is deliberately side-effect free so it can be tested
 * without a server. This file is the only part that reads configuration, reserves money
 * and writes accounting rows — and it is the only thing the edge functions call.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tier } from '../plans.ts';
import { DEFAULT_REGISTRY, mergeRegistry, type Registry } from './registry.ts';
import { DEFAULT_BUDGETS, type BudgetPolicy, shouldDegrade } from './budget.ts';
import { emptyHealth, type HealthRecord } from './health.ts';
import { runAI, type AttemptRecord, type RunOptions } from './index.ts';
import { AIError, type AIRequest, type AIResponse, TASK_PRIVACY } from './types.ts';
import { route } from './router.ts';
import { AUDIO_ADAPTERS, type TranscriptionRequest, type TranscriptionResult } from './adapters/audio.ts';
import { requireKey } from './adapters/index.ts';

/** The private app_config row holding registry overrides. */
const REGISTRY_KEY = 'ai_registry';
/** The private app_config row holding budget overrides and the migration flag. */
const POLICY_KEY = 'ai_policy';

export type AIPolicy = {
  /**
   * False keeps every AI call on the legacy provider path. This is the migration's
   * rollback: flipping it back needs no deploy, no migration and no code change.
   */
  routerEnabled: boolean;
  allowPrepaidProviders: boolean;
  requireVerifiedPricing: boolean;
  budgets: Record<Tier, BudgetPolicy>;
  maxAttempts: number;
  timeoutMs: number;
};

export const DEFAULT_POLICY: AIPolicy = {
  // Off until the new path has been proven against real providers in staging.
  routerEnabled: false,
  allowPrepaidProviders: false,
  requireVerifiedPricing: true,
  budgets: DEFAULT_BUDGETS,
  maxAttempts: 3,
  timeoutMs: 120_000,
};

export async function loadPolicy(db: SupabaseClient): Promise<AIPolicy> {
  const { data } = await db.from('app_config').select('value').eq('key', POLICY_KEY).maybeSingle();
  const override = (data?.value ?? null) as Partial<AIPolicy> | null;
  if (!override) return DEFAULT_POLICY;
  return {
    ...DEFAULT_POLICY,
    ...override,
    budgets: { ...DEFAULT_POLICY.budgets, ...(override.budgets ?? {}) },
  };
}

export async function loadRegistry(db: SupabaseClient): Promise<Registry> {
  const { data } = await db.from('app_config').select('value').eq('key', REGISTRY_KEY).maybeSingle();
  return mergeRegistry(DEFAULT_REGISTRY, (data?.value ?? null) as any);
}

/** Health is shared across users, so it is read with the service role. */
export async function loadHealth(admin: SupabaseClient): Promise<Record<string, HealthRecord>> {
  const { data } = await admin.from('ai_provider_health').select('*');
  const out: Record<string, HealthRecord> = {};
  for (const row of data ?? []) {
    out[row.key] = {
      key: row.key,
      failures: Number(row.failures ?? 0),
      successes: Number(row.successes ?? 0),
      consecutiveFailures: Number(row.consecutive_failures ?? 0),
      lastFailureAt: row.last_failure_at ? Date.parse(row.last_failure_at) : null,
      openedAt: row.opened_at ? Date.parse(row.opened_at) : null,
      state: row.state ?? 'closed',
    };
  }
  return out;
}

async function persistHealth(admin: SupabaseClient, health: Record<string, HealthRecord>) {
  const rows = Object.values(health).map((h) => ({
    key: h.key,
    provider: h.key.split(':')[0],
    model: h.key.split(':').slice(1).join(':'),
    successes: h.successes,
    failures: h.failures,
    consecutive_failures: h.consecutiveFailures,
    state: h.state,
    opened_at: h.openedAt ? new Date(h.openedAt).toISOString() : null,
    last_failure_at: h.lastFailureAt ? new Date(h.lastFailureAt).toISOString() : null,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length) await admin.from('ai_provider_health').upsert(rows, { onConflict: 'key' });
}

export function periodStart(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export type BudgetSnapshot = {
  spent: number;
  reserved: number;
  ceiling: number;
  remaining: number;
  degraded: boolean;
};

export async function readBudget(
  admin: SupabaseClient,
  userId: string,
  tier: Tier,
  policy: AIPolicy,
  period = periodStart(),
): Promise<BudgetSnapshot> {
  const ceiling = policy.budgets[tier]?.monthlyCeiling ?? 0;
  const { data } = await admin
    .from('ai_budgets')
    .select('spent, reserved')
    .eq('user_id', userId)
    .eq('period_start', period)
    .maybeSingle();

  const spent = Number(data?.spent ?? 0);
  const reserved = Number(data?.reserved ?? 0);
  return {
    spent,
    reserved,
    ceiling,
    remaining: Math.max(0, ceiling - spent - reserved),
    degraded: shouldDegrade({ spent: spent + reserved, ceiling }),
  };
}

/**
 * Runs one AI request end to end with the money handled correctly.
 *
 * Reserve, call, settle. The settle happens in a finally-equivalent path so a thrown
 * provider error still releases the hold — a crash must not leave a user's budget
 * permanently consumed by a request that produced nothing.
 */
export async function runMetered(
  request: AIRequest,
  deps: {
    admin: SupabaseClient;
    registry: Registry;
    policy: AIPolicy;
    health: Record<string, HealthRecord>;
    readKey: RunOptions['readKey'];
    period?: string;
  },
): Promise<AIResponse> {
  const period = deps.period ?? periodStart();
  const tier = request.tier as Tier;
  const ceiling = deps.policy.budgets[tier]?.monthlyCeiling ?? 0;

  // The reservation is the pessimistic estimate; settlement replaces it with the truth.
  const hold = Math.min(request.maxCost, Math.max(0, request.budgetRemaining));
  const { data: reservation } = await deps.admin.rpc('reserve_ai_budget', {
    p_user: request.userId,
    p_period_start: period,
    p_request_id: request.requestId,
    p_amount: hold,
    p_ceiling: ceiling,
  });
  const reserved = Array.isArray(reservation) ? reservation[0] : reservation;
  if (reserved && reserved.allowed === false) {
    throw new AIError('BUDGET_EXCEEDED', 'This month\'s AI allowance is used up.');
  }

  const attempts: AttemptRecord[] = [];
  let settledCost = 0;

  try {
    const response = await runAI(request, {
      registry: deps.registry,
      health: deps.health,
      readKey: deps.readKey,
      allowPrepaidProviders: deps.policy.allowPrepaidProviders,
      requireVerifiedPricing: deps.policy.requireVerifiedPricing,
      maxAttempts: deps.policy.maxAttempts,
      timeoutMs: deps.policy.timeoutMs,
      onAttempt: (record) => { attempts.push(record); },
    } as RunOptions);
    settledCost = response.actualCost;
    return response;
  } finally {
    // Always settle, even on failure. A failed request settles at whatever the
    // successful attempts actually cost — zero when nothing succeeded.
    await deps.admin.rpc('settle_ai_budget', {
      p_user: request.userId,
      p_period_start: period,
      p_request_id: request.requestId,
      p_actual: settledCost,
    });
    if (attempts.length) {
      await deps.admin.from('ai_requests').insert(attempts.map((a) => ({
        user_id: a.userId,
        request_id: a.requestId,
        tier: a.tier,
        task_type: a.taskType,
        provider: a.provider,
        model: a.model,
        input_tokens: a.inputTokens,
        output_tokens: a.outputTokens,
        cached_tokens: a.cachedTokens,
        estimated_cost: a.estimatedCost,
        actual_cost: a.actualCost,
        accounting_method: a.accountingMethod,
        latency_ms: a.latencyMs,
        success: a.success,
        error_code: a.errorCode,
        fallback_used: a.fallbackUsed,
        fallback_reason: a.fallbackReason,
      })));
    }
    await persistHealth(deps.admin, deps.health);
  }
}

/*
  The key reader is supplied by the caller rather than defined here, so this module
  stays free of runtime globals and can be typechecked and unit-tested as plain
  TypeScript. Each edge function passes `(name) => Deno.env.get(name)`.
*/


/**
 * Transcription through the router.
 *
 * Same rule as text: the router chooses, the adapter calls. If no audio model is
 * eligible — which is the case while Whisper's pricing is unverified — this refuses
 * with a clear reason rather than falling back to a hardcoded provider.
 */
export async function transcribeMetered(
  request: TranscriptionRequest,
  deps: {
    userId: string;
    tier: Tier;
    registry: Registry;
    policy: AIPolicy;
    health: Record<string, HealthRecord>;
    readKey: RunOptions['readKey'];
  },
): Promise<TranscriptionResult> {
  const budgetPolicy = deps.policy.budgets[deps.tier];
  const decision = route(
    {
      requestId: request.requestId,
      userId: deps.userId,
      tier: deps.tier,
      taskType: 'transcription',
      system: '',
      messages: [],
      requiredCapabilities: ['audio'],
      qualityRequirement: 'standard',
      latencyRequirement: 'realtime',
      privacyRequirement: TASK_PRIVACY.transcription,
      maxCost: budgetPolicy?.perRequestMax ?? 0,
      maxOutputTokens: 0,
      budgetRemaining: budgetPolicy?.perRequestMax ?? 0,
      metadata: { estimatedInputTokens: 0 },
    },
    {
      registry: deps.registry,
      health: deps.health,
      now: Date.now(),
      allowPrepaidProviders: deps.policy.allowPrepaidProviders,
      requireVerifiedPricing: deps.policy.requireVerifiedPricing,
    },
  );

  if (!decision.ok) {
    throw new AIError(
      decision.code,
      'Voice input has no verified provider configured on this server.',
    );
  }

  for (const candidate of decision.candidates) {
    const provider = deps.registry.providers[candidate.model.provider];
    const adapter = AUDIO_ADAPTERS[candidate.model.provider];
    if (!adapter) continue;
    const key = requireKey(provider, deps.readKey);
    return await adapter(request, candidate.model, provider, key, deps.policy.timeoutMs);
  }

  throw new AIError('MODEL_UNAVAILABLE', 'No audio adapter is available for the selected provider.');
}
