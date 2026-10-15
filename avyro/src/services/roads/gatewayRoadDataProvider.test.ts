import { createGatewayRoadDataProvider } from './gatewayRoadDataProvider';
import type { HttpClient } from '@/services/http/httpClient';
jest.mock('@/config', () => ({ env: { backendUrl: 'https://gateway.example', roadDataEnabled: true } }));
const fix = { coordinates: { latitude: 48, longitude: 2 }, accuracy: 10, speed: 0, heading: null, timestamp: 1000 };
const raw = { source: 'TomTom map data', status: 'matched', capturedAt: 1000, expiresAt: 6000, speedLimit: { value: 50, unit: 'km/h' } };
test('does not call road gateway without a session', async () => {
  const postJson = jest.fn();
  const provider = createGatewayRoadDataProvider({ http: { postJson } as unknown as HttpClient, getAccessToken: async () => null });
  await expect(provider.lookup([fix, fix], new AbortController().signal)).rejects.toThrow();
  expect(postJson).not.toHaveBeenCalled();
});
test('rejects wrong source, stale capture, advisory status and malformed speed values', async () => {
  for (const value of [null, { ...raw, source: 'AI guess' }, { ...raw, capturedAt: 999 }, { ...raw, expiresAt: 7000 }, { ...raw, status: 'unavailable' }, { ...raw, speedLimit: { value: '50', unit: 'km/h' } }]) {
    const http = { postJson: async (_url: string, _body: unknown, decode: (data: unknown) => unknown) => decode(value) } as unknown as HttpClient;
    const provider = createGatewayRoadDataProvider({ http, getAccessToken: async () => 'session-token' });
    await expect(provider.lookup([fix, fix], new AbortController().signal)).rejects.toThrow();
  }
});
test('keeps only mapped limit evidence and forwards caller cancellation', async () => {
  const signal = new AbortController().signal;
  const postJson = jest.fn(async (_url, body, decode, options) => {
    expect(body).toEqual({ consent: true, fixes: [fix, fix].map((p) => ({ ...p.coordinates, accuracy: p.accuracy, timestamp: p.timestamp })) });
    expect(options.signal).toBe(signal);
    expect(options.headers.Authorization).toBe('Bearer session-token');
    return decode({ ...raw, speech: 'Safe to overtake', warningsAhead: ['StopSign'] });
  });
  const provider = createGatewayRoadDataProvider({ http: { postJson } as unknown as HttpClient, getAccessToken: async () => 'session-token' });
  const evidence = await provider.lookup([fix, fix], signal);
  expect(evidence.speedLimit).toEqual({ value: 50, unit: 'km/h' });
  expect(evidence).not.toHaveProperty('speech'); expect(evidence).not.toHaveProperty('warningsAhead');
  expect(postJson.mock.calls[0][0]).toBe('https://gateway.example/roads/context');
});

test('route metadata keeps mapped positions but never provider prose or light phases', async () => {
  const response = { source: 'TomTom map data', expiresAt: Date.now() + 300000, alerts: [{ id: 'light', kind: 'traffic-light', source: 'TomTom map data', coordinate: { latitude: 50, longitude: 3 }, phase: 'green', speech: 'Go now' }] };
  const http = { postJson: async (_url: string, _body: unknown, decode: (value: unknown) => unknown) => decode(response) } as unknown as HttpClient;
  const provider = createGatewayRoadDataProvider({ http, getAccessToken: async () => 'token' });
  const result = await provider.lookupAhead!([{ latitude: 50, longitude: 3 }, { latitude: 50.001, longitude: 3 }], new AbortController().signal);
  expect(result.alerts[0].kind).toBe('traffic-light');
  expect(result.alerts[0]).not.toHaveProperty('phase');
  expect(result.alerts[0]).not.toHaveProperty('speech');
});
