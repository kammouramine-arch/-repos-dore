import { NAVIGATION } from '@/config';
import type { UserPosition } from '@/core/domain/entities/geo';
import type { Route } from '@/core/domain/entities/route';
import { distanceBetween } from '@/utils/geo';
import { createRouteIndex } from './routeIndex';
import { initialTrackerState, isOffRoute, trackPosition } from './routeTracker';

/**
 * An L-shaped trip: ~440 m east along Rue A, left turn, ~665 m north along
 * Rue B. Small enough to reason about, long enough to cross every threshold.
 */
const A = { latitude: 48.86, longitude: 2.3 };
const B = { latitude: 48.86, longitude: 2.306 };
const C = { latitude: 48.866, longitude: 2.306 };

const midpoint = (from: typeof A, to: typeof A) => ({
  latitude: (from.latitude + to.latitude) / 2,
  longitude: (from.longitude + to.longitude) / 2,
});

const LEG_ONE = distanceBetween(A, B);
const LEG_TWO = distanceBetween(B, C);

const route: Route = {
  id: 'route-1',
  distanceMeters: LEG_ONE + LEG_TWO,
  durationSeconds: 100,
  geometry: [A, midpoint(A, B), B, midpoint(B, C), C],
  summary: 'Rue A · Rue B',
  steps: [
    {
      id: 'step-1',
      instruction: 'Turn left onto Rue B',
      maneuver: 'turn-left',
      distanceMeters: LEG_ONE,
      durationSeconds: 40,
      location: B,
      roadName: 'Rue A',
    },
    {
      id: 'step-2',
      instruction: 'Arrive at your destination',
      maneuver: 'arrive',
      distanceMeters: LEG_TWO,
      durationSeconds: 60,
      location: C,
      roadName: 'Rue B',
    },
  ],
};

const index = createRouteIndex(route);

const positionAt = (
  coordinates: typeof A,
  heading: number | null = null,
): UserPosition => ({
  coordinates,
  accuracy: 5,
  speed: 12,
  heading,
  timestamp: Date.now(),
});

const track = (coordinates: typeof A, state = initialTrackerState) => {
  const result = trackPosition(index, positionAt(coordinates), state);
  if (!result) throw new Error('tracker returned no result');
  return result;
};

describe('createRouteIndex', () => {
  it('measures the geometry rather than trusting the declared total', () => {
    expect(index.totalDistanceMeters).toBeCloseTo(LEG_ONE + LEG_TWO, 1);
    expect(index.stepEndDistances).toHaveLength(2);
    expect(index.stepEndDistances[1]).toBeCloseTo(index.totalDistanceMeters, 1);
  });
});

describe('trackPosition', () => {
  it('reports the first maneuver from the start of the trip', () => {
    const { progress } = track(A);

    expect(progress.stepIndex).toBe(0);
    expect(progress.currentStep.instruction).toBe('Turn left onto Rue B');
    expect(progress.nextStep?.maneuver).toBe('arrive');
    expect(progress.distanceToManeuverMeters).toBeCloseTo(LEG_ONE, 0);
    expect(progress.remainingDistanceMeters).toBeCloseTo(LEG_ONE + LEG_TWO, 0);
    expect(progress.hasArrived).toBe(false);
  });

  it('counts down to the maneuver as the driver advances', () => {
    const { progress } = track(midpoint(A, B));

    expect(progress.stepIndex).toBe(0);
    expect(progress.distanceToManeuverMeters).toBeCloseTo(LEG_ONE / 2, 0);
    expect(progress.remainingDurationSeconds).toBeCloseTo(20 + 60, 0);
  });

  it('advances to the next step once the maneuver is behind', () => {
    const { progress } = track(midpoint(B, C));

    expect(progress.stepIndex).toBe(1);
    expect(progress.currentStep.maneuver).toBe('arrive');
    expect(progress.nextStep).toBeNull();
    expect(progress.distanceToManeuverMeters).toBeCloseTo(LEG_TWO / 2, 0);
  });

  it('declares arrival at the destination', () => {
    const { progress } = track(C);

    expect(progress.hasArrived).toBe(true);
    expect(progress.remainingDistanceMeters).toBeLessThan(1);
  });

  it('snaps a fix beside the road back onto the route', () => {
    // ~55 m north of the first leg.
    const beside = { latitude: 48.8605, longitude: 2.303 };
    const { progress } = track(beside);

    expect(progress.snappedPosition.latitude).toBeCloseTo(A.latitude, 4);
    expect(progress.distanceFromRouteMeters).toBeGreaterThan(45);
    expect(progress.distanceFromRouteMeters).toBeLessThan(65);
  });

  it('never steps backwards when the driver hesitates', () => {
    const advanced = track(midpoint(B, C));
    const rewound = track(midpoint(A, B), advanced.state);

    expect(rewound.progress.stepIndex).toBe(advanced.progress.stepIndex);
  });

  it('prefers the reported heading, and falls back to the road direction', () => {
    expect(track(midpoint(A, B)).progress.courseDegrees).toBeCloseTo(90, 0);

    const withHeading = trackPosition(
      index,
      positionAt(midpoint(A, B), 42),
      initialTrackerState,
    );
    expect(withHeading?.progress.courseDegrees).toBe(42);
  });
});

