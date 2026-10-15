import type { UserPosition } from '@/core/domain/entities/geo';
import { distanceBetween } from '@/utils/geo';

/** Infer a stop only from repeated accurate fixes, never from missing GPS. */
export function createStationarySpeedEstimator() {
  let anchor: UserPosition | null = null;
  return (fix: UserPosition): UserPosition => {
    const valid = fix.accuracy != null && Number.isFinite(fix.accuracy) && fix.accuracy >= 0 && fix.accuracy <= 12;
    if (!valid || (fix.speed != null && fix.speed > .5)) { anchor = null; return fix; }
    if (!anchor || fix.timestamp <= anchor.timestamp || fix.timestamp - anchor.timestamp > 15000 || distanceBetween(anchor.coordinates, fix.coordinates) > 1.5) anchor = fix;
    if (fix.timestamp - anchor.timestamp >= 3000 && (fix.speed == null || fix.speed < 0 || fix.speed < .3)) return { ...fix, speed: 0 };
    return fix;
  };
}
