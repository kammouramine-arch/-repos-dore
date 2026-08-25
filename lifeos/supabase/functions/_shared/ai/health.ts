/**
 * Provider health and circuit breaking.
 *
 * A provider having a bad minute must not become a provider LifeOS stops using. The
 * breaker opens after repeated failures, then half-opens on a timer so traffic returns
 * automatically — no human has to remember to switch it back on.
 */

export type BreakerState = 'closed' | 'open' | 'half_open';

export type HealthRecord = {
  key: string;
  failures: number;
  successes: number;
  consecutiveFailures: number;
  lastFailureAt: number | null;
  openedAt: number | null;
  state: BreakerState;
};

export type HealthThresholds = {
  /** Consecutive failures that open the breaker. */
  failureThreshold: number;
  /** How long it stays open before a probe is allowed through, in ms. */
  cooldownMs: number;
};

export const DEFAULT_THRESHOLDS: HealthThresholds = {
  failureThreshold: 5,
  cooldownMs: 60_000,
};

export function emptyHealth(key: string): HealthRecord {
  return {
    key, failures: 0, successes: 0, consecutiveFailures: 0,
    lastFailureAt: null, openedAt: null, state: 'closed',
  };
}

export function recordSuccess(record: HealthRecord): HealthRecord {
  return { ...record, successes: record.successes + 1, consecutiveFailures: 0, openedAt: null, state: 'closed' };
}

export function recordFailure(
  record: HealthRecord,
  now: number,
  thresholds: HealthThresholds = DEFAULT_THRESHOLDS,
): HealthRecord {
  const consecutiveFailures = record.consecutiveFailures + 1;
  const shouldOpen = consecutiveFailures >= thresholds.failureThreshold;
  return {
    ...record,
    failures: record.failures + 1,
    consecutiveFailures,
    lastFailureAt: now,
    openedAt: shouldOpen ? now : record.openedAt,
    state: shouldOpen ? 'open' : record.state,
  };
}

/** Whether traffic may go to this model right now. */
export function isAvailable(
  record: HealthRecord | undefined,
  now: number,
  thresholds: HealthThresholds = DEFAULT_THRESHOLDS,
): boolean {
  if (!record || record.state === 'closed') return true;
  if (record.openedAt === null) return true;
  // Cooldown elapsed: let one request through to find out whether it has recovered.
  return now - record.openedAt >= thresholds.cooldownMs;
}

/**
 * A 0–1 multiplier applied to a model's score. A provider that has been failing is
 * ranked lower rather than eliminated, so a degraded provider is still better than none.
 */
export function healthWeight(record: HealthRecord | undefined): number {
  if (!record) return 1;
  const total = record.successes + record.failures;
  if (total < 5) return 1;
  const rate = record.successes / total;
  return Math.max(0.1, rate);
}
