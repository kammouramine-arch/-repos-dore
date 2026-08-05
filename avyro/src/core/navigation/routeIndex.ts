import type { Route } from '@/core/domain/entities/route';
import { cumulativeDistances } from '@/utils/geo';

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

  route.steps.forEach((step) => {
    const length = step.distanceMeters * scale;
    travelled += length;
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
