import { canReportIncident } from './reportEligibility';
const fix = { coordinates: { latitude: 48, longitude: 2 }, speed: 0, accuracy: 5, heading: null, timestamp: 1000 };
it('requires a fresh usable location without requiring a car speed reading', () => {
  expect(canReportIncident(fix, 1000)).toBe(true);
  expect(canReportIncident(fix, 62000)).toBe(false);
  expect(canReportIncident({ ...fix, speed: 5 }, 1000)).toBe(true);
  expect(canReportIncident({ ...fix, speed: null }, 1000)).toBe(true);
  expect(canReportIncident({ ...fix, accuracy: 101 }, 1000)).toBe(false);
});
