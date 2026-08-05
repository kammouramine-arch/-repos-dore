import type { Credentials, Session, SignUpDetails, User } from '@/core/domain/entities/user';
import { AppError } from '@/core/domain/errors/appError';
import type { AuthRepository } from '@/core/domain/ports/authRepository';
import type { Logger } from '@/core/domain/ports/logger';
import { createId } from '@/utils/id';
import type { AccountStore, StoredAccount } from './accountStore';
import {
  burnVerification,
  hashPassword,
  needsRehash,
  verifyPassword,
} from './passwordHasher';
import type { SessionStore } from './sessionStore';

const toUser = ({ id, email, fullName, createdAt }: StoredAccount): User => ({
  id,
  email,
  fullName,
  createdAt,
});

export interface LocalAuthOptions {
  accounts: AccountStore;
  sessions: SessionStore;
  logger: Logger;
}

/**
 * Device-local identity.
 *
 * Composed from two collaborators the hosted service will keep — a session
 * store and a password hasher that records its own algorithm — so migrating
 * means replacing *this* file with a remote adapter, not the machinery around
 * it. Sessions expire, digests carry a version, and unknown accounts cost the
 * same time as wrong passwords.
 */
export const createLocalAuthRepository = ({
  accounts,
  sessions,
  logger,
}: LocalAuthOptions): AuthRepository => {
  const scoped = logger.scoped('auth');

  return {
    async signUp({ email, password, fullName }: SignUpDetails): Promise<Session> {
      if (await accounts.find(email)) {
        throw new AppError('email-taken', 'An account already exists for that email.');
      }

      const account: StoredAccount = {
        id: createId(),
        email,
        fullName,
        createdAt: Date.now(),
        digest: await hashPassword(password),
      };

      await accounts.save(account);
      scoped.info('account created');
      return sessions.open(toUser(account));
    },

    async signIn({ email, password }: Credentials): Promise<Session> {
      // Same message either way: never reveal which accounts exist.
      const rejection = new AppError(
        'invalid-credentials',
        'That email and password do not match.',
      );

      const account = await accounts.find(email);

      if (!account) {
        // Spend the same work as a real verification, so response time cannot
        // be used to enumerate registered addresses.
        await burnVerification(password);
        throw rejection;
      }

      if (!(await verifyPassword(password, account.digest))) throw rejection;

      // Upgrade opportunistically: this is the only moment the plaintext is
      // available, so it is the only moment a digest can be re-derived.
      if (needsRehash(account.digest)) {
        await accounts.save({ ...account, digest: await hashPassword(password) });
        scoped.info('password digest upgraded');
      }

      return sessions.open(toUser(account));
    },

    async signOut(): Promise<void> {
      await sessions.clear();
    },

    async restoreSession(): Promise<Session | null> {
      const session = await sessions.read();
      if (!session) return null;

      // A session whose account no longer exists is stale — drop it.
      if (!(await accounts.find(session.user.email))) {
        await sessions.clear();
        scoped.warn('dropped session for a missing account');
        return null;
      }

      return session;
    },
  };
};
