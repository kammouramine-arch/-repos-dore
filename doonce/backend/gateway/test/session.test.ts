// Gateway session tokens: POST /v1/session trades an Apple identity token for a 30-day HS256 token.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync, sign } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { makeHandler } from "../../supabase/functions/_shared/http.ts";
import {
  AuthError,
  configureAuth,
  CompositeTokenVerifier,
  SESSION_LIFETIME_SECONDS,
  SessionTokenIssuer,
  SessionTokenVerifier,
  sessionSecretProblem,
} from "../../supabase/functions/_shared/auth.ts";
import { boilerRequest, goodModelOutput } from "./fixtures.ts";

const SECRET = "test-secret-that-is-comfortably-longer-than-32-bytes";
const now = 1_800_000_000_000; // 2027-01-15T08:00:00Z

// Apple side: a locally generated RSA key served by a fake JWKS fetcher (as in auth.test.ts).
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" }) as { kty: string; n: string; e: string };
const fetchAppleKeys = async () => [{ kid: "k1", kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", use: "sig" }];

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function appleToken(claims: Record<string, unknown> = {}): string {
  const header = b64url(JSON.stringify({ alg: "RS256", kid: "k1", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iss: "https://appleid.apple.com", aud: "app.doonce.ios", exp: now / 1000 + 600, sub: "001234.abc", ...claims }));
  return `${header}.${payload}.${b64url(sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), privateKey))}`;
}

/** An HS256 token signed with `secret` over arbitrary claims, to craft wrong-issuer/audience cases. */
function hsToken(claims: Record<string, unknown>, secret = SECRET, header: Record<string, unknown> = { alg: "HS256", typ: "JWT" }): string {
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(claims));
  return `${h}.${p}.${b64url(createHmac("sha256", secret).update(`${h}.${p}`).digest())}`;
}

const validClaims = { iss: "doonce-gateway", aud: "doonce-app", sub: "001234.abc", prv: "apple", iat: now / 1000, exp: now / 1000 + 3600 };

function decode(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}

const client = {
  beta: { messages: { stream: () => ({ finalMessage: async () => ({ model: "claude-opus-5", stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(goodModelOutput) }], usage: { input_tokens: 1, output_tokens: 1 } }) }) } },
} as unknown as Anthropic;

function gateway(sessionSecret: string | undefined, log?: (event: string, data?: Record<string, unknown>) => void) {
  const auth = configureAuth({ audience: "app.doonce.ios", sessionSecret, fetchAppleKeys, now: () => now, log });
  return makeHandler({ anthropic: client, verifier: auth.verifier, session: auth.session, analyzePerMinute: 100 });
}

const post = (url: string, token?: string, body = "{}") =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body });

