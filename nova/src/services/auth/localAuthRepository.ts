import { STORAGE_KEYS } from '@/config';
import type { Credentials, Session, SignUpDetails, User } from '@/core/domain/entities/user';
import { AppError } from '@/core/domain/errors/appError';
import type { AuthRepository } from '@/core/domain/ports/authRepository';
import { secureStore } from '@/database/secureStore';
import { createId } from '@/utils/id';
import { hashPassword, verifyPassword, type PasswordDigest } from './passwordHasher';

interface StoredAccount extends User {
  digest: PasswordDigest;
}

type AccountsByEmail = Record<string, StoredAccount>;

const toUser = ({ id, email, fullName, createdAt }: StoredAccount): User => ({
  id,
  email,
  fullName,
  createdAt,
});

const issueSession = (account: StoredAccount): Session => ({
  token: createId(),
  user: toUser(account),
  issuedAt: Date.now(),
});

/**
 * Device-local identity for Sprint 1.
 *
 * Accounts and sessions live in the platform keystore; nothing leaves the
 * device. Replacing this with the hosted Nova identity service is a one-line
 * change in the service container — the `AuthRepository` contract is what the
 * rest of the app depends on.
 */
export const createLocalAuthRepository = (): AuthRepository => {
  const readAccounts = () => secureStore.readJson<AccountsByEmail>(STORAGE_KEYS.accounts, {});

  const persistSession = async (session: Session): Promise<Session> => {
    await secureStore.writeJson(STORAGE_KEYS.session, session);
    return session;
  };

  return {
    async signUp({ email, password, fullName }: SignUpDetails): Promise<Session> {
      const accounts = await readAccounts();
      if (accounts[email]) {
        throw new AppError('email-taken', 'An account already exists for that email.');
      }

      const account: StoredAccount = {
        id: createId(),
        email,
        fullName,
        createdAt: Date.now(),
        digest: await hashPassword(password),
      };

      await secureStore.writeJson(STORAGE_KEYS.accounts, { ...accounts, [email]: account });
      return persistSession(issueSession(account));
    },

    async signIn({ email, password }: Credentials): Promise<Session> {
      const account = (await readAccounts())[email];
      // Same message either way: never reveal which accounts exist.
      const rejection = new AppError(
        'invalid-credentials',
        'That email and password do not match.',
      );

      if (!account) throw rejection;
      if (!(await verifyPassword(password, account.digest))) throw rejection;

      return persistSession(issueSession(account));
    },

    async signOut(): Promise<void> {
      await secureStore.remove(STORAGE_KEYS.session);
    },

    async restoreSession(): Promise<Session | null> {
      const session = await secureStore.readJson<Session | null>(STORAGE_KEYS.session, null);
      if (!session) return null;

      // A session whose account no longer exists is stale — drop it.
      const accounts = await readAccounts();
      if (!accounts[session.user.email]) {
        await secureStore.remove(STORAGE_KEYS.session);
        return null;
      }

      return session;
    },
  };
};
