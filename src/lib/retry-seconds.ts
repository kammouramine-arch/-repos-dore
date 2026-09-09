/** Accept only explicit delays; never render malformed server values as a timer. */
export function retrySeconds(value: unknown, header: string | null): number {
  for (const candidate of [value, header]) {
    if (candidate === null || candidate === undefined || candidate === '') continue;
    const seconds = typeof candidate === 'number' ? candidate : typeof candidate === 'string' && /^\d+(\.\d+)?$/.test(candidate) ? Number(candidate) : NaN;
    if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  }
  return 0;
}
