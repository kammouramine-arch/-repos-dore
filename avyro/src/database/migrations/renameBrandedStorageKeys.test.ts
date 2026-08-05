import { STORAGE_KEYS } from '@/config';
import type { Logger } from '@/core/domain/ports/logger';
import type { KeyValueStore } from '@/database/keyValueStore';
import type { SecureStorage } from '@/database/secureStore';
import { migrateBrandedStorageKeys } from './renameBrandedStorageKeys';

const createMemoryStore = (seed: Record<string, unknown> = {}) => {
  const raw: Record<string, unknown> = { ...seed };

  const store: (KeyValueStore & SecureStorage) & { raw: Record<string, unknown> } = {
    raw,
    async readJson<T>(key: string, fallback: T): Promise<T> {
      return key in raw ? (raw[key] as T) : fallback;
    },
    async writeJson(key, value) {
      raw[key] = value;
    },
    async remove(key) {
      delete raw[key];
    },
  };

  return store;
};

const silentLogger = (): Logger => {
  const logger: Logger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    scoped: () => logger,
  };
  return logger;
};

const run = (
  keyValue: ReturnType<typeof createMemoryStore>,
  secure: ReturnType<typeof createMemoryStore>,
) => migrateBrandedStorageKeys({ keyValue, secure, logger: silentLogger() });

describe('migrateBrandedStorageKeys', () => {
  it('carries a signed-in account across the rebrand', async () => {
    const secure = createMemoryStore({
      'nova.auth.accounts': { version: 1, accounts: { 'a@b.c': { id: '1' } } },
      'nova.auth.session': { token: 'abc', user: { id: '1' } },
    });
    const keyValue = createMemoryStore();

    await run(keyValue, secure);

    expect(secure.raw[STORAGE_KEYS.accounts]).toEqual({
      version: 1,
      accounts: { 'a@b.c': { id: '1' } },
    });
    expect(secure.raw[STORAGE_KEYS.session]).toEqual({
      token: 'abc',
      user: { id: '1' },
    });
    expect(secure.raw['nova.auth.accounts']).toBeUndefined();
    expect(secure.raw['nova.auth.session']).toBeUndefined();
  });

  it('carries preferences, the onboarding flag and recent destinations', async () => {
    const keyValue = createMemoryStore({
      'nova.preferences': { voiceGuidance: false },
      'nova.onboarding.completed': true,
      'nova.destinations.recent': [{ place: { id: 'p1' }, lastUsedAt: 1 }],
    });
    const secure = createMemoryStore();

    await run(keyValue, secure);

    expect(keyValue.raw[STORAGE_KEYS.preferences]).toEqual({ voiceGuidance: false });
    expect(keyValue.raw[STORAGE_KEYS.onboarding]).toBe(true);
    expect(keyValue.raw[STORAGE_KEYS.recentDestinations]).toHaveLength(1);
  });

  it('moves a stored `false` rather than mistaking it for absence', async () => {
    // The onboarding flag is the case that a truthiness check would lose.
    const keyValue = createMemoryStore({ 'nova.onboarding.completed': false });
    await run(keyValue, createMemoryStore());

    expect(keyValue.raw[STORAGE_KEYS.onboarding]).toBe(false);
    expect(keyValue.raw['nova.onboarding.completed']).toBeUndefined();
  });

  it('never overwrites a record already written under the new key', async () => {
    const keyValue = createMemoryStore({
      'nova.preferences': { voiceGuidance: false },
      [STORAGE_KEYS.preferences]: { voiceGuidance: true },
    });

    await run(keyValue, createMemoryStore());

    expect(keyValue.raw[STORAGE_KEYS.preferences]).toEqual({ voiceGuidance: true });
    expect(keyValue.raw['nova.preferences']).toBeUndefined();
  });

  it('does nothing on a fresh install', async () => {
    const keyValue = createMemoryStore();
    const secure = createMemoryStore();

    await run(keyValue, secure);

    expect(keyValue.raw).toEqual({});
    expect(secure.raw).toEqual({});
  });

  it('is safe to run twice', async () => {
    const keyValue = createMemoryStore({ 'nova.preferences': { voiceGuidance: false } });

    await run(keyValue, createMemoryStore());
    await run(keyValue, createMemoryStore());

    expect(keyValue.raw[STORAGE_KEYS.preferences]).toEqual({ voiceGuidance: false });
  });
});
