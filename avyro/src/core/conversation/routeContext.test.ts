import type { NavigationProgress } from '@/core/domain/entities/navigation';
import type { Place } from '@/core/domain/entities/place';
import type { Route } from '@/core/domain/entities/route';
import { buildRouteContext } from './routeContext';

const DESTINATION: Place = {
  id: 'p1',
  name: 'Gare de Lyon',
  address: 'Place Louis-Armand, Paris',
  coordinates: { latitude: 48.8443, longitude: 2.3743 },
  category: 'transport',
};

const ROUTE: Route = {
  id: 'r1',
  distanceMeters: 12_000,
  durationSeconds: 1_500,
  geometry: [
    { latitude: 48.86, longitude: 2.3 },
    { latitude: 48.85, longitude: 2.37 },
  ],
  summary: 'Quai de la Rapée',
  steps: [
    {
      id: 's1',
      instruction: 'Arrive at your destination',
      maneuver: 'arrive',
      distanceMeters: 12_000,
      durationSeconds: 1_500,
      location: DESTINATION.coordinates,
    },
  ],
};

const PROGRESS = {
  remainingDistanceMeters: 4_200,
  remainingDurationSeconds: 600,
} as NavigationProgress;

const NOW = new Date('2026-01-01T09:00:00Z').getTime();

describe('buildRouteContext', () => {
  it('answers from live progress once the driver is moving', () => {
    const context = buildRouteContext({
      navigationState: 'guiding',
      destination: DESTINATION,
      route: ROUTE,
      progress: PROGRESS,
      distanceUnit: 'metric',
      now: NOW,
    });

    // Four kilometres from here, not the twelve the trip started as.
    expect(context.remainingDistanceMeters).toBe(4_200);
    expect(context.remainingDurationSeconds).toBe(600);
    expect(context.arrivalAt).toBe(NOW + 600_000);
    expect(context.isNavigating).toBe(true);
  });

  it('falls back to the planned route before guidance starts', () => {
    const context = buildRouteContext({
      navigationState: 'idle',
      destination: DESTINATION,
      route: ROUTE,
      progress: null,
      distanceUnit: 'metric',
      now: NOW,
    });

    expect(context.remainingDistanceMeters).toBe(12_000);
    expect(context.remainingDurationSeconds).toBe(1_500);
    // Planned is not the same as under way.
    expect(context.isNavigating).toBe(false);
  });

  it('knows nothing when there is no trip', () => {
    const context = buildRouteContext({
      navigationState: 'idle',
      destination: null,
      route: null,
      progress: null,
      distanceUnit: 'metric',
      now: NOW,
    });

    expect(context.remainingDistanceMeters).toBeNull();
    expect(context.remainingDurationSeconds).toBeNull();
    expect(context.arrivalAt).toBeNull();
    expect(context.isNavigating).toBe(false);
  });

  it.each(['guiding', 'rerouting', 'off-route'] as const)(
    'counts %s as a trip under way',
    (navigationState) => {
      const context = buildRouteContext({
        navigationState,
        destination: DESTINATION,
        route: ROUTE,
        progress: PROGRESS,
        distanceUnit: 'metric',
        now: NOW,
      });

      expect(context.isNavigating).toBe(true);
    },
  );

  it('stops counting an arrival as a trip under way', () => {
    const context = buildRouteContext({
      navigationState: 'arrived',
      destination: DESTINATION,
      route: ROUTE,
      progress: PROGRESS,
      distanceUnit: 'metric',
      now: NOW,
    });

    expect(context.isNavigating).toBe(false);
  });

  it('carries the unit through, so replies are spoken in it', () => {
    const context = buildRouteContext({
      navigationState: 'guiding',
      destination: DESTINATION,
      route: ROUTE,
      progress: PROGRESS,
      distanceUnit: 'imperial',
      now: NOW,
    });

    expect(context.distanceUnit).toBe('imperial');
  });
});
