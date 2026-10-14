import { createGuestAccessToken } from './guestAccessToken';
import type { SecureStorage } from '@/database/secureStore';
import type { HttpClient } from '@/services/http/httpClient';

test('anonymous requests share one credential creation and reuse secure persistence', async () => {
  let stored: unknown = null;
  const secure = { readJson: async () => stored, writeJson: async (_key: string, value: unknown) => { stored = value; } } as unknown as SecureStorage;
  const postJson = jest.fn(async (_url, _body, decode) => decode({ token: 'x'.repeat(43), expiresAt: Date.now() + 60000 }));
  const getToken = createGuestAccessToken({ secure, http: { postJson } as unknown as HttpClient, baseUrl: 'https://gateway.example' });
  expect(await Promise.all([getToken(), getToken(), getToken()])).toEqual(['x'.repeat(43), 'x'.repeat(43), 'x'.repeat(43)]);
  expect(postJson).toHaveBeenCalledTimes(1); expect(await getToken()).toBe('x'.repeat(43)); expect(postJson).toHaveBeenCalledTimes(1);
});
test('network failure does not invent an account or block guest access to the map', async () => {
  const secure = { readJson: async () => null, writeJson: jest.fn() } as unknown as SecureStorage;
  const getToken = createGuestAccessToken({ secure, http: { postJson: async () => { throw Error('Offline'); } } as unknown as HttpClient, baseUrl: 'https://gateway.example' });
  expect(await getToken()).toBeNull(); expect(secure.writeJson).not.toHaveBeenCalled();
});
