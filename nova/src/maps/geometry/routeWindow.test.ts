import type { Route } from '@/core/domain/entities/route';
import { createRouteIndex } from '@/core/navigation/routeIndex';
import { ROUTE_WINDOW, sliceRouteWindow } from './routeWindow';

/** ~10 m between vertices, 12 km end to end. */
const geometry = Array.from({ length: 1200 }, (_, i) => ({
  latitude: 48.86 + i * 0.00009,
  longitude: 2.3,
}));

const route: Route = {
  id: 'long',
  distanceMeters: 12_000,
  durationSeconds: 900,
  geometry,
  summary: 'Long road',
  steps: [
    {
      id: 'arrive',
      instruction: 'Arrive at your destination',
      maneuver: 'arrive',
      distanceMeters: 12_000,
      durationSeconds: 900,
      location: geometry[geometry.length - 1],
    },
  ],
};

const index = createRouteIndex(route);
const metresPerVertex = index.totalDistanceMeters / (geometry.length - 1);

describe('sliceRouteWindow', () => {
  it('draws far less than the whole route', () => {
    const { behind, ahead } = sliceRouteWindow(index, 600);

    expect(behind.length + ahead.length).toBeLessThan(geometry.length / 2);
  });

  it('reaches roughly the configured distance either side', () => {
    const { behind, ahead } = sliceRouteWindow(index, 600);

    // `behind` includes the current vertex itself, hence the extra one.
    expect((behind.length - 1) * metresPerVertex).toBeCloseTo(
      ROUTE_WINDOW.behindMeters,
      -2,
    );
    expect(ahead.length * metresPerVertex).toBeCloseTo(ROUTE_WINDOW.aheadMeters, -2);
  });

  it('joins seamlessly at the driver', () => {
    const { behind, ahead } = sliceRouteWindow(index, 600);

    expect(behind[behind.length - 1]).toEqual(geometry[600]);
    expect(ahead[0]).toEqual(geometry[601]);
  });

  it('clamps at the start of the route', () => {
    const { behind, ahead } = sliceRouteWindow(index, 0);

    expect(behind).toEqual([geometry[0]]);
    expect(ahead.length).toBeGreaterThan(0);
  });

  it('clamps at the end of the route', () => {
    const { ahead } = sliceRouteWindow(index, geometry.length - 1);

    expect(ahead).toEqual([]);
  });

  it('survives an out-of-range segment index', () => {
    expect(() => sliceRouteWindow(index, -5)).not.toThrow();
    expect(() => sliceRouteWindow(index, 99_999)).not.toThrow();
  });
});
