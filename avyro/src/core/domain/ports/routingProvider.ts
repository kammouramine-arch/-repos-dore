import type { Coordinates } from '../entities/geo';
import type { Route } from '../entities/route';

export interface RouteRequest {
  origin: Coordinates;
  destination: Coordinates;
  /** Ask for alternatives so the driver can pick a different way round. */
  alternatives?: boolean;
  signal?: AbortSignal;
}

/** Computes drivable routes between two points. */
export interface RoutingProvider {
  getRoutes(request: RouteRequest): Promise<Route[]>;
}
