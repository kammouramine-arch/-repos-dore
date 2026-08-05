import { AUTH, STORAGE_KEYS } from '@/config';
import { AppError } from '@/core/domain/errors/appError';
import type { Logger } from '@/core/domain/ports/logger';
import type { SecureStorage } from '@/database/secureStore';
import { ACCOUNTS_VERSION, createAccountStore } from './accountStore';
import { createLocalAuthRepository } from './localAuthRepository';
import { CURRENT_ALGORITHM, type PasswordDigest } from './passwordHasher';
import { createSessionStore } from './sessionStore';

/**
 * These tests exist because 0.1.1 made the graph injectable: before, the
 * repository reached for a module-level keystore and could not be built twice.
 */
const createMemoryStore = (seed: Record<string, unknown> = {}): SecureStorage & {
  raw: Record<string, unknown>;
} => {
  const raw: Record<string, unknown> = { ...seed };

  return {
    raw,
    async readJson<T>(key: string, fallback: T): Promise<T> {
      return key in raw ? (raw[key] as T) : fallback;
    },
    async writeJson(key, value) {
      raw[key] = JSON.parse(JSON.stringify(value));
    },
    async remove(key) {
      delete raw[key];
    },
  };
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

const build = (seed: Record<string, unknown> = {}) => {
  const secure = createMemoryStore(seed);
  const logger = silentLogger();

  return {
    secure,
    repository: createLocalAuthRepository({
      accounts: createAccountStore(secure, logger),
      sessions: createSessionStore(secure),
      logger,
    }),
  };
};

const CREDENTIALS = { email: 'alex@example.com', password: 'novadrive1' };

describe('sign up and sign in', () => {
  it('issues a session for a new account', async () => {
    const { repository } = build();

    const session = await repository.signUp({ ...CREDENTIALS, fullName: 'Alex Durand' });

    expect(session.user.email).toBe(CREDENTIALS.email);
    expect(session.token).toHaveLength(36);
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  it('refuses a second account on the same email', async () => {
    const { repository } = build();
    await repository.signUp({ ...CREDENTIALS, fullName: 'Alex' });

    await expect(
      repository.signUp({ ...CREDENTIALS, fullName: 'Someone Else' }),
    ).rejects.toMatchObject({ code: 'email-taken' });
  });

  it('accepts the right password and rejects the wrong one', async () => {
    const { repository } = build();
    await repository.signUp({ ...CREDENTIALS, fullName: 'Alex' });

    await expect(repository.signIn(CREDENTIALS)).resolves.toMatchObject({
      user: { email: CREDENTIALS.email },
    });

    await expect(
      repository.signIn({ ...CREDENTIALS, password: 'wrongpass1' }),
    ).rejects.toMatchObject({ code: 'invalid-credentials' });
  });

  it('never stores the password', async () => {
    const { repository, secure } = build();
    await repository.signUp({ ...CREDENTIALS, fullName: 'Alex' });

    expect(JSON.stringify(secure.raw)).not.toContain(CREDENTIALS.password);
  });
});

describe('account enumeration', () => {
  it('answers an unknown email exactly as it answers a wrong password', async () => {
    const { repository } = build();
    await repository.signUp({ ...CREDENTIALS, fullName: 'Alex' });

    const unknown = await repository
      .signIn({ email: 'nobody@example.com', password: 'novadrive1' })
      .catch((error: AppError) => error);
    const wrongPassword = await repository
      .signIn({ ...CREDENTIALS, password: 'wrongpass1' })
      .catch((error: AppError) => error);

    expect((unknown as AppError).message).toBe((wrongPassword as AppError).message);
    expect((unknown as AppError).code).toBe((wrongPassword as AppError).code);
  });
});

describe('sessions', () => {
  it('restores a live session', async () => {
    const { repository } = build();
    await repository.signUp({ ...CREDENTIALS, fullName: 'Alex' });

    await expect(repository.restoreSession()).resolves.toMatchObject({
      user: { email: CREDENTIALS.email },
    });
  });

  it('drops an expired session instead of restoring it', async () => {
    const { repository, secure } = build();
    await repository.signUp({ ...CREDENTIALS, fullName: 'Alex' });

    const stored = secure.raw[STORAGE_KEYS.session] as { expiresAt: number };
    secure.raw[STORAGE_KEYS.session] = { ...stored, expiresAt: Date.now() - 1 };

    await expect(repository.restoreSession()).resolves.toBeNull();
    expect(secure.raw[STORAGE_KEYS.session]).toBeUndefined();
  });

  it('gives every session a bounded lifetime', async () => {
    const { repository } = build();
    const session = await repository.signUp({ ...CREDENTIALS, fullName: 'Alex' });

    expect(session.expiresAt - session.issuedAt).toBe(AUTH.sessionTtlMs);
  });

  it('forgets the session on sign out but keeps the account', async () => {
    const { repository, secure } = build();
    await repository.signUp({ ...CREDENTIALS, fullName: 'Alex' });
    await repository.signOut();

    expect(secure.raw[STORAGE_KEYS.session]).toBeUndefined();
    await expect(repository.signIn(CREDENTIALS)).resolves.toBeTruthy();
  });

  it('drops a session whose account has gone', async () => {
    const { repository, secure } = build();
    await repository.signUp({ ...CREDENTIALS, fullName: 'Alex' });
    delete secure.raw[STORAGE_KEYS.accounts];

    await expect(repository.restoreSession()).resolves.toBeNull();
  });
});

describe('migration from the Sprint 1 record', () => {
  /** v0: an unversioned map, with digests that carried no algorithm. */
  const legacy = {
    [STORAGE_KEYS.accounts]: {
      'alex@example.com': {
        id: 'legacy-id',
        email: 'alex@example.com',
        fullName: 'Alex Durand',
        createdAt: 1_700_000_000_000,
        digest: { salt: 'abc123', hash: 'deadbeef' },
      },
    },
  };

  it('keeps the account and stamps the algorithm it was made with', async () => {
    const { repository, secure } = build(legacy);

    // Any read of the account record triggers the migration; a failed sign-in
    // is the cheapest way to force one.
    await repository.signIn({ ...CREDENTIALS, password: 'whatever1' }).catch(() => undefined);

    const record = secure.raw[STORAGE_KEYS.accounts] as {
      version: number;
      accounts: Record<string, { digest: { algorithm: string } }>;
    };

    expect(record.version).toBe(ACCOUNTS_VERSION);
    expect(record.accounts['alex@example.com'].digest.algorithm).toBe(CURRENT_ALGORITHM);
  });

  it('leaves an already-migrated record alone', async () => {
    const migrated = {
      [STORAGE_KEYS.accounts]: { version: ACCOUNTS_VERSION, accounts: {} },
    };
    const { repository, secure } = build(migrated);

    await repository.signIn({ ...CREDENTIALS, password: 'whatever1' }).catch(() => undefined);

    expect(secure.raw[STORAGE_KEYS.accounts]).toEqual(migrated[STORAGE_KEYS.accounts]);
  });
});

describe('digest upgrades', () => {
  it('rehashes on the next successful sign-in when the algorithm has moved on', async () => {
    const { repository, secure } = build();
    await repository.signUp({ ...CREDENTIALS, fullName: 'Alex' });

    // Age the stored digest: same salt and hash, an algorithm we no longer use.
    const record = secure.raw[STORAGE_KEYS.accounts] as {
      version: number;
      accounts: Record<string, { digest: PasswordDigest }>;
    };
    const stored = record.accounts[CREDENTIALS.email];
    const staleHash = stored.digest.hash;
    stored.digest = { ...stored.digest, algorithm: 'salted-sha256-v0' as never };

    await expect(repository.signIn(CREDENTIALS)).resolves.toBeTruthy();

    // Sign-in is the only moment the plaintext exists, so it is the only moment
    // a digest can be re-derived. It must have been taken.
    const upgraded = (
      secure.raw[STORAGE_KEYS.accounts] as {
        accounts: Record<string, { digest: PasswordDigest }>;
      }
    ).accounts[CREDENTIALS.email].digest;

    expect(upgraded.algorithm).toBe(CURRENT_ALGORITHM);
    expect(upgraded.hash).not.toBe(staleHash);
    await expect(repository.signIn(CREDENTIALS)).resolves.toBeTruthy();
  });

  it('does not touch a digest that is already current', async () => {
    const { repository, secure } = build();
    await repository.signUp({ ...CREDENTIALS, fullName: 'Alex' });

    const before = JSON.stringify(secure.raw[STORAGE_KEYS.accounts]);
    await repository.signIn(CREDENTIALS);

    expect(JSON.stringify(secure.raw[STORAGE_KEYS.accounts])).toBe(before);
  });
});
