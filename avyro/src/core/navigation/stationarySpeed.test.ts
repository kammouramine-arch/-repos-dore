import { createStationarySpeedEstimator } from './stationarySpeed';
const fix = { coordinates: { latitude: 50, longitude: 3 }, accuracy: 5, speed: -1, heading: -1, timestamp: 10000 };
test('repeated accurate stationary fixes become zero even when CoreLocation has no speed', () => {
  const estimate = createStationarySpeedEstimator();
  expect(estimate(fix).speed).toBe(-1);
  expect(estimate({ ...fix, timestamp: 13000 }).speed).toBe(0);
  expect(estimate({ ...fix, timestamp: 14000, speed: 8 }).speed).toBe(8);
});
test('movement, poor accuracy and a long GPS gap never become a fabricated stop', () => {
  for (const next of [{ ...fix, accuracy: 50, timestamp: 14000 }, { ...fix, coordinates: { latitude: 50.0001, longitude: 3 }, timestamp: 14000 }, { ...fix, timestamp: 30000 }]) {
    const estimate = createStationarySpeedEstimator(); estimate(fix);
    expect(estimate(next).speed).toBe(-1);
  }
});
