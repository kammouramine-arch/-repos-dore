// Caller identity. Two bearer tokens open the gateway:
//   - a Sign in with Apple identity token (RS256), verified against Apple's public keys. Apple makes it
//     valid for about ten minutes, so the app trades it once at POST /v1/session for
//   - a gateway session token (HS256, signed with DOONCE_SESSION_SECRET), valid for 30 days.
// /v1/session accepts only the Apple token (a session cannot mint another session); /v1/analyze and
// /v1/account accept either (`CompositeTokenVerifier`). Tokens and secrets are never logged.
import { Buffer } from "node:buffer";
import { createHmac, createPublicKey, timingSafeEqual, verify as verifySignature, type KeyObject } from "node:crypto";

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

export interface Jwk { kid: string; kty: string; n: string; e: string; alg?: string; use?: string }

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

// ---------------------------------------------------------------------------------------------
// Gateway session tokens

export const SESSION_ISSUER = "doonce-gateway";
export const SESSION_AUDIENCE = "doonce-app";
export const SESSION_LIFETIME_SECONDS = 30 * 24 * 60 * 60;
export const MIN_SESSION_SECRET_BYTES = 32;

/** What `POST /v1/session` returns. */
export interface IssuedSession {
  accessToken: string;
  /** ISO-8601 UTC without fractional seconds, e.g. 2026-10-29T12:00:00Z. */
  expiresAt: string;
  tokenType: "Bearer";
}

interface SessionClaims { iss?: unknown; aud?: unknown; sub?: unknown; prv?: unknown; iat?: unknown; exp?: unknown }

/** Why a session secret cannot be used, or null when it can. Never includes the secret itself. */
export function sessionSecretProblem(secret: string | undefined): string | null {
  if (!secret) return "DOONCE_SESSION_SECRET is not set";
  if (Buffer.byteLength(secret, "utf8") < MIN_SESSION_SECRET_BYTES) return `DOONCE_SESSION_SECRET is shorter than ${MIN_SESSION_SECRET_BYTES} bytes`;
  return null;
}

function requireSecret(secret: string): Buffer {
  const problem = sessionSecretProblem(secret);
  if (problem) throw new Error(problem);
  // The secret string's UTF-8 bytes are the HMAC key (the deploy workflow generates 48 random bytes, base64).
  return Buffer.from(secret, "utf8");
}

function hs256(key: Buffer, signingInput: string): string {
  return createHmac("sha256", key).update(signingInput).digest("base64url");
}

function encodeSegment(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeSegment(segment: string): unknown {
  try {
    return JSON.parse(b64url(segment).toString("utf8"));
  } catch {
    throw new AuthError("Malformed token");
  }
}

/** Signs gateway session tokens for an identity the Apple verifier (or, locally, the dev verifier) established. */
export class SessionTokenIssuer {
  private readonly key: Buffer;

  constructor(
    secret: string,
    private readonly now: () => number = () => Date.now(),
    private readonly lifetimeSeconds = SESSION_LIFETIME_SECONDS,
  ) {
    this.key = requireSecret(secret);
  }

  issue(identity: Identity): IssuedSession {
    const iat = Math.floor(this.now() / 1000);
    const exp = iat + this.lifetimeSeconds;
    const header = encodeSegment({ alg: "HS256", typ: "JWT" });
    const payload = encodeSegment({ iss: SESSION_ISSUER, aud: SESSION_AUDIENCE, sub: identity.subject, prv: identity.provider, iat, exp });
    const signingInput = `${header}.${payload}`;
    return {
      accessToken: `${signingInput}.${hs256(this.key, signingInput)}`,
      expiresAt: new Date(exp * 1000).toISOString().replace(/\.\d{3}Z$/, "Z"),
      tokenType: "Bearer",
    };
  }
}

/** Verifies a gateway session token: HS256 signature (constant time), issuer, audience, expiry, subject. */
export class SessionTokenVerifier implements TokenVerifier {
  private readonly key: Buffer;

  constructor(secret: string, private readonly now: () => number = () => Date.now()) {
    this.key = requireSecret(secret);
  }

  async verify(token: string): Promise<Identity> {
    const parts = token.split(".");
    if (parts.length !== 3) throw new AuthError("Malformed token");
    const header = decodeSegment(parts[0]) as { alg?: unknown; typ?: unknown } | null;
    if (!header || header.alg !== "HS256" || (header.typ !== undefined && header.typ !== "JWT")) throw new AuthError("Unsupported token");
    // Compare the canonical base64url text so no alternative encoding of the same bytes passes.
    const expected = Buffer.from(hs256(this.key, `${parts[0]}.${parts[1]}`), "utf8");
    const given = Buffer.from(parts[2], "utf8");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new AuthError("Invalid signature");
    const claims = decodeSegment(parts[1]) as SessionClaims | null;
    if (!claims) throw new AuthError("Malformed token");
    if (claims.iss !== SESSION_ISSUER) throw new AuthError("Wrong issuer");
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(SESSION_AUDIENCE)) throw new AuthError("Wrong audience");
    if (typeof claims.exp !== "number" || claims.exp * 1000 <= this.now()) throw new AuthError("Token expired");
    if (typeof claims.sub !== "string" || !claims.sub) throw new AuthError("No subject");
    // Sessions minted in dev mode carry prv "dev" and never open a verifying gateway.
    if (claims.prv !== "apple") throw new AuthError("Unsupported identity provider");
    return { subject: claims.sub, provider: "apple" };
  }
}

