import { aboveMappedLimit, measuredSpeed } from './measuredSpeed';
import type { UserPosition } from '@/core/domain/entities/geo';

const fix: UserPosition = { coordinates: { latitude: 48, longitude: 2 }, timestamp: 10000, accuracy: 8, heading: 20, speed: 10 };
test('a fresh fix between display ticks remains visible rather than flashing unavailable', () => {
  expect(measuredSpeed(fix, 9400)).toBe(10);
  expect(measuredSpeed(fix, 10000)).toBe(10);
  expect(measuredSpeed(fix, 11000)).toBe(10);
});
test('invalid, inaccurate, stale and truly future readings never become a speed', () => {
  expect(measuredSpeed(fix, 8000)).toBeNull();
  expect(measuredSpeed(fix, 20000)).toBeNull();
  for (const accuracy of [NaN, -1, 60, null]) expect(measuredSpeed({ ...fix, accuracy }, 10000)).toBeNull();
  for (const speed of [NaN, -1, null]) expect(measuredSpeed({ ...fix, speed }, 10000)).toBeNull();
  expect(measuredSpeed({ ...fix, speed: 0 }, 10000)).toBe(0);
});
test('overspeed compares actual measurement with grounded limits in their own units', () => {
  expect(aboveMappedLimit(14, { value: 50, unit: 'km/h' })).toBe(true);
  expect(aboveMappedLimit(14, { value: 50, unit: 'mph' })).toBe(false);
  expect(aboveMappedLimit(20, null)).toBe(false);
  expect(aboveMappedLimit(null, { value: 50, unit: 'km/h' })).toBe(false);
});
