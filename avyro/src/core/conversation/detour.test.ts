import type { Route } from '@/core/domain/entities/route';
import { createRouteIndex } from '@/core/navigation/routeIndex';
import { AHEAD_DEFAULTS, drivenDistance, isAheadOnRoute, locateOnRoute } from './detour';

/** A straight 10 km run north, one vertex every ~100 m. */
const geometry = Array.from({ length: 101 }, (_, i) => ({
  latitude: 48.86 + i * 0.0009,
  longitude: 2.3,
}));

const route: Route = {
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
      location: geometry[100],
    },
  ],
};

const index = createRouteIndex(route);
const total = index.totalDistanceMeters;

describe('locateOnRoute', () => {
  it('measures how far along the route a point sits', () => {
    const position = locateOnRoute(index, geometry[50]);

    expect(position?.travelledMeters).toBeCloseTo(total / 2, -1);
    expect(position?.lateralMeters).toBeLessThan(1);
  });

  it('measures how far off the road it sits', () => {
    // ~370 m east of the route at the halfway point.
    const beside = { latitude: geometry[50].latitude, longitude: 2.305 };
    const position = locateOnRoute(index, beside);

    expect(position?.lateralMeters).toBeGreaterThan(300);
    expect(position?.lateralMeters).toBeLessThan(450);
  });
});

describe('isAheadOnRoute', () => {
  const at = (index_: number) => locateOnRoute(index, geometry[index_])!;

  it('accepts a stop comfortably in front of the driver', () => {
    expect(isAheadOnRoute(at(60), total / 2)).toBe(true);
  });

  it('rejects a stop the driver has already passed', () => {
    // The whole point: two kilometres away is useless when it is behind you.
    expect(isAheadOnRoute(at(30), total / 2)).toBe(false);
  });

  it('rejects a stop so close it will be passed mid-sentence', () => {
    const justAhead = at(50);
    expect(
      isAheadOnRoute(justAhead, justAhead.travelledMeters - 10),
    ).toBe(false);
  });

  it('rejects a stop too far from the road, however far along it is', () => {
    const acrossTheDualCarriageway = locateOnRoute(index, {
      latitude: geometry[60].latitude,
      longitude: 2.32,
    })!;

    expect(acrossTheDualCarriageway.lateralMeters).toBeGreaterThan(
      AHEAD_DEFAULTS.corridorMeters,
    );
    expect(isAheadOnRoute(acrossTheDualCarriageway, total / 2)).toBe(false);
  });
});

describe('drivenDistance', () => {
  it('derives progress from where the driver actually is', () => {
    expect(drivenDistance(index, geometry[25])).toBeCloseTo(total / 4, -1);
  });

  it('assumes the start when there is no position yet', () => {
    expect(drivenDistance(index, null)).toBe(0);
  });
});
