import type { Coordinates } from '@/core/domain/entities/geo';
import type { RouteIndex } from '@/core/navigation/routeIndex';
import { distanceBetween, projectOnPath } from '@/utils/geo';

/**
 * Where a candidate stop sits relative to the drive.
 *
 * This is the difference between a voice assistant and a driving companion. A
 * café 800 m away is useless information; a café 800 m away *behind you, across
 * a central reservation* is worse than useless. What matters is whether it is
 * on the way.
 */

export interface RoutePosition {
  /** Distance along the route at which the stop is closest, in metres. */
  travelledMeters: number;
  /** How far the stop sits from the road itself, in metres. */
  lateralMeters: number;
  /** Index of the geometry segment it is nearest to. */
  segmentIndex: number;
}

/** Locates a coordinate against a route's geometry. */
export const locateOnRoute = (
  index: RouteIndex,
  point: Coordinates,
): RoutePosition | null => {
  const projection = projectOnPath(point, index.route.geometry);
  if (!projection) return null;

  const from = index.vertexDistances[projection.segmentIndex] ?? 0;
  const to = index.vertexDistances[projection.segmentIndex + 1] ?? from;

  return {
    travelledMeters: from + (to - from) * projection.t,
    lateralMeters: projection.distance,
    segmentIndex: projection.segmentIndex,
  };
};

export interface AheadOptions {
  /**
   * How far from the road a stop can be and still count as "on the route".
   *
   * Generous enough for a retail park set back from a trunk road, tight enough
   * to exclude somewhere on the far side of a motorway.
   */
  corridorMeters?: number;
  /**
   * How far ahead of the driver a stop must be to be worth turning off for.
   *
   * Anything nearer is already being passed by the time Avyro finishes the
   * sentence.
   */
  minimumLeadMeters?: number;
}

export const AHEAD_DEFAULTS = {
  corridorMeters: 700,
  minimumLeadMeters: 250,
} as const;

/**
 * True when a stop is in front of the driver and near enough to the route.
 *
 * `drivenMeters` is how far along the route the driver already is — everything
 * behind that is a U-turn, whatever the straight-line distance says.
 */
export const isAheadOnRoute = (
  position: RoutePosition,
  drivenMeters: number,
  {
    corridorMeters = AHEAD_DEFAULTS.corridorMeters,
    minimumLeadMeters = AHEAD_DEFAULTS.minimumLeadMeters,
  }: AheadOptions = {},
): boolean =>
  position.lateralMeters <= corridorMeters &&
  position.travelledMeters >= drivenMeters + minimumLeadMeters;

/**
 * How far the driver has already come along the route.
 *
 * Derived from the snapped location rather than tracked separately, so it stays
 * correct after a reroute replaces the geometry underneath it.
 */
export const drivenDistance = (
  index: RouteIndex,
  location: Coordinates | null,
): number => {
  if (!location) return 0;
  return locateOnRoute(index, location)?.travelledMeters ?? 0;
};

/** Straight-line distance, for the case where there is no route to measure against. */
export const directDistance = (from: Coordinates | null, to: Coordinates): number =>
  from ? distanceBetween(from, to) : Number.POSITIVE_INFINITY;