/**
 * The verifier for /v1/analyze and /v1/account: a token whose header says HS256 is a gateway session
 * token; anything else goes to the Apple verifier. Without a session verifier (no secret configured),
 * HS256 tokens are refused.
 */
export class CompositeTokenVerifier implements TokenVerifier {
  constructor(private readonly apple: TokenVerifier, private readonly session?: TokenVerifier) {}

  async verify(token: string): Promise<Identity> {
    const parts = token.split(".");
    if (parts.length !== 3) throw new AuthError("Malformed token");
    const header = decodeSegment(parts[0]) as { alg?: unknown } | null;
    if (header?.alg === "HS256") {
      if (!this.session) throw new AuthError("Session tokens are not accepted");
      return this.session.verify(token);
    }
    return this.apple.verify(token);
  }
}

export interface SessionSetup {
  issuer: SessionTokenIssuer;
  /** Verifies the credential presented to POST /v1/session. Never accepts a session token. */
  verifier: TokenVerifier;
}

export interface AuthSetup {
  /** For /v1/analyze and /v1/account. */
  verifier: TokenVerifier;
  /** Absent when sessions are disabled: POST /v1/session then answers 503. */
  session?: SessionSetup;
}

/**
 * Wires the verifiers from configuration, shared by the Edge Function and the Node server.
 *   mode "apple" (default): analyze/account accept Apple or session tokens; /v1/session accepts Apple only.
 *   mode "dev": analyze/account accept any bearer (as before); /v1/session, if a secret is set, issues a
 *   session (prv "dev", which no verifying gateway accepts) for the dev subject.
 * A missing or short secret disables sessions and is logged once, without the secret.
 */
export function configureAuth(options: {
  mode?: string;
  audience: string;
  sessionSecret?: string;
  fetchAppleKeys?: () => Promise<Jwk[]>;
  now?: () => number;
  log?: (event: string, data?: Record<string, unknown>) => void;
}): AuthSetup {
  const now = options.now ?? (() => Date.now());
  const problem = sessionSecretProblem(options.sessionSecret);
  if (problem) options.log?.("auth.sessions_disabled", { reason: problem });
  const secret = problem ? undefined : options.sessionSecret!;

  if (options.mode === "dev") {
    const dev = new DevTokenVerifier();
    return { verifier: dev, session: secret ? { issuer: new SessionTokenIssuer(secret, now), verifier: dev } : undefined };
  }

  const apple = new AppleTokenVerifier(options.audience, options.fetchAppleKeys ?? defaultFetchAppleKeys, "https://appleid.apple.com", now);
  if (!secret) return { verifier: new CompositeTokenVerifier(apple) };
  return {
    verifier: new CompositeTokenVerifier(apple, new SessionTokenVerifier(secret, now)),
    session: { issuer: new SessionTokenIssuer(secret, now), verifier: apple },
  };
}

export async function authenticate(headers: Headers | Record<string, string | undefined>, verifier: TokenVerifier): Promise<Identity> {
  const raw = headers instanceof Headers ? headers.get("authorization") : (headers["authorization"] ?? headers["Authorization"]);
  if (!raw?.startsWith("Bearer ")) throw new AuthError("Missing bearer token");
  return verifier.verify(raw.slice(7).trim());
}
