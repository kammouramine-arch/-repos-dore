import { roadLookahead } from './roadLookahead';
import { createRouteIndex } from './routeIndex';
import { distanceBetween } from '@/utils/geo';
test('lookahead starts at the driver, preserves the path and bounds request size and distance', () => {
  const geometry = Array.from({ length: 1000 }, (_, i) => ({ latitude: 50 + i * .0001, longitude: 3 }));
  const index = createRouteIndex({ id: 'r', geometry, durationSeconds: 100, distanceMeters: 11000, steps: [], summary: '' });
  const points = roadLookahead(index, 10, geometry[10]);
  expect(points[0]).toEqual(geometry[10]);
  expect(points.length).toBeLessThanOrEqual(256);
  expect(points.slice(1).reduce((sum,p,i) => sum + distanceBetween(points[i],p),0)).toBeLessThanOrEqual(1000.1);
  expect(points.every(point => point.latitude >= geometry[10].latitude)).toBe(true);
});
