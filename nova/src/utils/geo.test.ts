import {
  bearingBetween,
  cumulativeDistances,
  distanceBetween,
  projectOnPath,
  projectOnSegment,
} from './geo';

const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const LONDON = { latitude: 51.5074, longitude: -0.1278 };

describe('distanceBetween', () => {
  it('measures a known great-circle distance', () => {
    // Paris → London is ~343.5 km; allow a kilometre of slack.
    expect(distanceBetween(PARIS, LONDON)).toBeGreaterThan(342_000);
    expect(distanceBetween(PARIS, LONDON)).toBeLessThan(345_000);
  });

  it('is zero for identical points and symmetric otherwise', () => {
    expect(distanceBetween(PARIS, PARIS)).toBe(0);
    expect(distanceBetween(PARIS, LONDON)).toBeCloseTo(distanceBetween(LONDON, PARIS), 6);
  });
});

describe('bearingBetween', () => {
  it('reads due north and due east', () => {
    expect(bearingBetween(PARIS, { ...PARIS, latitude: 48.9 })).toBeCloseTo(0, 1);
    expect(bearingBetween(PARIS, { ...PARIS, longitude: 2.4 })).toBeCloseTo(90, 1);
  });

  it('normalises into [0, 360)', () => {
    const bearing = bearingBetween(PARIS, { ...PARIS, longitude: 2.3 });
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
  });
});

describe('projectOnSegment', () => {
  const start = { latitude: 48.86, longitude: 2.3 };
  const end = { latitude: 48.86, longitude: 2.31 };

  it('clamps to the segment ends', () => {
    const before = projectOnSegment({ latitude: 48.86, longitude: 2.29 }, start, end);
    expect(before.t).toBe(0);

    const after = projectOnSegment({ latitude: 48.86, longitude: 2.32 }, start, end);
    expect(after.t).toBe(1);
  });

  it('drops a perpendicular onto the middle of the segment', () => {
    const projection = projectOnSegment(
      { latitude: 48.8605, longitude: 2.305 },
      start,
      end,
    );

    expect(projection.t).toBeCloseTo(0.5, 2);
    expect(projection.point.latitude).toBeCloseTo(48.86, 5);
    // 0.0005° of latitude is ~55 m.
    expect(projection.distance).toBeGreaterThan(50);
    expect(projection.distance).toBeLessThan(60);
  });
});

describe('projectOnPath', () => {
  const path = [
    { latitude: 48.86, longitude: 2.3 },
    { latitude: 48.86, longitude: 2.31 },
    { latitude: 48.87, longitude: 2.31 },
  ];

  it('finds the closest segment', () => {
    const projection = projectOnPath({ latitude: 48.865, longitude: 2.3102 }, path);
    expect(projection?.segmentIndex).toBe(1);
    expect(projection?.distance).toBeLessThan(20);
  });

  it('never snaps behind the search cursor', () => {
    const projection = projectOnPath({ latitude: 48.86, longitude: 2.301 }, path, 1);
    expect(projection?.segmentIndex).toBe(1);
  });

  it('returns null for an empty path', () => {
    expect(projectOnPath(PARIS, [])).toBeNull();
  });
});

describe('cumulativeDistances', () => {
  it('accumulates monotonically from zero', () => {
    const path = [
      { latitude: 48.86, longitude: 2.3 },
      { latitude: 48.86, longitude: 2.305 },
      { latitude: 48.86, longitude: 2.31 },
    ];
    const distances = cumulativeDistances(path);

    expect(distances[0]).toBe(0);
    expect(distances[1]).toBeGreaterThan(0);
    expect(distances[2]).toBeCloseTo(distances[1] * 2, 0);
  });
});
