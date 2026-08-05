import { AUTH, STORAGE_KEYS } from '@/config';
import type { Session, User } from '@/core/domain/entities/user';
import type { SecureStorage } from '@/database/secureStore';
import { createId } from '@/utils/id';

/**
 * Session persistence, separated from how a session is *obtained*.
 *
 * The hosted identity service will issue real tokens instead of local ones,
 * but it will store, read, expire and clear them exactly like this. Keeping
 * that here means the remote `AuthRepository` reuses this file rather than
 * reinventing the half of session handling that has nothing to do with the
 * network.
 */
export interface SessionStore {
  /** Issues and persists a session for an account. */
  open(user: User): Promise<Session>;
  /** The stored session, or `null` when absent or expired. */
  read(): Promise<Session | null>;
  clear(): Promise<void>;
}

const isExpired = (session: Session, now: number): boolean =>
  typeof session.expiresAt === 'number' && session.expiresAt <= now;

export const createSessionStore = (secure: SecureStorage): SessionStore => ({
  async open(user) {
    const issuedAt = Date.now();
    const session: Session = {
      token: createId(),
      user,
      issuedAt,
      expiresAt: issuedAt + AUTH.sessionTtlMs,
    };

    await secure.writeJson(STORAGE_KEYS.session, session);
    return session;
  },

  async read() {
    const session = await secure.readJson<Session | null>(STORAGE_KEYS.session, null);
    if (!session?.token) return null;

    if (isExpired(session, Date.now())) {
      await secure.remove(STORAGE_KEYS.session);
      return null;
    }

    return session;
  },

  async clear() {
    await secure.remove(STORAGE_KEYS.session);
  },
});
