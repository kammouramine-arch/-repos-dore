import { buildRouteContext } from '@/core/conversation/routeContext';
import type { RouteContext } from '@/core/domain/entities/conversation';
import type { Coordinates } from '@/core/domain/entities/geo';
import type { NavigationProgress } from '@/core/domain/entities/navigation';
import type { Place } from '@/core/domain/entities/place';
import type { Logger } from '@/core/domain/ports/logger';
import type { PlacesProvider } from '@/core/domain/ports/placesProvider';
import type { RouteRequest, RoutingProvider } from '@/core/domain/ports/routingProvider';
import type { Route } from '@/core/domain/entities/route';
import { createRouteAwareRecommender } from './routeAwareRecommender';

/** A 10 km run north; the driver starts at the bottom. */
const geometry = Array.from({ length: 101 }, (_, i) => ({
  latitude: 48.86 + i * 0.0009,
  longitude: 2.3,
}));

const START = geometry[0];
const END = geometry[100];

const ROUTE: Route = {
  id: 'r1',
  distanceMeters: 10_000,
  durationSeconds: 900,
  geometry,
  summary: 'North road',
  steps: [
    {
      id: 's1',
      instruction: 'Arrive at your destination',
      maneuver: 'arrive',
      distanceMeters: 10_000,
      durationSeconds: 900,
      location: END,
    },
  ],
};

const place = (id: string, at: Coordinates, rating?: number): Place => ({
  id,
  name: id,
  address: `${id} road`,
  coordinates: at,
  category: 'place',
  rating,
});

const AHEAD = place('ahead', geometry[70]);
const BEHIND = place('behind', geometry[10]);

const silentLogger = (): Logger => {
  const logger: Logger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    scoped: () => logger,
  };
  return logger;
};

const context = (overrides: Partial<Parameters<typeof buildRouteContext>[0]> = {}) =>
  buildRouteContext({
    navigationState: 'guiding',
    destination: place('dest', END),
    route: ROUTE,
    progress: {
      remainingDistanceMeters: 6_000,
      remainingDurationSeconds: 540,
      // A third of the way along.
      snappedPosition: geometry[33],
    } as NavigationProgress,
    distanceUnit: 'metric',
    ...overrides,
  });

/**
 * Routing that prices a via-route by adding a fixed cost per waypoint, so the
 * subtraction the recommender performs can be asserted exactly.
 */
const routing = (detourByPlace: Record<string, number>) => {
  const requests: RouteRequest[] = [];

  const provider: RoutingProvider = {
    async getRoutes(request) {
      requests.push(request);
      const via = request.waypoints?.[0];

      if (!via) return [{ ...ROUTE, durationSeconds: 540 }];

      const id = Object.keys(detourByPlace).find((key) => {
        const known = key === 'ahead' ? AHEAD : BEHIND;
        return known.coordinates.latitude === via.latitude;
      });

      return [
        {
          ...ROUTE,
          durationSeconds: 540 + (id ? detourByPlace[id] : 0),
          distanceMeters: 6_000,
        },
      ];
    },
  };

  return { provider, requests };
};

const places = (results: Place[]): PlacesProvider => ({
  async search() {
    return results;
  },
});

const build = (results: Place[], detours: Record<string, number> = {}) => {
  const { provider, requests } = routing(detours);
  return {
    requests,
    recommender: createRouteAwareRecommender({
      placesProvider: places(results),
      routingProvider: provider,
      logger: silentLogger(),
    }),
  };
};

describe('measuring the cost of a stop', () => {
  it('prices a detour by routing through it and subtracting the trip without it', async () => {
    const { recommender } = build([AHEAD], { ahead: 180 });

    const [best] = await recommender.suggest('coffee', context());

    // "Adds three minutes" is a subtraction, not a guess.
    expect(best.detourSeconds).toBe(180);
    expect(best.isAhead).toBe(true);
  });

  it('routes origin → candidate → destination, in that order', async () => {
    const { recommender, requests } = build([AHEAD], { ahead: 60 });

    await recommender.suggest('coffee', context());

    const via = requests.find((request) => request.waypoints?.length);
    expect(via?.waypoints).toEqual([AHEAD.coordinates]);
    expect(via?.destination).toEqual(END);
  });

  it('knows a stop behind the driver is not on the way', async () => {
    const { recommender } = build([BEHIND], { behind: 30 });

    const [best] = await recommender.suggest('coffee', context());
    expect(best.isAhead).toBe(false);
  });

  it('prefers the stop ahead over the one behind', async () => {
    const { recommender } = build([BEHIND, AHEAD], { behind: 60, ahead: 120 });

    const ranked = await recommender.suggest('coffee', context());
    expect(ranked[0]?.place.id).toBe('ahead');
  });
});

describe('when the numbers cannot be had', () => {
  it('does not treat an unpriceable candidate as free', async () => {
    const failing: RoutingProvider = {
      async getRoutes() {
        throw new Error('routing down');
      },
    };

    const recommender = createRouteAwareRecommender({
      placesProvider: places([AHEAD]),
      routingProvider: failing,
      logger: silentLogger(),
    });

    // Unknown is not zero. Ranking it as the worst acceptable detour keeps it
    // behind anything actually measured.
    const ranked = await recommender.suggest('coffee', context());
    expect(ranked[0]?.detourSeconds).toBeGreaterThan(0);
  });

  it('returns nothing when there is nothing to suggest', async () => {
    const { recommender } = build([]);
    await expect(recommender.suggest('parking', context())).resolves.toEqual([]);
  });
});

describe('with no trip planned', () => {
  const idle = (): RouteContext =>
    buildRouteContext({
      navigationState: 'idle',
      destination: null,
      route: null,
      progress: null,
      position: {
        coordinates: START,
        accuracy: 5,
        speed: 0,
        heading: null,
        timestamp: 0,
      },
      distanceUnit: 'metric',
    });

  it('ranks by proximity, and does not price detours that do not exist', async () => {
    const { recommender, requests } = build([BEHIND, AHEAD]);

    const ranked = await recommender.suggest('coffee', idle());

    expect(ranked[0]?.place.id).toBe('behind');
    expect(requests).toHaveLength(0);
  });
});
