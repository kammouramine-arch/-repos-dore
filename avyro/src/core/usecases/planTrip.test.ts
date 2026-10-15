import { createPlanTrip } from './planTrip';
import { createNavigationStore } from '@/features/navigation/state/navigationStore';
import type { Place } from '@/core/domain/entities/place';
import type { Route } from '@/core/domain/entities/route';

const final: Place = { id: 'final', name: 'Final address', address: '18 Rue Exemple', category: 'address', coordinates: { latitude: 50.6, longitude: 3 } };
const stop: Place = { ...final, id: 'parking', name: 'Parking', coordinates: { latitude: 50.61, longitude: 3.01 } };
const route: Route = { id: 'route', distanceMeters: 1000, durationSeconds: 100, geometry: [stop.coordinates, final.coordinates], steps: [], summary: 'Via parking' };

test('adding a stop routes through its real coordinates while retaining the final address', async () => {
  const getRoutes = jest.fn(async () => [route]);
  const plan = await createPlanTrip({ routingProvider: { getRoutes } })({ origin: { latitude: 50.62, longitude: 3.02 }, destination: final, waypoints: [stop.coordinates] });
  expect(getRoutes).toHaveBeenCalledWith(expect.objectContaining({ destination: final.coordinates, waypoints: [stop.coordinates] }));
  expect(plan.destination).toBe(final);
  const live = createNavigationStore();
  live.getState().start(route, final);
  live.getState().setStops([stop]);
  live.getState().replaceRoute({ ...route, id: 'reroute' });
  expect(live.getState().destination).toBe(final);
  expect(live.getState().stops).toEqual([stop]);
  live.getState().stop();
  expect(live.getState().stops).toEqual([]);
});
