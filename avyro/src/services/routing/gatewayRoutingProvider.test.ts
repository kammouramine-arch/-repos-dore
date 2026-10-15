import { decodeGatewayRoutes, createGatewayRoutingProvider } from './gatewayRoutingProvider';
import type { HttpClient } from '@/services/http/httpClient';
jest.mock('@/config', () => ({ env: { backendUrl: 'https://gateway.example' } }));
const a = { latitude: 50, longitude: 3 }, b = { latitude: 50.001, longitude: 3 };
const route = { id: 'r', source: 'TomTom', distanceMeters: 110, durationSeconds: 20, geometry: [a,b], summary: 'Test road', steps: [{ id:'s',instruction:'Arrive',maneuver:'arrive',distanceMeters:110,durationSeconds:20,location:b }] };
test('route decoding rejects missing geometry or a malformed turn rather than dropping it', () => {
  expect(decodeGatewayRoutes([route])).toEqual([route]);
  for (const invalid of [{ ...route, geometry: [a] }, { ...route, steps: [{ ...route.steps[0], maneuver: 'invented' }] }, { ...route, geometry: [a,{ latitude:NaN,longitude:3 }] }]) expect(() => decodeGatewayRoutes([invalid])).toThrow();
});
test('planning uses the authenticated hosted route service and preserves stop order', async () => {
  const postJson = jest.fn(async (_url, _body, decode) => decode([route]));
  const provider = createGatewayRoutingProvider({ http:{postJson} as unknown as HttpClient,getAccessToken:async()=> 'session' });
  await provider.getRoutes({ origin:a,destination:b,waypoints:[a],alternatives:false });
  expect(postJson.mock.calls[0][0]).toBe('https://gateway.example/routes');
  expect(postJson.mock.calls[0][1]).toMatchObject({ waypoints:[a],alternatives:false });
});
