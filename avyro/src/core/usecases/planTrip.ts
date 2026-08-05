import type { Coordinates } from '@/core/domain/entities/geo';
import type { Place } from '@/core/domain/entities/place';
import type { RoutePlan } from '@/core/domain/entities/route';
import { AppError } from '@/core/domain/errors/appError';
import type { RoutingProvider } from '@/core/domain/ports/routingProvider';

interface Dependencies {
  routingProvider: RoutingProvider;
}

export interface PlanTripInput {
  origin: Coordinates;
  destination: Place;
  signal?: AbortSignal;
}

/**
 * Builds the trip the driver is about to preview: the fastest route first,
 * alternatives behind it.
 */
export const createPlanTrip =
  ({ routingProvider }: Dependencies) =>
  async ({ origin, destination, signal }: PlanTripInput): Promise<RoutePlan> => {
    const routes = await routingProvider.getRoutes({
      origin,
      destination: destination.coordinates,
      alternatives: true,
      signal,
    });

    if (routes.length === 0) {
      throw new AppError('no-route', 'No drivable route to that destination.');
    }

    return {
      origin,
      destination,
      routes: [...routes].sort((a, b) => a.durationSeconds - b.durationSeconds),
      createdAt: Date.now(),
    };
  };
