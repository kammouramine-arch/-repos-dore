import { NAVIGATION } from '@/config';
import type { UserPosition } from '@/core/domain/entities/geo';
import type { NavigationProgress } from '@/core/domain/entities/navigation';
import { bearingBetween, distanceBetween, projectOnPath } from '@/utils/geo';
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
  const projection = projectOnPath(position.coordinates, geometry, searchFrom);
  if (!projection) return null;

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

/** True once the driver has been away from the route for long enough to act. */
export const isOffRoute = (
  progress: NavigationProgress,
  consecutiveOffRouteFixes: number,
): boolean =>
  progress.distanceFromRouteMeters > NAVIGATION.offRouteThresholdMeters &&
  consecutiveOffRouteFixes >= NAVIGATION.offRouteConfirmations;
