import { env } from '@/config';
import type { Coordinates } from '@/core/domain/entities/geo';
import type { Route, RouteStep } from '@/core/domain/entities/route';
import { AppError } from '@/core/domain/errors/appError';
import type {
  RouteRequest,
  RoutingProvider,
} from '@/core/domain/ports/routingProvider';
import { getJson } from '@/services/http/httpClient';
import { createId } from '@/utils/id';
import { decodePolyline } from '@/utils/polyline';
import { formatInstruction, roadNameOf } from './instructionFormatter';
import { toManeuverType } from './maneuverMapper';
import type { OsrmRoute, OsrmRouteResponse, OsrmStep } from './osrmTypes';

/** OSRM expects `longitude,latitude` pairs separated by semicolons. */
const toWaypoint = ({ latitude, longitude }: Coordinates): string =>
  `${longitude},${latitude}`;

/**
 * Re-aligns OSRM's steps onto Nova's model.
 *
 * OSRM attaches each maneuver to the START of its step ("depart", then drive
 * 300 m). Nova's steps are legs that END in a maneuver, so leg *i* takes its
 * length and road name from OSRM step *i* and its instruction from step *i+1*.
 * The trailing zero-length `arrive` step becomes the last leg's instruction
 * rather than a step of its own.
 */
const toSteps = (
  raw: readonly OsrmStep[],
  route: OsrmRoute,
  geometry: readonly Coordinates[],
): RouteStep[] => {
  const arrival = geometry[geometry.length - 1];

  if (raw.length < 2) {
    return [
      {
        id: createId(),
        instruction: 'Arrive at your destination',
        maneuver: 'arrive',
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        location: arrival,
      },
    ];
  }

  return raw.slice(0, -1).map((step, index) => {
    const closing = raw[index + 1];

    return {
      id: createId(),
      instruction: formatInstruction(closing),
      maneuver: toManeuverType(closing.maneuver),
      distanceMeters: step.distance,
      durationSeconds: step.duration,
      location: {
        latitude: closing.maneuver.location[1],
        longitude: closing.maneuver.location[0],
      },
      roadName: roadNameOf(step),
    };
  });
};

/** `A6 · N7` — the two main roads, which is what a driver actually scans for. */
const summaryOf = (route: OsrmRoute, steps: RouteStep[]): string => {
  const provided = route.legs?.[0]?.summary?.trim();
  if (provided) return provided.split(',').map((part) => part.trim()).join(' · ');

  const roads = steps
    .map((step) => step.roadName)
    .filter((name): name is string => Boolean(name));

  return [...new Set(roads)].slice(0, 2).join(' · ') || 'Fastest route';
};

const toRoute = (route: OsrmRoute): Route => {
  const geometry = decodePolyline(route.geometry, 6);
  const steps = toSteps(
    (route.legs ?? []).flatMap((leg) => leg.steps ?? []),
    route,
    geometry,
  );

  return {
    id: createId(),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry,
    steps,
    summary: summaryOf(route, steps),
  };
};

/**
 * OSRM-compatible route planner.
 *
 * The default endpoint is the OSRM demo server: excellent for development,
 * explicitly not for production traffic. Point `EXPO_PUBLIC_ROUTING_BASE_URL`
 * at your own instance — the contract is unchanged.
 */
export const createOsrmRoutingProvider = (
  baseUrl: string = env.routingBaseUrl,
): RoutingProvider => ({
  async getRoutes({
    origin,
    destination,
    alternatives = true,
    signal,
  }: RouteRequest): Promise<Route[]> {
    const waypoints = `${toWaypoint(origin)};${toWaypoint(destination)}`;

    const response = await getJson<OsrmRouteResponse>(
      `${baseUrl}/route/v1/driving/${waypoints}`,
      {
        query: {
          overview: 'full',
          geometries: 'polyline6',
          steps: true,
          alternatives,
        },
        signal,
      },
    );

    if (response.code !== 'Ok') {
      throw response.code === 'NoRoute'
        ? new AppError('no-route', 'No drivable route to that destination.')
        : new AppError('network', response.message ?? 'Route planning failed.');
    }

    return (response.routes ?? [])
      .map(toRoute)
      .filter((route) => route.geometry.length > 1);
  },
});
