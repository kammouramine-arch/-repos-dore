import { STORAGE_KEYS } from "@/config";
import type { Session } from "@/core/domain/entities/user";
import { AppError } from "@/core/domain/errors/appError";
import type { AuthRepository } from "@/core/domain/ports/authRepository";
import type { SecureStorage } from "@/database/secureStore";
import type { HttpClient } from "@/services/http/httpClient";

const decodeSession = (value: unknown): Session => {
  if (!value || typeof value !== "object")
    throw new AppError("invalid-response", "Invalid session.");
  const s = value as Record<string, unknown>;
  const u = s.user as Record<string, unknown> | undefined;
  if (
    typeof s.token !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(s.token) ||
    typeof s.expiresAt !== "number" ||
    !Number.isFinite(s.expiresAt) ||
    typeof s.issuedAt !== "number" ||
    !u ||
    typeof u.id !== "string" ||
    typeof u.email !== "string" ||
    typeof u.fullName !== "string" ||
    typeof u.createdAt !== "number"
  )
    throw new AppError("invalid-response", "Invalid session.");
  return value as Session;
};

export const createRemoteAuthRepository = ({
  http,
  secure,
  baseUrl,
}: {
  http: HttpClient;
  secure: SecureStorage;
  baseUrl: string;
}): AuthRepository => {
  const save = async (path: string, body: unknown) => {
    const session = await http.postJson(
      `${baseUrl}${path}`,
      body,
      decodeSession,
      { operation: "auth.session" },
    );
    await secure.writeJson(STORAGE_KEYS.session, { ...session, gateway: baseUrl });
    return session;
  };
  return {
    signIn: (credentials) => save("/auth/login", credentials),
    signUp: (details) => save("/auth/register", details),
    async signOut() {
      const session = await secure.readJson<Session | null>(
        STORAGE_KEYS.session,
        null,
      );
      try {
        if (session && (session as Session & { gateway?: string }).gateway === baseUrl)
          await http.postJson(`${baseUrl}/auth/logout`, {}, () => null, {
            operation: "auth.logout",
            headers: { Authorization: `Bearer ${session.token}` },
          });
      } finally {
        await secure.remove(STORAGE_KEYS.session);
      }
    },
    async restoreSession() {
      const value = await secure.readJson<unknown>(STORAGE_KEYS.session, null);
      if (!value) return null;
      try {
        const session = decodeSession(value);
        if ((value as { gateway?: string }).gateway !== baseUrl) throw new Error("Different gateway");
        if (session.expiresAt <= Date.now()) throw new Error("Expired");
        return session;
      } catch {
        await secure.remove(STORAGE_KEYS.session);
        return null;
      }
    },
  };
};
