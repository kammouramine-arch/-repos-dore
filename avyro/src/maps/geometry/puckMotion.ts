import type { Coordinates } from '@/core/domain/entities/geo';
import { distanceBetween, projectOnPath } from '@/utils/geo';

/** Preserve every bend between fixes instead of tweening diagonally over grass. */
export function puckMotionPath(from: Coordinates, to: Coordinates, geometry?: readonly Coordinates[], endSegment = 0): Coordinates[] {
  if (!geometry || distanceBetween(from, to) > 100) return [from, to];
  const start = projectOnPath(from, geometry, Math.max(0, endSegment - 12), Math.min(geometry.length - 2, endSegment + 1));
  if (!start || start.distance > 20 || start.segmentIndex > endSegment) return [from, to];
  return [from, ...geometry.slice(start.segmentIndex + 1, endSegment + 1), to].filter((p, i, all) => !i || distanceBetween(all[i - 1], p) > .05);
}
