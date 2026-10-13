import { canReportIncident } from './reportEligibility';
const fix = { coordinates: { latitude: 48, longitude: 2 }, speed: 0, accuracy: 5, heading: null, timestamp: 1000 };
it('requires a recent stationary observation with usable accuracy', () => {
  expect(canReportIncident(fix, 1000)).toBe(true);
  expect(canReportIncident(fix, 12000)).toBe(false);
  expect(canReportIncident({ ...fix, speed: 5 }, 1000)).toBe(false);
  expect(canReportIncident({ ...fix, speed: null }, 1000)).toBe(false);
  expect(canReportIncident({ ...fix, accuracy: 100 }, 1000)).toBe(false);
});
