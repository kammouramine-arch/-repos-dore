import { projectedPuckBearing, puckBearingPoint } from './puckBearing';
import { bearingBetween, distanceBetween } from '@/utils/geo';
test('car aligns with a road as projected on the tilted screen, including all quadrants', () => {
  const origin = { x: 100, y: 100 };
  expect(projectedPuckBearing(origin, { x: 110, y: 95 })).toBeCloseTo(63.4349, 3);
  expect(projectedPuckBearing(origin, { x: 100, y: 80 })).toBe(0);
  expect(projectedPuckBearing(origin, { x: 80, y: 100 })).toBe(270);
  expect(projectedPuckBearing(origin, { x: 100, y: 120 })).toBe(180);
});
test('a collapsed or invalid projected tangent cannot spin the car', () => {
  expect(projectedPuckBearing({ x: 0, y: 0 }, { x: .1, y: .1 })).toBeNull();
  expect(projectedPuckBearing({ x: 0, y: 0 }, { x: NaN, y: 1 })).toBeNull();
});
test('orientation tangent preserves direction and distance at different world latitudes', () => {
  for (const latitude of [-45, 0, 50, 70]) for (const heading of [0, 90, 180, 270]) {
    const from = { latitude, longitude: 3 }, point = puckBearingPoint(from, heading);
    expect(distanceBetween(from, point)).toBeCloseTo(15, 3);
    expect(Math.abs(((bearingBetween(from, point) - heading + 540) % 360) - 180)).toBeLessThan(.001);
  }
});
