import { NETWORK, env } from '@/config';
import { AppError } from '@/core/domain/errors/appError';
import type { Logger } from '@/core/domain/ports/logger';
import type { Decoder } from './decode';

export interface JsonRequestOptions {
  /** Query parameters; `undefined` values are dropped. */
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  /** Caller-owned cancellation, e.g. a superseded search keystroke. */
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Names the request in logs, e.g. `places.search`. */
  operation?: string;
}

/** True when a rejection is a cancellation rather than a real failure. */
export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

export interface HttpClient {
  /**
   * Fetches JSON and decodes it. The decoder is required, not optional: an
   * undecoded response is an untyped one, and there is no safe default.
   */
  getJson<T>(
    url: string,
    decode: Decoder<T>,
    options?: JsonRequestOptions,
  ): Promise<T>;
}

const buildUrl = (url: string, query: JsonRequestOptions['query']): string => {
  if (!query) return url;

  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return params.length > 0 ? `${url}?${params.join('&')}` : url;
};

/**
 * The single outbound HTTP path for the app.
 *
 * It owns four things the callers should never re-implement: a hard timeout,
 * the identifying `User-Agent` public OSM services require, the translation of
 * every failure mode into an `AppError`, and validation of what came back.
 */
export const createHttpClient = (logger: Logger): HttpClient => {
  const scoped = logger.scoped('http');

  return {
    async getJson<T>(
      url: string,
      decode: Decoder<T>,
      {
        query,
        headers,
        signal,
        timeoutMs = NETWORK.timeoutMs,
        operation = 'request',
      }: JsonRequestOptions = {},
    ): Promise<T> {
      const controller = new AbortController();
      const startedAt = Date.now();
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);

      const abortFromCaller = () => controller.abort();
      if (signal?.aborted) abortFromCaller();
      signal?.addEventListener('abort', abortFromCaller);

      try {
        const response = await fetch(buildUrl(url, query), {
          method: 'GET',
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'User-Agent': env.userAgent,
            ...headers,
          },
        });

        if (!response.ok) {
          scoped.warn('request rejected', {
            operation,
            status: response.status,
            durationMs: Date.now() - startedAt,
          });
          throw new AppError(
            response.status === 404 ? 'not-found' : 'network',
            `The service answered with ${response.status}.`,
          );
        }

        const decoded = decode(await response.json(), operation);
        scoped.debug('request complete', {
          operation,
          durationMs: Date.now() - startedAt,
        });
        return decoded;
      } catch (error) {
        if (timedOut) {
          scoped.warn('request timed out', { operation, timeoutMs });
          throw new AppError('timeout', 'The request took too long. Try again.');
        }
        if (isAbortError(error)) throw error;
        if (error instanceof AppError) {
          if (error.code === 'invalid-response') {
            scoped.error('undecodable response', error, { operation });
          }
          throw error;
        }

        scoped.warn('request failed', { operation, reason: String(error) });
        throw new AppError('network', 'Avyro could not reach the network.', error);
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abortFromCaller);
      }
    },
  };
};