describe('isOffRoute', () => {
  const strayed = track({ latitude: 48.8615, longitude: 2.303 }).progress;

  it('waits for repeated confirmations before believing the GPS', () => {
    expect(strayed.distanceFromRouteMeters).toBeGreaterThan(55);
    expect(isOffRoute(strayed, 1)).toBe(false);
    expect(isOffRoute(strayed, 3)).toBe(true);
  });

  it('stays false while the driver is on the road', () => {
    expect(isOffRoute(track(midpoint(A, B)).progress, 10)).toBe(false);
  });
});

describe('bounded search window', () => {
  // 1200 vertices, ~10 m apart: about 12 km, the scale at which an unbounded
  // scan per fix stops being free.
  const longGeometry = Array.from({ length: 1200 }, (_, i) => ({
    latitude: 48.86 + i * 0.00009,
    longitude: 2.3,
  }));

  const longRoute: Route = {
    id: 'long',
    distanceMeters: distanceBetween(longGeometry[0], longGeometry[1199]),
    durationSeconds: 900,
    geometry: longGeometry,
    summary: 'Long road',
    steps: [
      {
        id: 'long-step',
        instruction: 'Arrive at your destination',
        maneuver: 'arrive',
        distanceMeters: distanceBetween(longGeometry[0], longGeometry[1199]),
        durationSeconds: 900,
        location: longGeometry[1199],
      },
    ],
  };

  const longIndex = createRouteIndex(longRoute);

  /** A point part-way along segment `i`, so no vertex tie can decide the result. */
  const along = (i: number, fraction = 0.5) => ({
    latitude:
      longGeometry[i].latitude +
      (longGeometry[i + 1].latitude - longGeometry[i].latitude) * fraction,
    longitude: longGeometry[i].longitude,
  });

  it('follows the driver forward from the start of the trip', () => {
    const result = trackPosition(longIndex, positionAt(along(20)), initialTrackerState);

    expect(result?.state.segmentIndex).toBe(20);
    expect(result?.progress.distanceFromRouteMeters).toBeLessThan(1);
  });

  it('does not follow a jump that lands outside the window', () => {
    // 5 km ahead but 400 m off to the side: too far to be the same road.
    const stray = {
      latitude: longGeometry[500].latitude,
      longitude: longGeometry[500].longitude + 0.0055,
    };
    const result = trackPosition(longIndex, positionAt(stray), initialTrackerState);

    expect(result?.progress.distanceFromRouteMeters).toBeGreaterThan(
      NAVIGATION.offRouteThresholdMeters,
    );
  });

  it('re-acquires the route after a jump onto it, such as leaving a tunnel', () => {
    // On the route, 8 km further along than the search window reaches.
    const result = trackPosition(longIndex, positionAt(along(900)), initialTrackerState);

    expect(result?.state.segmentIndex).toBe(900);
    expect(result?.progress.distanceFromRouteMeters).toBeLessThan(1);
  });

  it('keeps the windowed result when the driver has simply left the road', () => {
    // 120 m to the side, close enough to be within the window: the tracker must
    // report the driver as off the corridor rather than snapping them elsewhere.
    const beside = { ...along(30), longitude: longGeometry[30].longitude + 0.0016 };
    const result = trackPosition(longIndex, positionAt(beside), initialTrackerState);

    expect(result?.state.segmentIndex).toBeLessThan(60);
    expect(result?.progress.distanceFromRouteMeters).toBeGreaterThan(100);
  });
});
