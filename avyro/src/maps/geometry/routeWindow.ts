import type { Coordinates } from '@/core/domain/entities/geo';
import type { RouteIndex } from '@/core/navigation/routeIndex';
import { vertexAtDistance } from '@/utils/geo';

/**
 * How much route to keep on screen during guidance, either side of the driver.
 *
 * The guidance camera sits at zoom ~17.5, where the viewport is a few hundred
 * metres across, so these bounds are far outside anything visible — the drawn
 * result is identical, at a fraction of the cost. A driver who pinches all the
 * way out mid-trip sees the line stop; that is the one visible trade, and it
 * buys not re-serialising tens of thousands of coordinates to the native map
 * every second on a long route.
 */
export const ROUTE_WINDOW = {
  behindMeters: 500,
  aheadMeters: 3_000,
} as const;

export interface RouteWindowVertices {
  /** Route vertices behind the driver, oldest first. */
  behind: Coordinates[];
  /** Route vertices ahead of the driver, nearest first. */
  ahead: Coordinates[];
}

/**
 * Slices the geometry around the driver's current segment.
 *
 * Returns vertices only — the snapped position is joined on by the caller, so
 * this result changes once per segment rather than once per fix and can be
 * memoised on `segmentIndex`.
 */
export const sliceRouteWindow = (
  index: RouteIndex,
  segmentIndex: number,
): RouteWindowVertices => {
  const { vertexDistances, route } = index;
  const clamped = Math.min(
    Math.max(0, segmentIndex),
    Math.max(0, route.geometry.length - 1),
  );
  const travelled = vertexDistances[clamped] ?? 0;

  const first = vertexAtDistance(
    vertexDistances,
    travelled - ROUTE_WINDOW.behindMeters,
  );
  const last = vertexAtDistance(
    vertexDistances,
    travelled + ROUTE_WINDOW.aheadMeters,
    clamped,
  );

  return {
    behind: route.geometry.slice(first, clamped + 1),
    ahead: route.geometry.slice(clamped + 1, last + 1),
  };
};
