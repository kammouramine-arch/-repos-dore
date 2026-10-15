import type { UserPosition } from '@/core/domain/entities/geo';

/** A display tick can precede a newly received fix by up to one second. */
export function measuredSpeed(fix: UserPosition | null, tick: number): number | null {
  if (!fix || fix.timestamp > tick + 1000 || tick - fix.timestamp >= 10000 ||
      fix.accuracy === null || !Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.accuracy > 30 ||
      fix.speed === null || !Number.isFinite(fix.speed) || fix.speed < 0) return null;
  return fix.speed;
}

export function aboveMappedLimit(speed: number | null, limit: { value: number; unit: 'km/h' | 'mph' } | null | undefined): boolean {
  if (speed === null || !limit) return false;
  const threshold = limit.unit === 'mph' ? limit.value * 1609.344 / 3600 : limit.value / 3.6;
  // Floating conversion alone must not turn exactly 30 km/h into an excess.
  return speed > threshold + 1e-9;
}
