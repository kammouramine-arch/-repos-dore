/**
 * Pricing. Every number comes from the registry; nothing is hardcoded here.
 */

import type { ModelConfig } from './registry.ts';
import type { AIUsage } from './types.ts';

/** Roughly four characters per token. Good enough to choose a model and reserve budget. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateRequestTokens(system: string, messages: { content: unknown }[]): number {
  let chars = system.length;
  for (const m of messages) {
    chars += typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length;
  }
  return Math.ceil(chars / 4);
}

/**
 * USD for a given token split. Cached input is priced separately where the provider
 * offers it and falls back to the full input price where it does not — never to zero,
 * which would quietly understate cost.
 */
export function priceFor(model: ModelConfig, usage: AIUsage): number {
  const cachedRate = model.cachedInputPrice ?? model.inputPrice;
  const freshInput = Math.max(0, usage.inputTokens - usage.cachedTokens);
  return (
    (freshInput * model.inputPrice) / 1_000_000 +
    (usage.cachedTokens * cachedRate) / 1_000_000 +
    (usage.outputTokens * model.outputPrice) / 1_000_000
  );
}

/**
 * What a request will cost before it runs. Output is unknowable in advance, so the
 * caller's ceiling is used — deliberately pessimistic, because an estimate that is too
 * low lets a request through that the budget cannot actually afford.
 */
export function estimateCost(model: ModelConfig, inputTokens: number, maxOutputTokens: number): number {
  return priceFor(model, {
    inputTokens,
    outputTokens: Math.min(maxOutputTokens, model.maxOutput || maxOutputTokens),
    cachedTokens: 0,
  });
}

export type CostRecord = {
  estimated: number;
  actual: number;
  accountingMethod: 'metered' | 'estimated';
};

/**
 * Reconciles the estimate against what the provider reported.
 *
 * A provider that returns no usage leaves us with the estimate, and the record says so.
 * Calling an estimate "actual" would corrupt every margin figure downstream.
 */
export function reconcile(model: ModelConfig, estimated: number, reported: AIUsage | null): CostRecord {
  if (!reported || (reported.inputTokens === 0 && reported.outputTokens === 0)) {
    return { estimated, actual: estimated, accountingMethod: 'estimated' };
  }
  return { estimated, actual: priceFor(model, reported), accountingMethod: 'metered' };
}
