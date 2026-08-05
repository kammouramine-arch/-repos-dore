import { NAVIGATION } from '@/config';
import type { Coordinates, UserPosition } from '@/core/domain/entities/geo';
import type { NavigationProgress } from '@/core/domain/entities/navigation';
import {
  bearingBetween,
  distanceBetween,
  projectOnPath,
  vertexAtDistance,
  type ProjectionOnPath,
} from '@/utils/geo';
import type { RouteIndex } from './routeIndex';

/**
 * What the tracker needs to remember between two location fixes. Keeping it
 * outside the function makes the whole module pure and trivially testable.
 */
export interface TrackerState {
  segmentIndex: number;
  stepIndex: number;
}

export const initialTrackerState: TrackerState = { segmentIndex: 0, stepIndex: 0 };

export interface TrackingResult {
  progress: NavigationProgress;
  state: TrackerState;
}

/** How far back along the route we allow a fix to snap, to absorb GPS jitter. */
const BACKTRACK_SEGMENTS = 2;

/**
 * How far ahead of the last known position the snap search looks.
 *
 * Generous next to how far a car travels between fixes (2 s at motorway speed
 * is ~70 m), and small enough that the scan stays flat however long the route
 * is. If nothing plausible turns up inside the window we fall back to a full
 * scan — see `REACQUIRE_THRESHOLD_METERS`.
 */
const SEARCH_WINDOW_METERS = 750;

/**
 * When the best in-window candidate is further away than this, the driver is
 * probably not where we last saw them — a tunnel, a resumed app, a car on a
 * train. One full scan re-acquires the route; it is rare enough to afford.
 */
const REACQUIRE_THRESHOLD_METERS = 250;

const distanceTravelled = (index: RouteIndex, segmentIndex: number, t: number): number => {
  const from = index.vertexDistances[segmentIndex] ?? 0;
  const to = index.vertexDistances[segmentIndex + 1] ?? from;
  return from + (to - from) * t;
};

/** First step whose maneuver is still ahead of the driver. */
const resolveStepIndex = (
  index: RouteIndex,
  travelled: number,
  previousStepIndex: number,
): number => {
  const lastIndex = index.route.steps.length - 1;

  for (let step = previousStepIndex; step <= lastIndex; step += 1) {
    if (index.stepEndDistances[step] > travelled) return step;
  }

  return lastIndex;
};

const remainingDuration = (
  index: RouteIndex,
  stepIndex: number,
  distanceToManeuver: number,
): number => {
  const steps = index.route.steps;
  const currentLength = index.stepLengths[stepIndex];
  const currentShare =
    currentLength > 0
      ? (distanceToManeuver / currentLength) * steps[stepIndex].durationSeconds
      : 0;

  return steps
    .slice(stepIndex + 1)
    .reduce((total, step) => total + step.durationSeconds, currentShare);
};

const resolveProjection = (
  position: UserPosition,
  geometry: readonly Coordinates[],
  windowed: ProjectionOnPath,
): ProjectionOnPath => {
  if (windowed.distance <= REACQUIRE_THRESHOLD_METERS) return windowed;

  const full = projectOnPath(position.coordinates, geometry);
  return full && full.distance < windowed.distance ? full : windowed;
};

/**
 * Projects a raw GPS fix onto the active route and derives everything the
 * guidance UI needs. Returns `null` only for a degenerate route with no
 * geometry, which the planner already rejects.
 */
export const trackPosition = (
  index: RouteIndex,
  position: UserPosition,
  previous: TrackerState,
): TrackingResult | null => {
  const geometry = index.route.geometry;
  const searchFrom = Math.max(0, previous.segmentIndex - BACKTRACK_SEGMENTS);
  const searchTo = vertexAtDistance(
    index.vertexDistances,
    (index.vertexDistances[previous.segmentIndex] ?? 0) + SEARCH_WINDOW_METERS,
    searchFrom,
  );

  const windowed = projectOnPath(position.coordinates, geometry, searchFrom, searchTo);
  if (!windowed) return null;

  // Only pay for the whole polyline when the window clearly did not contain the
  // driver, and even then keep the windowed result unless the full scan is
  // genuinely closer — a driver who has simply left the road should reroute,
  // not be teleported onto whichever part of the route happens to be nearest.
  const projection = resolveProjection(position, geometry, windowed);

  const travelled = distanceTravelled(index, projection.segmentIndex, projection.t);
  const stepIndex = resolveStepIndex(index, travelled, previous.stepIndex);
  const steps = index.route.steps;

  const distanceToManeuverMeters = Math.max(
    0,
    index.stepEndDistances[stepIndex] - travelled,
  );
  const remainingDistanceMeters = Math.max(0, index.totalDistanceMeters - travelled);
  const destination = geometry[geometry.length - 1];

  // Falling back to the road's own direction rather than to a bearing measured
  // from the snapped point: when a fix lands exactly on a vertex the two points
  // coincide and the bearing would collapse to zero.
  const segmentStart = geometry[projection.segmentIndex];
  const segmentEnd = geometry[Math.min(projection.segmentIndex + 1, geometry.length - 1)];
  const courseDegrees =
    position.heading != null && position.heading >= 0
      ? position.heading
      : bearingBetween(segmentStart, segmentEnd);

  return {
    state: { segmentIndex: projection.segmentIndex, stepIndex },
    progress: {
      stepIndex,
      currentStep: steps[stepIndex],
      nextStep: steps[stepIndex + 1] ?? null,
      distanceToManeuverMeters,
      remainingDistanceMeters,
      remainingDurationSeconds: remainingDuration(
        index,
        stepIndex,
        distanceToManeuverMeters,
      ),
      snappedPosition: projection.point,
      segmentIndex: projection.segmentIndex,
      distanceFromRouteMeters: projection.distance,
      courseDegrees,
      hasArrived:
        remainingDistanceMeters <= NAVIGATION.arrivalThresholdMeters ||
        distanceBetween(position.coordinates, destination) <=
          NAVIGATION.arrivalThresholdMeters,
    },
  };
};

/**
 * True when this single fix sits outside the route corridor.
 *
 * One fix proves nothing — GPS noise puts a stationary car 60 m sideways
 * regularly — so callers count consecutive hits and ask {@link isOffRoute}.
 */
export const isOffCorridor = (progress: NavigationProgress): boolean =>
  progress.distanceFromRouteMeters > NAVIGATION.offRouteThresholdMeters;

/** True once the driver has been away from the route for long enough to act. */
export const isOffRoute = (
  progress: NavigationProgress,
  consecutiveOffRouteFixes: number,
): boolean =>
  isOffCorridor(progress) &&
  consecutiveOffRouteFixes >= NAVIGATION.offRouteConfirmations;
