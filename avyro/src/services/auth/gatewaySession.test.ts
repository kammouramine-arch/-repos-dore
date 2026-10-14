import { createRemoteAuthRepository } from './remoteAuthRepository';
import { createSessionStore } from './sessionStore';
import type { SecureStorage } from '@/database/secureStore';
import type { HttpClient } from '@/services/http/httpClient';

const baseUrl = 'https://new.example';
const session = { token: 's'.repeat(43), issuedAt: Date.now(), expiresAt: Date.now() + 60000, user: { id: 'synthetic', email: 'synthetic@example.invalid', fullName: 'Synthetic User', createdAt: Date.now() } };
const fixture = (initial: unknown) => {
  let stored = initial;
  const secure = { readJson: async () => stored, writeJson: async (_key: string, value: unknown) => { stored = value; }, remove: async () => { stored = null; } } as unknown as SecureStorage;
  return { secure, stored: () => stored };
};

test('migration clears an old account credential before API token selection', async () => {
  const f = fixture(session);
  expect(await createSessionStore(f.secure).read(baseUrl)).toBeNull();
  expect(f.stored()).toBeNull();
});

test('new hosted account sessions persist their issuer and restore on that host only', async () => {
  const f = fixture(null), postJson = jest.fn(async () => session);
  const repo = createRemoteAuthRepository({ secure: f.secure, baseUrl, http: { postJson } as unknown as HttpClient });
  await repo.signIn({ email: session.user.email, password: 'synthetic-password' });
  expect(await createSessionStore(f.secure).read(baseUrl)).toMatchObject({ token: session.token, gateway: baseUrl });
  expect(await repo.restoreSession()).toMatchObject({ token: session.token });
  const other = createRemoteAuthRepository({ secure: f.secure, baseUrl: 'https://other.example', http: { postJson } as unknown as HttpClient });
  expect(await other.restoreSession()).toBeNull();
  expect(f.stored()).toBeNull();
});

test('signing out a migrated account never forwards its old token to the new host', async () => {
  const f = fixture({ ...session, gateway: 'https://old.example' }), postJson = jest.fn();
  await createRemoteAuthRepository({ secure: f.secure, baseUrl, http: { postJson } as unknown as HttpClient }).signOut();
  expect(postJson).not.toHaveBeenCalled();
  expect(f.stored()).toBeNull();
});