test("issue → verify round trip with the documented header, claims and expiry", async () => {
  const session = new SessionTokenIssuer(SECRET, () => now + 123).issue({ subject: "001234.abc", provider: "apple" });
  assert.equal(session.tokenType, "Bearer");
  assert.equal(session.expiresAt, "2027-02-14T08:00:00Z");
  assert.match(session.expiresAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  const [h, p] = session.accessToken.split(".");
  assert.deepEqual(decode(h), { alg: "HS256", typ: "JWT" });
  const claims = decode(p);
  assert.deepEqual(claims, { iss: "doonce-gateway", aud: "doonce-app", sub: "001234.abc", prv: "apple", iat: now / 1000, exp: now / 1000 + SESSION_LIFETIME_SECONDS });
  assert.equal(SESSION_LIFETIME_SECONDS, 30 * 24 * 60 * 60);
  const identity = await new SessionTokenVerifier(SECRET, () => now + 29 * 24 * 3600 * 1000).verify(session.accessToken);
  assert.deepEqual(identity, { subject: "001234.abc", provider: "apple" });
});

test("an expired session token is refused", async () => {
  const { accessToken } = new SessionTokenIssuer(SECRET, () => now).issue({ subject: "s", provider: "apple" });
  const later = new SessionTokenVerifier(SECRET, () => now + (SESSION_LIFETIME_SECONDS + 1) * 1000);
  await assert.rejects(later.verify(accessToken), (e: unknown) => e instanceof AuthError && e.status === 401 && e.message === "Token expired");
});

test("tampered signatures, payloads, algorithms and other secrets are refused", async () => {
  const verifier = new SessionTokenVerifier(SECRET, () => now);
  const { accessToken } = new SessionTokenIssuer(SECRET, () => now).issue({ subject: "001234.abc", provider: "apple" });
  const [h, p, s] = accessToken.split(".");
  const flipped = s.slice(0, -2) + (s.at(-2) === "A" ? "B" : "A") + s.at(-1);
  await assert.rejects(verifier.verify(`${h}.${p}.${flipped}`), AuthError);
  await assert.rejects(verifier.verify(`${h}.${p}.${s}x`), AuthError);
  await assert.rejects(verifier.verify(`${h}.${p}.`), AuthError);
  const otherSubject = b64url(JSON.stringify({ ...decode(p), sub: "someone-else" }));
  await assert.rejects(verifier.verify(`${h}.${otherSubject}.${s}`), AuthError);
  await assert.rejects(verifier.verify(hsToken(validClaims, "a-different-secret-that-is-also-long-enough")), AuthError);
  const none = `${b64url(JSON.stringify({ alg: "none", typ: "JWT" }))}.${p}.`;
  await assert.rejects(verifier.verify(none), AuthError);
  await assert.rejects(verifier.verify("not-a-jwt"), AuthError);
  await assert.rejects(verifier.verify("%%%.%%%.%%%"), AuthError);
  // The crafting helper itself produces tokens the verifier accepts, so the rejections above are meaningful.
  assert.equal((await verifier.verify(hsToken(validClaims))).subject, "001234.abc");
});

test("wrong audience, issuer, provider or a missing subject are refused", async () => {
  const verifier = new SessionTokenVerifier(SECRET, () => now);
  await assert.rejects(verifier.verify(hsToken({ ...validClaims, aud: "someone-else" })), (e: unknown) => e instanceof AuthError && e.message === "Wrong audience");
  await assert.rejects(verifier.verify(hsToken({ ...validClaims, iss: "https://appleid.apple.com" })), (e: unknown) => e instanceof AuthError && e.message === "Wrong issuer");
  await assert.rejects(verifier.verify(hsToken({ ...validClaims, prv: "dev" })), AuthError);
  await assert.rejects(verifier.verify(hsToken({ ...validClaims, sub: "" })), AuthError);
  await assert.rejects(verifier.verify(hsToken({ ...validClaims, exp: "never" })), AuthError);
});

test("a secret shorter than 32 bytes is refused", () => {
  assert.equal(sessionSecretProblem(undefined), "DOONCE_SESSION_SECRET is not set");
  assert.match(sessionSecretProblem("short")!, /shorter than 32 bytes/);
  assert.equal(sessionSecretProblem("x".repeat(32)), null);
  assert.throws(() => new SessionTokenIssuer("x".repeat(31)));
  assert.throws(() => new SessionTokenVerifier(""));
});

test("POST /v1/session trades an Apple token for a session, on every path prefix", async () => {
  const handler = gateway(SECRET);
  for (const prefix of ["", "/doonce-analyze", "/functions/v1/doonce-analyze"]) {
    const res = await handler(post(`https://ref.supabase.co${prefix}/v1/session`, appleToken()));
    assert.equal(res.status, 200, prefix);
    assert.equal(res.headers.get("cache-control"), "no-store");
    const body = await res.json();
    assert.deepEqual(Object.keys(body).sort(), ["accessToken", "expiresAt", "tokenType"]);
    assert.equal(body.tokenType, "Bearer");
    assert.equal(body.expiresAt, "2027-02-14T08:00:00Z");
    assert.equal(decode(body.accessToken.split(".")[1]).sub, "001234.abc");
  }
});

test("a session token cannot mint another session; missing or bad Apple tokens get 401", async () => {
  const handler = gateway(SECRET);
  const { accessToken } = await (await handler(post("http://x/v1/session", appleToken()))).json();
  const again = await handler(post("http://x/v1/session", accessToken));
  assert.equal(again.status, 401);
  assert.deepEqual(Object.keys((await again.json()).error).sort(), ["code", "message"]);
  const none = await handler(post("http://x/v1/session"));
  assert.equal(none.status, 401);
  assert.equal((await none.json()).error.code, "unauthorized");
  assert.equal((await handler(post("http://x/v1/session", appleToken({ exp: now / 1000 - 1 })))).status, 401);
  assert.equal((await handler(post("http://x/v1/session", appleToken({ aud: "other.app" })))).status, 403);
  assert.equal((await handler(new Request("http://x/v1/session", { headers: { authorization: `Bearer ${appleToken()}` } }))).status, 404, "GET is not a route");
});

test("/v1/analyze and /v1/account accept a session token and still accept the Apple token", async () => {
  const handler = gateway(SECRET);
  const { accessToken } = await (await handler(post("http://x/v1/session", appleToken()))).json();
  // Well past the Apple token's ten minutes: only the session token is still good.
  const analyzed = await handler(post("http://x/v1/analyze", accessToken, JSON.stringify(boilerRequest)));
  assert.equal(analyzed.status, 200);
  assert.equal((await analyzed.json()).title, "Repressurise boiler");
  assert.equal((await handler(post("http://x/v1/analyze", appleToken(), JSON.stringify(boilerRequest)))).status, 200);
  assert.equal((await handler(new Request("http://x/v1/account", { method: "DELETE", headers: { authorization: `Bearer ${accessToken}` } }))).status, 202);
  assert.equal((await handler(post("http://x/v1/analyze", hsToken(validClaims, "a-different-secret-that-is-also-long-enough"), JSON.stringify(boilerRequest)))).status, 401);
  const expired = hsToken({ ...validClaims, exp: now / 1000 - 1 });
  assert.equal((await handler(post("http://x/v1/analyze", expired, JSON.stringify(boilerRequest)))).status, 401);
});

test("the session token keeps working after the Apple token has expired", async () => {
  let clock = now;
  const auth = configureAuth({ audience: "app.doonce.ios", sessionSecret: SECRET, fetchAppleKeys, now: () => clock });
  const handler = makeHandler({ anthropic: client, verifier: auth.verifier, session: auth.session });
  const apple = appleToken();
  const { accessToken } = await (await handler(post("http://x/v1/session", apple))).json();
  clock += 11 * 60 * 1000;
  assert.equal((await handler(post("http://x/v1/analyze", apple, JSON.stringify(boilerRequest)))).status, 401);
  assert.equal((await handler(post("http://x/v1/analyze", accessToken, JSON.stringify(boilerRequest)))).status, 200);
});

test("without a secret: /v1/session answers 503, analyze still works with an Apple token, logged once", async () => {
  for (const secret of [undefined, "too-short"]) {
    const events: Array<{ event: string; data?: Record<string, unknown> }> = [];
    const handler = gateway(secret, (event, data) => events.push({ event, data }));
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "auth.sessions_disabled");
    if (secret) assert.ok(!JSON.stringify(events).includes(secret), "the secret is never logged");
    const res = await handler(post("http://x/v1/session", appleToken()));
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.error.code, "session_unavailable");
    assert.equal(typeof body.error.message, "string");
    assert.equal((await handler(post("http://x/v1/analyze", appleToken(), JSON.stringify(boilerRequest)))).status, 200);
    // An HS256 token cannot be verified without the secret, so it is refused rather than trusted.
    assert.equal((await handler(post("http://x/v1/analyze", hsToken(validClaims), JSON.stringify(boilerRequest)))).status, 401);
  }
});

