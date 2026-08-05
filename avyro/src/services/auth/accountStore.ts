import { STORAGE_KEYS } from '@/config';
import type { User } from '@/core/domain/entities/user';
import type { Logger } from '@/core/domain/ports/logger';
import type { SecureStorage } from '@/database/secureStore';
import { CURRENT_ALGORITHM, type PasswordDigest } from './passwordHasher';

export interface StoredAccount extends User {
  digest: PasswordDigest;
}

/**
 * Persisted account records, in a versioned envelope.
 *
 * The version is what makes the next storage change survivable: a release that
 * splits accounts per key, or moves them behind a server, reads the old shape,
 * rewrites it, and bumps the number. Sprint 1 shipped a bare map with no
 * version at all — `migrate` below is the one-time cost of that.
 */
interface AccountsRecord {
  version: number;
  accounts: Record<string, StoredAccount>;
}

export const ACCOUNTS_VERSION = 1;

const EMPTY: AccountsRecord = { version: ACCOUNTS_VERSION, accounts: {} };

/**
 * Reads whatever shape is on disk and returns the current one.
 *
 * v0 (Sprint 1) was an unversioned `Record<email, account>` whose digests had
 * no `algorithm` field; they are stamped with the algorithm that produced them
 * so verification keeps working.
 */
const migrate = (raw: unknown): AccountsRecord => {
  if (typeof raw !== 'object' || raw === null) return EMPTY;

  const record = raw as Partial<AccountsRecord> & Record<string, unknown>;
  if (record.version === ACCOUNTS_VERSION && record.accounts) {
    return { version: ACCOUNTS_VERSION, accounts: record.accounts };
  }

  const accounts = Object.entries(raw as Record<string, StoredAccount>).reduce<
    Record<string, StoredAccount>
  >((migrated, [email, account]) => {
    if (!account?.digest) return migrated;

    migrated[email] = {
      ...account,
      // v0 digests carried no algorithm; they were produced by the one that
      // is still current, so stamping them keeps verification working.
      digest: { ...account.digest, algorithm: account.digest.algorithm ?? CURRENT_ALGORITHM },
    };
    return migrated;
  }, {});

  return { version: ACCOUNTS_VERSION, accounts };
};

export interface AccountStore {
  readAll(): Promise<Record<string, StoredAccount>>;
  find(email: string): Promise<StoredAccount | null>;
  save(account: StoredAccount): Promise<void>;
}

export const createAccountStore = (
  secure: SecureStorage,
  logger: Logger,
): AccountStore => {
  const scoped = logger.scoped('auth.accounts');
  let migrated = false;

  const read = async (): Promise<AccountsRecord> => {
    const raw = await secure.readJson<unknown>(STORAGE_KEYS.accounts, EMPTY);
    const record = migrate(raw);

    if (!migrated && record !== EMPTY) {
      migrated = true;
      const wasLegacy = (raw as Partial<AccountsRecord>)?.version !== ACCOUNTS_VERSION;
      if (wasLegacy && Object.keys(record.accounts).length > 0) {
        scoped.info('migrated accounts record', {
          to: ACCOUNTS_VERSION,
          count: Object.keys(record.accounts).length,
        });
        await secure.writeJson(STORAGE_KEYS.accounts, record);
      }
    }

    return record;
  };

  return {
    async readAll() {
      return (await read()).accounts;
    },

    async find(email) {
      return (await read()).accounts[email] ?? null;
    },

    async save(account) {
      const record = await read();
      await secure.writeJson(STORAGE_KEYS.accounts, {
        version: ACCOUNTS_VERSION,
        accounts: { ...record.accounts, [account.email]: account },
      });
    },
  };
};
