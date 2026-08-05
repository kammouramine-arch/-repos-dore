import { STORAGE_KEYS } from '@/config';
import type { Logger } from '@/core/domain/ports/logger';
import type { KeyValueStore } from '@/database/keyValueStore';
import type { SecureStorage } from '@/database/secureStore';

/**
 * Moves locally stored records from the `nova.*` keys to the `avyro.*` ones.
 *
 * The rebrand renamed every storage key. Without this step an existing install
 * would come back signed out, re-onboarded and with no recent destinations —
 * the data would still be on the device, just under names nothing reads any
 * more. This is the one place the old brand legitimately survives: a migration
 * cannot look up a key by the name it does not have.
 *
 * Safe to run on every launch. It is a no-op once there is nothing left to
 * move, and it never overwrites a record that already exists under the new key.
 */

/** Written by releases up to and including 0.1.1. Do not change these. */
const LEGACY_KEYS = {
  accounts: 'nova.auth.accounts',
  session: 'nova.auth.session',
  preferences: 'nova.preferences',
  onboarding: 'nova.onboarding.completed',
  recentDestinations: 'nova.destinations.recent',
} as const;

/** Distinguishes "absent" from a legitimately stored `null` or `false`. */
const ABSENT = Symbol('absent');

interface Migration {
  legacy: string;
  current: string;
  /** Credential-grade records live in the keychain, not in key-value storage. */
  secure: boolean;
}

const MIGRATIONS: Migration[] = [
  { legacy: LEGACY_KEYS.accounts, current: STORAGE_KEYS.accounts, secure: true },
  { legacy: LEGACY_KEYS.session, current: STORAGE_KEYS.session, secure: true },
  { legacy: LEGACY_KEYS.preferences, current: STORAGE_KEYS.preferences, secure: false },
  { legacy: LEGACY_KEYS.onboarding, current: STORAGE_KEYS.onboarding, secure: false },
  {
    legacy: LEGACY_KEYS.recentDestinations,
    current: STORAGE_KEYS.recentDestinations,
    secure: false,
  },
];

export interface BrandedKeyMigrationOptions {
  keyValue: KeyValueStore;
  secure: SecureStorage;
  logger: Logger;
}

export const migrateBrandedStorageKeys = async ({
  keyValue,
  secure,
  logger,
}: BrandedKeyMigrationOptions): Promise<void> => {
  const scoped = logger.scoped('storage.rebrand');
  let moved = 0;

  for (const { legacy, current, secure: isSecure } of MIGRATIONS) {
    const store = isSecure ? secure : keyValue;

    const previous = await store.readJson<unknown>(legacy, ABSENT);
    if (previous === ABSENT) continue;

    // A record already written under the new key is newer by definition.
    const existing = await store.readJson<unknown>(current, ABSENT);
    if (existing === ABSENT) {
      await store.writeJson(current, previous);
      moved += 1;
    }

    await store.remove(legacy);
  }

  if (moved > 0) scoped.info('moved records onto the Avyro keys', { moved });
};
