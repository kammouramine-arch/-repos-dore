import { createNominatimPlacesProvider } from './nominatimPlacesProvider';
import type { HttpClient } from '@/services/http/httpClient';

it('paces public geocoding, caches repeated searches and never sends a cancelled queued request', async () => {
  let clock = 0;
  const called: number[] = [];
  const http = { getJson: async () => { called.push(clock); return []; } } as unknown as HttpClient;
  const provider = createNominatimPlacesProvider({ http, baseUrl: 'https://nominatim.openstreetmap.org', now: () => clock, wait: async (ms) => { clock += ms; } });
  await Promise.all([provider.search('Paris'), provider.search('Lyon')]);
  expect(called).toEqual([0, 1000]);
  await provider.search(' Paris ');
  expect(called).toHaveLength(2);
  const controller = new AbortController(); controller.abort();
  await expect(provider.search('Bordeaux', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  expect(called).toHaveLength(2);
});
