import { STORAGE_KEYS } from '@/config';
import type { SecureStorage } from '@/database/secureStore';
import type { HttpClient } from '@/services/http/httpClient';

interface GuestSession { token: string; expiresAt: number; }
const decode = (input: unknown): GuestSession => {
  const value = input as Partial<GuestSession> | null;
  if (!value || typeof value.token !== 'string' || !/^[A-Za-z0-9_-]{40,100}$/.test(value.token) || !Number.isFinite(value.expiresAt) || value.expiresAt! <= Date.now()) throw Error('Guest session rejected.');
  return value as GuestSession;
};

/** Anonymous API access, kept in the device keystore, without personal account details. */
export const createGuestAccessToken = ({ http, secure, baseUrl }: { http: HttpClient; secure: SecureStorage; baseUrl: string }) => {
  let pending: Promise<string | null> | null = null;
  return async (): Promise<string | null> => {
    if (!baseUrl) return null;
    const stored = await secure.readJson<unknown>(STORAGE_KEYS.guestSession, null);
    try { return decode(stored).token; } catch { /* Missing/expired credentials are renewed below. */ }
    pending ??= http.postJson(`${baseUrl}/auth/guest`, {}, decode, { operation: 'auth.guest', timeoutMs: 4000 }).then(async session => {
      await secure.writeJson(STORAGE_KEYS.guestSession, session);
      return session.token;
    }).catch(() => null).finally(() => { pending = null; });
    return pending;
  };
};
