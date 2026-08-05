/** Subset of the OSRM `route` service payload that Avyro consumes. */

export interface OsrmManeuver {
  /** `[longitude, latitude]`, as GeoJSON orders them. */
  location: [number, number];
  bearing_after?: number;
  bearing_before?: number;
  type?: string;
  modifier?: string;
  exit?: number;
}

export interface OsrmStep {
  distance: number;
  duration: number;
  name?: string;
  ref?: string;
  maneuver: OsrmManeuver;
}

export interface OsrmLeg {
  distance: number;
  duration: number;
  summary?: string;
  steps?: OsrmStep[];
}

export interface OsrmRoute {
  distance: number;
  duration: number;
  /** Encoded polyline, at the precision requested via `geometries`. */
  geometry: string;
  legs?: OsrmLeg[];
}

export interface OsrmRouteResponse {
  code: string;
  message?: string;
  routes?: OsrmRoute[];
}
