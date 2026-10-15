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
  let memory: GuestSession | null = null;
  return async (): Promise<string | null> => {
    if (!baseUrl) return null;
    if (memory && memory.expiresAt > Date.now()) return memory.token;
    const stored = await secure.readJson<unknown>(STORAGE_KEYS.guestSession, null);
    try {
      // A credential belongs only to the gateway that issued it.
      const persisted = stored as { gateway?: string; session?: unknown } | null;
      if (persisted?.gateway === baseUrl) { memory = decode(persisted.session); return memory.token; }
    } catch { /* Missing/expired credentials are renewed below. */ }
    pending ??= http.postJson(`${baseUrl}/auth/guest`, {}, decode, { operation: 'auth.guest', timeoutMs: 12000 }).then(async session => {
      memory = session;
      // Anonymous access can continue in RAM if this device's keychain is unavailable.
      // Account sessions never use this fallback and nothing is written in plaintext.
      try { await secure.writeJson(STORAGE_KEYS.guestSession, { gateway: baseUrl, session }); } catch { /* Session ends at process restart. */ }
      return session.token;
    }).catch(() => null).finally(() => { pending = null; });
    return pending;
  };
};
