import type { Route } from '@/core/domain/entities/route';
import { cumulativeDistances, projectOnPath } from '@/utils/geo';

/**
 * Pre-computed lookup tables for a route, built once when guidance starts.
 *
 * Everything is expressed in "distance travelled along the geometry", which
 * makes every per-fix calculation a subtraction instead of a scan. Step
 * lengths reported by the routing engine are rescaled onto the same metric so
 * the two never drift apart over a long trip.
 */
export interface RouteIndex {
  route: Route;
  /** Distance from the start of the route to each geometry vertex. */
  vertexDistances: number[];
  /** Distance along the route at which each step's maneuver happens. */
  stepEndDistances: number[];
  /** Length of each step on the geometry metric. */
  stepLengths: number[];
  totalDistanceMeters: number;
}

export const createRouteIndex = (route: Route): RouteIndex => {
  const vertexDistances = cumulativeDistances(route.geometry);
  const totalDistanceMeters = vertexDistances[vertexDistances.length - 1] ?? 0;

  const declaredTotal = route.steps.reduce(
    (total, step) => total + step.distanceMeters,
    0,
  );
  const scale = declaredTotal > 0 ? totalDistanceMeters / declaredTotal : 1;

  const stepLengths: number[] = [];
  const stepEndDistances: number[] = [];
  let travelled = 0;
  let lastSegment = 0;

  route.steps.forEach((step) => {
    // Anchor each instruction to its actual maneuver coordinate. Rescaling all
    // declared lengths accumulates error and can announce a turn on another street.
    const supplied = step.geometryIndex;
    const projected = Number.isInteger(supplied) && supplied! >= 0 && supplied! < route.geometry.length
      ? projectOnPath(step.location, route.geometry, Math.max(lastSegment, supplied! - 1), Math.min(route.geometry.length - 2, supplied! + 1))
      : projectOnPath(step.location, route.geometry, lastSegment);
    const anchor = projected && projected.distance <= 30
      ? (vertexDistances[projected.segmentIndex] ?? 0) + ((vertexDistances[projected.segmentIndex + 1] ?? 0) - (vertexDistances[projected.segmentIndex] ?? 0)) * projected.t
      : travelled + step.distanceMeters * scale;
    const end = Math.max(travelled, Math.min(totalDistanceMeters, anchor));
    const length = end - travelled;
    travelled = end;
    if (projected && projected.distance <= 30) lastSegment = projected.segmentIndex;
    stepLengths.push(length);
    stepEndDistances.push(travelled);
  });

  return {
    route,
    vertexDistances,
    stepEndDistances,
    stepLengths,
    totalDistanceMeters,
  };
};