test("dev mode: analyze accepts any bearer as before; /v1/session issues a dev session only with a secret", async () => {
  const dev = configureAuth({ mode: "dev", audience: "app.doonce.ios", sessionSecret: SECRET, now: () => now });
  const handler = makeHandler({ anthropic: client, verifier: dev.verifier, session: dev.session });
  assert.equal((await handler(post("http://x/v1/analyze", "me", JSON.stringify(boilerRequest)))).status, 200);
  const res = await handler(post("http://x/v1/session", "me"));
  assert.equal(res.status, 200);
  const { accessToken } = await res.json();
  assert.equal(decode(accessToken.split(".")[1]).prv, "dev");
  // A dev-minted session never opens a verifying gateway, even one sharing the secret.
  await assert.rejects(new SessionTokenVerifier(SECRET, () => now).verify(accessToken), AuthError);
  const noSecret = configureAuth({ mode: "dev", audience: "app.doonce.ios" });
  assert.equal(noSecret.session, undefined);
});

test("the composite verifier routes by header algorithm", async () => {
  const seen: string[] = [];
  const apple = { verify: async () => { seen.push("apple"); return { subject: "a", provider: "apple" as const }; } };
  const session = { verify: async () => { seen.push("session"); return { subject: "s", provider: "apple" as const }; } };
  const composite = new CompositeTokenVerifier(apple, session);
  await composite.verify(hsToken(validClaims));
  await composite.verify(appleToken());
  assert.deepEqual(seen, ["session", "apple"]);
  await assert.rejects(new CompositeTokenVerifier(apple).verify(hsToken(validClaims)), AuthError);
  await assert.rejects(composite.verify("garbage"), AuthError);
});
