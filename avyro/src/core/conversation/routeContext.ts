import type { RouteContext } from '@/core/domain/entities/conversation';
import type { NavigationProgress, NavigationStatus } from '@/core/domain/entities/navigation';
import type { Place } from '@/core/domain/entities/place';
import type { DistanceUnit } from '@/core/domain/entities/preferences';
import type { Route } from '@/core/domain/entities/route';

export interface RouteContextInput {
  navigationState: NavigationStatus;
  destination: Place | null;
  route: Route | null;
  progress: NavigationProgress | null;
  distanceUnit: DistanceUnit;
  /** Injected so arrival times are deterministic under test. */
  now?: number;
}

/** The states in which a trip is actually under way. */
const ACTIVE_STATES: readonly NavigationStatus[] = ['guiding', 'rerouting', 'off-route'];

/**
 * Assembles everything Avyro knows about the drive into one value.
 *
 * Live progress is preferred over the route's own totals: once the driver is
 * moving, "8 km to go" has to mean eight kilometres from *here*, not the length
 * of the trip they started. Before guidance begins there is no progress, so the
 * planned route answers instead — which is what makes "how long is it?" work on
 * the preview screen as well as on the road.
 */
export const buildRouteContext = ({
  navigationState,
  destination,
  route,
  progress,
  distanceUnit,
  now = Date.now(),
}: RouteContextInput): RouteContext => {
  const remainingDistanceMeters =
    progress?.remainingDistanceMeters ?? route?.distanceMeters ?? null;
  const remainingDurationSeconds =
    progress?.remainingDurationSeconds ?? route?.durationSeconds ?? null;

  return {
    navigationState,
    destination,
    route,
    remainingDistanceMeters,
    remainingDurationSeconds,
    arrivalAt:
      remainingDurationSeconds === null
        ? null
        : now + remainingDurationSeconds * 1000,
    distanceUnit,
    isNavigating: ACTIVE_STATES.includes(navigationState) && route !== null,
  };
};
