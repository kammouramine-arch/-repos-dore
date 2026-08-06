import type { Coordinates } from '../entities/geo';
import type { Route } from '../entities/route';

export interface RouteRequest {
  origin: Coordinates;
  destination: Coordinates;
  /**
   * Points to pass through, in order.
   *
   * This is how the cost of a stop is measured: route through the candidate and
   * compare against the trip without it. "Adds three minutes" is a subtraction,
   * not a guess.
   */
  waypoints?: readonly Coordinates[];
  /** Ask for alternatives so the driver can pick a different way round. */
  alternatives?: boolean;
  signal?: AbortSignal;
}

/** Computes drivable routes between two points. */
export interface RoutingProvider {
  getRoutes(request: RouteRequest): Promise<Route[]>;
}
