/**
 * Limitation de débit en mémoire (fenêtre glissante).
 *
 * Suffisant pour une instance unique et pour bloquer le bruteforce ; en
 * production multi-instances, brancher un store partagé via `setRateLimitStore`.
 */
import { AppError } from './errors';

export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  async hit(key: string, windowMs: number) {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      if (this.buckets.size > 10_000) this.sweep(now);
      return fresh;
    }
    existing.count += 1;
    return existing;
  }

  private sweep(now: number) {
    for (const [key, value] of this.buckets) {
      if (value.resetAt <= now) this.buckets.delete(key);
    }
  }
}

let store: RateLimitStore = new MemoryStore();

export function setRateLimitStore(next: RateLimitStore) {
  store = next;
}

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export async function rateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const { count, resetAt } = await store.hit(key, windowMs);
  return { ok: count <= limit, remaining: Math.max(0, limit - count), resetAt };
}

/** Applique une limite et lève une AppError 429 si elle est dépassée. */
export async function enforceRateLimit(options: RateLimitOptions) {
  const result = await rateLimit(options);
  if (!result.ok) {
    const seconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    throw new AppError(
      'RATE_LIMITED',
      `Trop de tentatives. Réessayez dans ${seconds} seconde${seconds > 1 ? 's' : ''}.`,
    );
  }
  return result;
}

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60_000 },
  signup: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 5, windowMs: 60 * 60_000 },
  aiGeneration: { limit: 30, windowMs: 60 * 60_000 },
  publicLeadForm: { limit: 10, windowMs: 60 * 60_000 },
  publicQuoteAction: { limit: 30, windowMs: 60 * 60_000 },
  upload: { limit: 60, windowMs: 60 * 60_000 },
} as const;
