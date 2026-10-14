import type { UserPosition } from '@/core/domain/entities/geo';

/** A display tick can precede a newly received fix by up to one second. */
export function measuredSpeed(fix: UserPosition | null, tick: number): number | null {
  if (!fix || fix.timestamp > tick + 1000 || tick - fix.timestamp >= 10000 ||
      fix.accuracy === null || !Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.accuracy > 30 ||
      fix.speed === null || !Number.isFinite(fix.speed) || fix.speed < 0) return null;
  return fix.speed;
}

export function aboveMappedLimit(speed: number | null, limit: { value: number; unit: 'km/h' | 'mph' } | null | undefined): boolean {
  return speed !== null && !!limit && speed * (limit.unit === 'mph' ? 2.236936 : 3.6) > limit.value;
}
