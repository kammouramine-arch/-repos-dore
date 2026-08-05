import { NETWORK, env } from '@/config';
import { AppError } from '@/core/domain/errors/appError';

export interface JsonRequestOptions {
  /** Query parameters; `undefined` values are dropped. */
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  /** Caller-owned cancellation, e.g. a superseded search keystroke. */
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** True when a rejection is a cancellation rather than a real failure. */
export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

const buildUrl = (
  url: string,
  query: JsonRequestOptions['query'],
): string => {
  if (!query) return url;

  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return params.length > 0 ? `${url}?${params.join('&')}` : url;
};

/**
 * The single outbound HTTP path for the app.
 *
 * It owns three things the callers should never re-implement: a hard timeout,
 * the identifying `User-Agent` public OSM services require, and the
 * translation of every failure mode into an `AppError`.
 */
export const getJson = async <T>(
  url: string,
  { query, headers, signal, timeoutMs = NETWORK.timeoutMs }: JsonRequestOptions = {},
): Promise<T> => {
  const controller = new AbortController();
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
      throw new AppError(
        response.status === 404 ? 'not-found' : 'network',
        `The service answered with ${response.status}.`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (timedOut) {
      throw new AppError('timeout', 'The request took too long. Try again.');
    }
    if (isAbortError(error)) throw error;
    if (error instanceof AppError) throw error;

    throw new AppError('network', 'Nova could not reach the network.', error);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromCaller);
  }
};
