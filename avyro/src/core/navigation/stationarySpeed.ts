import type { UserPosition } from '@/core/domain/entities/geo';
import { distanceBetween } from '@/utils/geo';

/** Infer a stop only from repeated accurate fixes, never from missing GPS. */
export function createStationarySpeedEstimator() {
  let recent: UserPosition[] = [];
  return (fix: UserPosition): UserPosition => {
    const valid = fix.accuracy != null && Number.isFinite(fix.accuracy) && fix.accuracy >= 0 && fix.accuracy <= 12;
    if (!valid || (fix.speed != null && fix.speed > .5)) { recent = []; return fix; }
    const previous = recent.at(-1);
    if (previous && (fix.timestamp <= previous.timestamp || fix.timestamp - previous.timestamp > 15000)) recent = [];
    recent = [...recent.filter(p => fix.timestamp - p.timestamp <= 15000), fix].slice(-64);
    if (recent.length > 1 && fix.timestamp - recent[0].timestamp >= 3000 && recent.every(p => distanceBetween(p.coordinates, fix.coordinates) <= 1.5) && (fix.speed == null || fix.speed < 0 || fix.speed < .3)) return { ...fix, speed: 0 };
    return fix;
  };
}
