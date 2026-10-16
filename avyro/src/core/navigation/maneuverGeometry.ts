import type { Coordinates } from '@/core/domain/entities/geo';
import type { ManeuverType, Route, RouteStep } from '@/core/domain/entities/route';
import { bearingBetween, cumulativeDistances } from '@/utils/geo';
import { createRouteIndex } from './routeIndex';

/**
 * Checks each turn instruction against the shape of the route it describes.
 *
 * The routing engine labels a maneuver from its own junction model, and that
 * model can disagree with the line it hands back. EJXG3453 (0:02–0:22): the
 * route crosses a divided boulevard and carries straight on along Avenue Denis
 * Cordonnier, yet the banner read "Tournez à droite sur Avenue Denis
 * Cordonnier" — a turn onto the road the car was already on, with no turn in
 * the drawn route. A driver looking for a right turn that is not there is a
 * driver not watching the road.
 *
 * The polyline is what the car will actually drive, so it is the evidence.
 * The angle is *measured*, from the route's own geometry a fixed distance
 * either side of the maneuver point. Nothing is removed: a step onto the same
 * road that the geometry shows is not a turn is relabelled as what it is
 * ("continue straight"), and its distance and position are untouched. That is
 * the only correction; everything else is left as the provider said.
 */

/** How far either side of the maneuver point the road's direction is read. */
const ARM_METERS = 30;
/**
 * A deflection this small, staying on the same named road, is a kink at a
 * junction, not a turn the driver performs. Comfortably under the ~45° at
 * which "slight" maneuvers begin, so no genuine turn is ever relabelled.
 */
const NOT_A_TURN_DEGREES = 25;
/**
 * Only full and sharp turns are checked. A "bear left/right" onto the same
 * road is usually a fork where the lane matters, so it is left alone. And a
 * provider's left/right is never flipped from geometry: slip roads and loops
 * make the line near a junction a poor witness for which way the driver turns.
 */
const CHECKED = new Set<ManeuverType>(['turn-left', 'turn-right', 'sharp-left', 'sharp-right']);

/** Point `target` metres along a polyline, clamped to its ends. */
const pointAlong = (
  geometry: readonly Coordinates[],
  cumulative: readonly number[],
  target: number,
): Coordinates => {
  if (target <= 0) return geometry[0];
  const last = geometry.length - 1;
  if (target >= cumulative[last]) return geometry[last];
  let i = 1;
  while (i < last && cumulative[i] < target) i += 1;
  const from = cumulative[i - 1];
  const span = cumulative[i] - from || 1;
  const t = (target - from) / span;
  const a = geometry[i - 1];
  const b = geometry[i];
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
};

/**
 * Signed deflection at `alongMeters`, in degrees: positive turns right,
 * negative left. Null when there is not enough route either side to judge.
 */
export const measuredDeflection = (
  geometry: readonly Coordinates[],
  alongMeters: number,
  cumulative: readonly number[] = cumulativeDistances(geometry),
): number | null => {
  const total = cumulative[cumulative.length - 1] ?? 0;
  if (alongMeters - ARM_METERS < 0 || alongMeters + ARM_METERS > total) return null;
  const before = pointAlong(geometry, cumulative, alongMeters - ARM_METERS);
  const at = pointAlong(geometry, cumulative, alongMeters);
  const after = pointAlong(geometry, cumulative, alongMeters + ARM_METERS);
  const incoming = bearingBetween(before, at);
  const outgoing = bearingBetween(at, after);
  return ((outgoing - incoming + 540) % 360) - 180;
};

const sameRoad = (a?: string, b?: string) =>
  !!a && !!b && a.trim().toLocaleLowerCase('fr') === b.trim().toLocaleLowerCase('fr');

const straightOn = (step: RouteStep, road?: string): RouteStep => ({
  ...step,
  maneuver: 'straight',
  instruction: road ? `Continue straight on ${road}` : 'Continue straight',
  instructionFr: road ? `Continuez tout droit sur ${road}` : 'Continuez tout droit',
});

export interface ManeuverCorrection {
  stepIndex: number;
  from: ManeuverType;
  to: ManeuverType;
  measuredDegrees: number;
}

/**
 * The route with each turn instruction agreeing with its own geometry, plus
 * what was changed so it can be logged.
 */
export const reconcileManeuvers = (
  route: Route,
): { route: Route; corrections: ManeuverCorrection[] } => {
  const index = createRouteIndex(route);
  const corrections: ManeuverCorrection[] = [];

  const steps = route.steps.map((step, k) => {
    if (!CHECKED.has(step.maneuver)) return step;

    const angle = measuredDeflection(route.geometry, index.stepEndDistances[k], index.vertexDistances);
    if (angle == null) return step;

    // The road taken after this maneuver is the one driven during the next leg.
    const target = route.steps[k + 1]?.roadName;

    if (Math.abs(angle) < NOT_A_TURN_DEGREES && sameRoad(step.roadName, target)) {
      corrections.push({ stepIndex: k, from: step.maneuver, to: 'straight', measuredDegrees: angle });
      return straightOn(step, target);
    }

    return step;
  });

  return corrections.length ? { route: { ...route, steps }, corrections } : { route, corrections };
};
