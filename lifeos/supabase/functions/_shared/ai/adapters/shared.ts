/**
 * Helpers every adapter needs: error normalization and a fetch that cannot hang.
 */

import { AIError, type AIErrorCode } from '../types.ts';

/**
 * Maps an HTTP status onto a LifeOS error code.
 *
 * The distinction that matters is retryable versus not: a 429 or a 503 is worth trying
 * the next candidate for, a 400 is our bug and trying another provider would just
 * produce the same 400 more slowly.
 */
export function codeForStatus(status: number): AIErrorCode {
  if (status === 401 || status === 403) return 'PROVIDER_AUTH_ERROR';
  if (status === 404) return 'MODEL_UNAVAILABLE';
  if (status === 429) return 'PROVIDER_RATE_LIMIT';
  if (status === 408 || status === 504) return 'PROVIDER_TIMEOUT';
  if (status === 529 || status === 503 || status === 502) return 'PROVIDER_OVERLOAD';
  if (status >= 500) return 'UNKNOWN_PROVIDER_ERROR';
  if (status === 400) return 'PROVIDER_CONFIGURATION_ERROR';
  return 'UNKNOWN_PROVIDER_ERROR';
}

/** Keeps provider prose out of user-facing errors while preserving it for the log. */
export function providerError(provider: string, status: number, body: string): AIError {
  const code = codeForStatus(status);
  const detail = body.slice(0, 400);
  return new AIError(code, `${provider} returned ${status}: ${detail}`, {
    retryable: code !== 'PROVIDER_CONFIGURATION_ERROR' && code !== 'PROVIDER_AUTH_ERROR',
    status,
  });
}

/**
 * A request that never returns would hold an isolate — and the user's reserved budget —
 * open indefinitely. Every provider call goes through this.
 */
export async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  provider: string,
): Promise<{ status: number; json: any; requestId: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* keep the raw text below */ }
    if (!res.ok) throw providerError(provider, res.status, text);
    return {
      status: res.status,
      json,
      requestId: res.headers.get('x-request-id') ?? res.headers.get('request-id'),
    };
  } catch (e: any) {
    if (e instanceof AIError) throw e;
    if (e?.name === 'AbortError') {
      throw new AIError('PROVIDER_TIMEOUT', `${provider} did not respond within ${timeoutMs}ms`, { retryable: true });
    }
    throw new AIError('UNKNOWN_PROVIDER_ERROR', `${provider}: ${e?.message ?? 'request failed'}`, { retryable: true });
  } finally {
    clearTimeout(timer);
  }
}

let counter = 0;
/** Stable ids for tool calls from providers that do not supply their own. */
export function syntheticToolId(name: string): string {
  counter += 1;
  return `call_${name}_${counter}`;
}
