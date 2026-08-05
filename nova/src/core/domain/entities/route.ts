import type { Coordinates } from './geo';
import type { Place } from './place';

/**
 * Normalised maneuver vocabulary. Routing providers each have their own
 * taxonomy; adapters translate into this list so the UI, the icons and the
 * spoken guidance only ever deal with one set of values.
 */
export type ManeuverType =
  | 'depart'
  | 'straight'
  | 'slight-left'
  | 'slight-right'
  | 'turn-left'
  | 'turn-right'
  | 'sharp-left'
  | 'sharp-right'
  | 'uturn'
  | 'roundabout'
  | 'merge'
  | 'fork'
  | 'ramp'
  | 'arrive';

/**
 * One leg of a route: *drive this far along this road, then do this*.
 *
 * The maneuver belongs to the END of the step, not the start. Routing engines
 * usually model it the other way round; adapters re-align it here because it
 * is the only form a guidance banner can use directly — "in 300 m, turn right"
 * needs the distance of the current leg and the instruction that closes it.
 */
export interface RouteStep {
  id: string;
  /** Driver-facing instruction, e.g. `Turn right onto Rue de Rivoli`. */
  instruction: string;
  maneuver: ManeuverType;
  /** Length of this leg, in metres. */
  distanceMeters: number;
  /** Expected time to drive this leg, in seconds. */
  durationSeconds: number;
  /** Where the maneuver closing this leg happens. */
  location: Coordinates;
  /** Road the driver is on for the length of this leg, when known. */
  roadName?: string;
}

export interface Route {
  id: string;
  distanceMeters: number;
  durationSeconds: number;
  /** Full-resolution geometry, ordered from origin to destination. */
  geometry: Coordinates[];
  steps: RouteStep[];
  /** Human summary of the main roads, e.g. `A6 · N7`. */
  summary: string;
}

/** The result of planning a trip: one origin, one destination, N alternatives. */
export interface RoutePlan {
  origin: Coordinates;
  destination: Place;
  routes: Route[];
  createdAt: number;
}
