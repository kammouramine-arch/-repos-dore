import { CONVERSATION, RECOMMENDATION } from '@/config';
import {
  directDistance,
  drivenDistance,
  isAheadOnRoute,
  locateOnRoute,
} from '@/core/conversation/detour';
import { rankStops } from '@/core/conversation/rankStops';
import type {
  NearbyCategory,
  RouteContext,
  StopSuggestion,
} from '@/core/domain/entities/conversation';
import type { Place } from '@/core/domain/entities/place';
import type { Logger } from '@/core/domain/ports/logger';
import type { PlacesProvider } from '@/core/domain/ports/placesProvider';
import type { RoutingProvider } from '@/core/domain/ports/routingProvider';
import { createRouteIndex } from '@/core/navigation/routeIndex';

/** What each category is actually searched for. */
const SEARCH_TERMS: Record<NearbyCategory, string> = {
  restaurants: 'restaurant',
  coffee: 'cafe',
  fuel: 'fuel station',
  parking: 'parking',
};

export interface RecommenderOptions {
  placesProvider: PlacesProvider;
  routingProvider: RoutingProvider;
  logger: Logger;
}

export interface StopRecommender {
  /** Best-first suggestions for a category, measured against the current drive. */
  suggest(
    category: NearbyCategory,
    context: RouteContext,
    signal?: AbortSignal,
  ): Promise<StopSuggestion[]>;
}

/**
 * Turns "I need coffee" into a stop worth making.
 *
 * The expensive part is honest: for each candidate it routes
 * `here → candidate → destination` and subtracts the trip without it. That is
 * the only way to say "adds three minutes" and mean it. Candidates are capped
 * (`RECOMMENDATION.maxCandidates`) because each one is a routing request, and a
 * driver is waiting.
 *
 * With no trip planned there is nothing to detour from, so it falls back to
 * proximity — which is the honest answer to "coffee near me" when there is no
 * "on the way" to speak of.
 */
export const createRouteAwareRecommender = ({
  placesProvider,
  routingProvider,
  logger,
}: RecommenderOptions): StopRecommender => {
  const scoped = logger.scoped('conversation.recommend');

  /** What the remaining trip costs without stopping anywhere. */
  const baseline = async (
    context: RouteContext,
    signal?: AbortSignal,
  ): Promise<number | null> => {
    if (!context.location || !context.destination) return null;

    try {
      const [direct] = await routingProvider.getRoutes({
        origin: context.location,
        destination: context.destination.coordinates,
        alternatives: false,
        signal,
      });
      return direct?.durationSeconds ?? null;
    } catch (error) {
      scoped.warn('baseline route failed', { reason: String(error) });
      return null;
    }
  };

  /** What the trip costs if the driver stops here on the way. */
  const priceStop = async (
    place: Place,
    context: RouteContext,
    baselineSeconds: number,
    signal?: AbortSignal,
  ): Promise<{ detourSeconds: number; detourMeters: number } | null> => {
    if (!context.location || !context.destination) return null;

    try {
      const [viaRoute] = await routingProvider.getRoutes({
        origin: context.location,
        waypoints: [place.coordinates],
        destination: context.destination.coordinates,
        alternatives: false,
        signal,
      });
      if (!viaRoute) return null;

      return {
        detourSeconds: Math.max(0, viaRoute.durationSeconds - baselineSeconds),
        detourMeters: Math.max(
          0,
          viaRoute.distanceMeters - (context.remainingDistanceMeters ?? 0),
        ),
      };
    } catch (error) {
      scoped.warn('detour pricing failed', { place: place.id, reason: String(error) });
      return null;
    }
  };

  return {
    async suggest(category, context, signal) {
      const results = await placesProvider.search(SEARCH_TERMS[category], {
        near: context.location ?? undefined,
        limit: CONVERSATION.nearbyResultLimit,
        signal,
      });

      if (results.length === 0) return [];

      const candidates = results.slice(0, RECOMMENDATION.maxCandidates);
      const hasRoute = Boolean(context.route && context.destination && context.location);

      if (!hasRoute || !context.route) {
        return rankStops(
          candidates.map((place) => ({
            place,
            detourSeconds: 0,
            detourMeters: 0,
            isAhead: false,
            directDistanceMeters: directDistance(context.location, place.coordinates),
          })),
          { hasRoute: false },
        );
      }

      const index = createRouteIndex(context.route);
      const driven = drivenDistance(index, context.location);
      const baselineSeconds = await baseline(context, signal);

      const priced = await Promise.all(
        candidates.map(async (place): Promise<StopSuggestion> => {
          const position = locateOnRoute(index, place.coordinates);
          const cost =
            baselineSeconds === null
              ? null
              : await priceStop(place, context, baselineSeconds, signal);

          return {
            place,
            // An unpriceable candidate is not free — it is unknown. Treating it
            // as the worst acceptable detour keeps it behind anything measured.
            detourSeconds: cost?.detourSeconds ?? RECOMMENDATION.maxDetourSeconds,
            detourMeters: cost?.detourMeters ?? 0,
            isAhead: position ? isAheadOnRoute(position, driven) : false,
            directDistanceMeters: directDistance(context.location, place.coordinates),
          };
        }),
      );

      const ranked = rankStops(priced, { hasRoute: true });
      scoped.debug('ranked stops', { category, considered: priced.length, offered: ranked.length });
      return ranked;
    },
  };
};
