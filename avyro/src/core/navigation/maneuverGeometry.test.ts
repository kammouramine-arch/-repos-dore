import type { Coordinates } from '@/core/domain/entities/geo';
import type { Route, RouteStep } from '@/core/domain/entities/route';
import { measuredDeflection, reconcileManeuvers } from './maneuverGeometry';

/**
 * Synthetic street grid at an invented location. ~111 m per 0.001° latitude;
 * longitude scaled for the latitude so "east" distances are comparable.
 */
const ORIGIN = { latitude: 10, longitude: 20 };
const M_LAT = 1 / 111_195;
const M_LON = 1 / (111_195 * Math.cos((ORIGIN.latitude * Math.PI) / 180));
const at = (east: number, north: number): Coordinates => ({
  latitude: ORIGIN.latitude + north * M_LAT,
  longitude: ORIGIN.longitude + east * M_LON,
});

const step = (over: Partial<RouteStep> & Pick<RouteStep, 'maneuver' | 'location'>): RouteStep => ({
  id: Math.random().toString(36),
  instruction: 'x',
  distanceMeters: 100,
  durationSeconds: 10,
  ...over,
});

const route = (geometry: Coordinates[], steps: RouteStep[]): Route => ({
  id: 'r',
  distanceMeters: 1,
  durationSeconds: 1,
  geometry,
  steps,
  summary: '',
} as Route);

describe('measured deflection', () => {
  it('is ~0 on a straight road', () => {
    const line = [at(0, 0), at(0, 100), at(0, 200)];
    expect(Math.abs(measuredDeflection(line, 100)!)).toBeLessThan(1);
  });

  it('is ~+90 for a right turn and ~-90 for a left', () => {
    const right = [at(0, 0), at(0, 100), at(100, 100)];
    const left = [at(0, 0), at(0, 100), at(-100, 100)];
    expect(measuredDeflection(right, 100)).toBeCloseTo(90, -1);
    expect(measuredDeflection(left, 100)).toBeCloseTo(-90, -1);
  });

  it('declines to judge without road either side', () => {
    expect(measuredDeflection([at(0, 0), at(0, 20)], 10)).toBeNull();
  });
});

describe('a "turn" onto the same road with no turn in the route', () => {
  // EJXG3453 0:02–0:22, reconstructed with invented coordinates: northbound on
  // Avenue A, crossing a divided boulevard with a 6 m jog to the right, then
  // continuing north on Avenue A. The provider called the jog a right turn.
  const geometry = [at(0, 0), at(0, 140), at(6, 152), at(6, 400)];
  const jog = step({ maneuver: 'turn-right', location: at(0, 140), roadName: 'Avenue A', instruction: 'Turn right onto Avenue A', instructionFr: 'Tournez à droite sur Avenue A', distanceMeters: 140 });
  const arrive = step({ maneuver: 'arrive', location: at(6, 400), roadName: 'Avenue A', distanceMeters: 260 });

  it('becomes "continue straight", keeping its place and distance', () => {
    const { route: fixed, corrections } = reconcileManeuvers(route(geometry, [jog, arrive]));

    expect(corrections).toHaveLength(1);
    expect(fixed.steps[0]).toMatchObject({
      maneuver: 'straight',
      instruction: 'Continue straight on Avenue A',
      instructionFr: 'Continuez tout droit sur Avenue A',
      distanceMeters: 140,
      location: jog.location,
    });
    expect(fixed.steps).toHaveLength(2);
  });
});

describe('real turns are never touched', () => {
  it('keeps a genuine left at a corner, even onto a same-named road', () => {
    // EJXG3453 0:32–0:46: Avenue A bends 90° at a corner. The turn is real.
    const geometry = [at(0, 0), at(0, 200), at(-200, 200)];
    const corner = step({ maneuver: 'turn-left', location: at(0, 200), roadName: 'Avenue A', distanceMeters: 200 });
    const arrive = step({ maneuver: 'arrive', location: at(-200, 200), roadName: 'Avenue A', distanceMeters: 200 });

    const { route: fixed, corrections } = reconcileManeuvers(route(geometry, [corner, arrive]));

    expect(corrections).toEqual([]);
    expect(fixed.steps[0].maneuver).toBe('turn-left');
  });

  it('keeps a small-angle turn when it changes road', () => {
    const geometry = [at(0, 0), at(0, 200), at(10, 400)];
    const onto = step({ maneuver: 'turn-right', location: at(0, 200), roadName: 'Rue A', distanceMeters: 200 });
    const arrive = step({ maneuver: 'arrive', location: at(10, 400), roadName: 'Rue B', distanceMeters: 200 });

    expect(reconcileManeuvers(route(geometry, [onto, arrive])).corrections).toEqual([]);
  });

  it('leaves "bear" maneuvers alone, since at a fork the lane matters', () => {
    const geometry = [at(0, 0), at(0, 200), at(5, 400)];
    const fork = step({ maneuver: 'slight-right', location: at(0, 200), roadName: 'A1', distanceMeters: 200 });
    const arrive = step({ maneuver: 'arrive', location: at(5, 400), roadName: 'A1', distanceMeters: 200 });

    expect(reconcileManeuvers(route(geometry, [fork, arrive])).corrections).toEqual([]);
  });

  it('never flips a provider left into a right', () => {
    const geometry = [at(0, 0), at(0, 200), at(200, 200)];
    const odd = step({ maneuver: 'turn-left', location: at(0, 200), roadName: 'Rue A', distanceMeters: 200 });
    const arrive = step({ maneuver: 'arrive', location: at(200, 200), roadName: 'Rue B', distanceMeters: 200 });

    expect(reconcileManeuvers(route(geometry, [odd, arrive])).route.steps[0].maneuver).toBe('turn-left');
  });

  it('returns the same route object when nothing needed changing', () => {
    const geometry = [at(0, 0), at(0, 200), at(-200, 200)];
    const r = route(geometry, [
      step({ maneuver: 'turn-left', location: at(0, 200), roadName: 'Rue A', distanceMeters: 200 }),
      step({ maneuver: 'arrive', location: at(-200, 200), roadName: 'Rue B', distanceMeters: 200 }),
    ]);
    expect(reconcileManeuvers(r).route).toBe(r);
  });
});
