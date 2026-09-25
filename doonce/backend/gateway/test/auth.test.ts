import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { AppleTokenVerifier, AuthError } from "../../supabase/functions/_shared/auth.ts";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" }) as { kty: string; n: string; e: string };
const keys = [{ kid: "k1", kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", use: "sig" }];

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function makeToken(claims: Record<string, unknown>, kid = "k1", alg = "RS256"): string {
  const header = b64url(JSON.stringify({ alg, kid, typ: "JWT" }));
  const payload = b64url(JSON.stringify(claims));
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), privateKey);
  return `${header}.${payload}.${b64url(signature)}`;
}

const now = 1_800_000_000_000;
const verifier = () => new AppleTokenVerifier("app.doonce.ios", async () => keys, "https://appleid.apple.com", () => now);
const valid = { iss: "https://appleid.apple.com", aud: "app.doonce.ios", exp: now / 1000 + 600, sub: "001234.abc", email: "a@example.com" };

test("a valid Apple identity token yields the subject", async () => {
  const identity = await verifier().verify(makeToken(valid));
  assert.deepEqual(identity, { subject: "001234.abc", provider: "apple", email: "a@example.com" });
});

test("wrong audience, issuer, expiry, key and signature are all refused", async () => {
  await assert.rejects(verifier().verify(makeToken({ ...valid, aud: "other.app" })), (e: unknown) => e instanceof AuthError && e.status === 403);
  await assert.rejects(verifier().verify(makeToken({ ...valid, iss: "https://evil" })), AuthError);
  await assert.rejects(verifier().verify(makeToken({ ...valid, exp: now / 1000 - 1 })), AuthError);
  await assert.rejects(verifier().verify(makeToken(valid, "unknown-kid")), AuthError);
  const forged = makeToken(valid).slice(0, -6) + "AAAAAA";
  await assert.rejects(verifier().verify(forged), AuthError);
  await assert.rejects(verifier().verify("not.a.jwt.at.all"), AuthError);
});

test("keys are cached and refetched after six hours", async () => {
  let fetches = 0;
  let clock = now;
  const v = new AppleTokenVerifier("app.doonce.ios", async () => { fetches += 1; return keys; }, "https://appleid.apple.com", () => clock);
  await v.verify(makeToken({ ...valid, exp: now / 1000 + 100_000 }));
  await v.verify(makeToken({ ...valid, exp: now / 1000 + 100_000 }));
  assert.equal(fetches, 1);
  clock += 7 * 60 * 60 * 1000;
  await v.verify(makeToken({ ...valid, exp: clock / 1000 + 100 }));
  assert.equal(fetches, 2);
});
