import { reportsNearRoute } from './routeReports';
import { createRouteIndex } from '@/core/navigation/routeIndex';
import type { ReviewedIncident } from '@/core/domain/ports/incidentReporter';
const route = createRouteIndex({ id: 'r', geometry: [{ latitude: 0, longitude: 0 }, { latitude: 0, longitude: .01 }], distanceMeters: 1112, durationSeconds: 100, steps: [], summary: '' });
const report = (id: string, longitude: number, latitude = 0, expires = 2000): ReviewedIncident => ({ id, category: 'traffic', latitude, longitude, observed: 0, expires, status: 'community' });
test('route observations exclude expired, behind and distant reports without treating proximity as verification', () => {
  const result = reportsNearRoute([report('near', .005), report('behind', .001), report('expired', .006, 0, 999), report('distant', .005, .002)], route, 200, 1000);
  expect(result.map(item => item.report.id)).toEqual(['near']);
  expect(result[0].aheadMeters).toBeGreaterThan(350);
  expect(result[0].report.status).toBe('community');
});
