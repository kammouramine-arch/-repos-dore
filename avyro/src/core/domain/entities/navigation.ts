import type { Coordinates } from './geo';
import type { RouteStep } from './route';

/** Live state of a trip in progress, recomputed on every location fix. */
export interface NavigationProgress {
  /** Index of the step the driver is currently executing. */
  stepIndex: number;
  currentStep: RouteStep;
  /** The step after the current one, used for the "then…" hint. */
  nextStep: RouteStep | null;
  /** Distance still to drive before the current maneuver, in metres. */
  distanceToManeuverMeters: number;
  /** Distance still to drive to the destination, in metres. */
  remainingDistanceMeters: number;
  /** Time still to drive to the destination, in seconds. */
  remainingDurationSeconds: number;
  /** Position snapped onto the route geometry — what the map should show. */
  snappedPosition: Coordinates;
  /** Geometry segment the snapped position sits on; splits driven from ahead. */
  segmentIndex: number;
  /** How far the raw GPS fix sits from the route, in metres. */
  distanceFromRouteMeters: number;
  /** Direction of travel along the route, in degrees from true north. */
  courseDegrees: number;
  hasArrived: boolean;
}

export type NavigationStatus =
  | 'idle'
  | 'guiding'
  | 'rerouting'
  | 'off-route'
  | 'arrived';
