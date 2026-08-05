import { AppError } from '@/core/domain/errors/appError';

/**
 * Minimal runtime decoding for third-party payloads.
 *
 * `JSON.parse` returns `any`; a cast at the adapter boundary is a promise, not
 * a check. These helpers turn a wrong-shaped response into an `AppError` the
 * UI already knows how to show, instead of a `TypeError` three layers deeper.
 *
 * Deliberately hand-rolled and small: Avyro validates two payload shapes. When
 * that becomes a dozen, replace this file with a schema library — the adapters
 * only depend on the decoded types, not on how the decoding happens.
 */

export type Decoder<T> = (value: unknown, path: string) => T;

const invalid = (path: string, expected: string): never => {
  throw new AppError(
    'invalid-response',
    'The service returned something Avyro could not read.',
    `expected ${expected} at ${path}`,
  );
};

export const asRecord = (value: unknown, path: string): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : invalid(path, 'an object');

export const asArray = (value: unknown, path: string): unknown[] =>
  Array.isArray(value) ? value : invalid(path, 'an array');

export const asString = (value: unknown, path: string): string =>
  typeof value === 'string' ? value : invalid(path, 'a string');

export const asNumber = (value: unknown, path: string): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : invalid(path, 'a finite number');

/** Parses a number that the provider encoded as a string, e.g. `"48.8566"`. */
export const asNumericString = (value: unknown, path: string): number => {
  const parsed = Number.parseFloat(asString(value, path));
  return Number.isFinite(parsed) ? parsed : invalid(path, 'a numeric string');
};

/** `undefined` and `null` both mean absent; anything else must decode. */
export const optional =
  <T>(decode: Decoder<T>): Decoder<T | undefined> =>
  (value, path) =>
    value === undefined || value === null ? undefined : decode(value, path);

/** Every element must decode. Use this wherever a gap would change behaviour. */
export const array =
  <T>(decode: Decoder<T>): Decoder<T[]> =>
  (value, path) =>
    asArray(value, path).map((item, index) => decode(item, `${path}[${index}]`));

/** Decodes each element, dropping the ones that fail rather than the whole list. */
export const lenientArray =
  <T>(decode: Decoder<T>): Decoder<T[]> =>
  (value, path) =>
    asArray(value, path).reduce<T[]>((accumulated, item, index) => {
      try {
        accumulated.push(decode(item, `${path}[${index}]`));
      } catch {
        // One malformed search result must not lose the other seven.
      }
      return accumulated;
    }, []);

export const field = <T>(
  record: Record<string, unknown>,
  key: string,
  decode: Decoder<T>,
  path: string,
): T => decode(record[key], `${path}.${key}`);
