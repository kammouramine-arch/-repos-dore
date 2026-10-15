import type { Coordinates } from '@/core/domain/entities/geo';
import type { RouteIndex } from './routeIndex';
import { distanceBetween } from '@/utils/geo';

/** A bounded portion of the planned path; this is never presented as a driven trace. */
export function roadLookahead(index: RouteIndex, segment: number, current: Coordinates): Coordinates[] {
  const result: Coordinates[] = [current];
  let remaining = 1000;
  for (let i = segment + 1; i < index.route.geometry.length && result.length < 256 && remaining > 0; i++) {
    const point = index.route.geometry[i];
    let last = result[result.length - 1];
    const length = distanceBetween(last, point);
    if (length < .1) continue;
    const steps = Math.ceil(Math.min(length, remaining) / 150);
    const target = Math.min(1, remaining / length);
    const start = last;
    for (let n = 1; n <= steps && result.length < 256; n++) {
      const t = target * n / steps;
      const next = { latitude: start.latitude + (point.latitude - start.latitude) * t, longitude: start.longitude + (point.longitude - start.longitude) * t };
      remaining -= distanceBetween(last, next);
      result.push(next); last = next;
    }
  }
  return result;
}
