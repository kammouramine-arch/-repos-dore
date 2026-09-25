// Caller identity. The phone sends `Authorization: Bearer <Sign in with Apple identity token>`;
// the gateway verifies it against Apple's public keys, so nothing else needs to be issued yet.
// Later a session-token issuer can replace `AppleTokenVerifier` without touching the handlers.
import { createPublicKey, verify as verifySignature, type KeyObject } from "node:crypto";

export interface Identity {
  subject: string;
  provider: "apple" | "dev";
  email?: string;
}

export interface TokenVerifier {
  verify(token: string): Promise<Identity>;
}

export class AuthError extends Error {
  constructor(message: string, public status: 401 | 403 = 401) {
    super(message);
  }
}

interface Jwk { kid: string; kty: string; n: string; e: string; alg?: string; use?: string }

function b64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Verifies an Apple identity token (RS256) with the JWKS at appleid.apple.com. */
export class AppleTokenVerifier implements TokenVerifier {
  private keys = new Map<string, KeyObject>();
  private fetchedAt = 0;

  constructor(
    private readonly audience: string,
    private readonly fetchKeys: () => Promise<Jwk[]> = defaultFetchAppleKeys,
    private readonly issuer = "https://appleid.apple.com",
    private readonly now: () => number = () => Date.now(),
  ) {}

  async verify(token: string): Promise<Identity> {
    const parts = token.split(".");
    if (parts.length !== 3) throw new AuthError("Malformed token");
    const header = JSON.parse(b64url(parts[0]).toString("utf8")) as { alg?: string; kid?: string };
    if (header.alg !== "RS256" || !header.kid) throw new AuthError("Unsupported token");
    const key = await this.key(header.kid);
    if (!key) throw new AuthError("Unknown signing key");
    const ok = verifySignature("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), key, b64url(parts[2]));
    if (!ok) throw new AuthError("Invalid signature");
    const claims = JSON.parse(b64url(parts[1]).toString("utf8")) as { iss?: string; aud?: string | string[]; exp?: number; sub?: string; email?: string };
    if (claims.iss !== this.issuer) throw new AuthError("Wrong issuer");
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(this.audience)) throw new AuthError("Wrong audience", 403);
    if (!claims.exp || claims.exp * 1000 < this.now()) throw new AuthError("Token expired");
    if (!claims.sub) throw new AuthError("No subject");
    return { subject: claims.sub, provider: "apple", email: claims.email };
  }

  private async key(kid: string): Promise<KeyObject | undefined> {
    const stale = this.now() - this.fetchedAt > 6 * 60 * 60 * 1000;
    if (!this.keys.has(kid) || stale) {
      const jwks = await this.fetchKeys();
      this.keys = new Map(jwks.filter((k) => k.kty === "RSA").map((k) => [k.kid, createPublicKey({ key: { kty: k.kty, n: k.n, e: k.e }, format: "jwk" })]));
      this.fetchedAt = this.now();
    }
    return this.keys.get(kid);
  }
}

async function defaultFetchAppleKeys(): Promise<Jwk[]> {
  const res = await fetch("https://appleid.apple.com/auth/keys");
  if (!res.ok) throw new AuthError("Could not fetch signing keys", 401);
  const body = (await res.json()) as { keys: Jwk[] };
  return body.keys;
}

/** Local development only: any bearer token is accepted and becomes the subject. Never deploy with it. */
export class DevTokenVerifier implements TokenVerifier {
  async verify(token: string): Promise<Identity> {
    if (!token) throw new AuthError("Missing token");
    return { subject: `dev:${token.slice(0, 32)}`, provider: "dev" };
  }
}

export async function authenticate(headers: Headers | Record<string, string | undefined>, verifier: TokenVerifier): Promise<Identity> {
  const raw = headers instanceof Headers ? headers.get("authorization") : (headers["authorization"] ?? headers["Authorization"]);
  if (!raw?.startsWith("Bearer ")) throw new AuthError("Missing bearer token");
  return verifier.verify(raw.slice(7).trim());
}
