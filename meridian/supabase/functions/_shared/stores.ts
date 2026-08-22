// deno-lint-ignore-file no-explicit-any
import type { SubscriptionStatus } from './plans.ts';
import type { StoreSubscription } from './storeTypes.ts';

export type { StoreSubscription };

/**
 * Server-side store verification.
 *
 * Nothing a device sends is trusted. The client hands over an identifier — Apple's
 * signed transaction (JWS) or Google's purchase token — and this module asks the store
 * itself what is true, authenticated with credentials that exist only as server
 * secrets. The store's answer is the only thing that reaches the database.
 *
 * The same functions serve both paths: a purchase made in the app, and a renewal or
 * cancellation notification arriving from the store. A notification is treated purely
 * as a trigger to re-verify — its contents are never taken at face value.
 */

export class NotConfigured extends Error {
  readonly code = 'store_not_configured';
}
export class VerificationFailed extends Error {
  readonly code = 'verification_failed';
}


// ───────────────────────────────────────────────────────────────── helpers ──

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  return atob(withPadding);
}

/**
 * Reads the payload of a JWS without verifying it.
 *
 * Safe here because nothing from it is trusted: it is used only to find which
 * subscription to ask Apple about. The authoritative data comes from the App Store
 * Server API response, fetched with our own credentials.
 */
export function readJwsPayload(jws: string): Record<string, any> {
  const parts = jws.split('.');
  if (parts.length !== 3) throw new VerificationFailed('Not a signed transaction.');
  try {
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    throw new VerificationFailed('Could not read the signed transaction.');
  }
}

export function looksLikeJws(value: string): boolean {
  return value.split('.').length === 3;
}

const iso = (ms?: number | string | null): string | null => {
  if (ms === null || ms === undefined || ms === '') return null;
  const value = typeof ms === 'string' ? Number(ms) : ms;
  if (!Number.isFinite(value) || value <= 0) return null;
  return new Date(value).toISOString();
};

// ─────────────────────────────────────────────────────────────────── Apple ──

const APPLE_PRODUCTION = 'https://api.storekit.itunes.apple.com';
const APPLE_SANDBOX = 'https://api.storekit-sandbox.itunes.apple.com';

/**
 * ES256 JWT for the App Store Server API, signed with the App Store Connect key.
 * The .p8 private key never leaves the server.
 */
async function appleToken(): Promise<string> {
  const issuer = Deno.env.get('APPLE_ISSUER_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const privateKey = Deno.env.get('APPLE_PRIVATE_KEY');
  const bundleId = Deno.env.get('APPLE_BUNDLE_ID');

  if (!issuer || !keyId || !privateKey || !bundleId) {
    throw new NotConfigured(
      'APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY and APPLE_BUNDLE_ID must all be set.',
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const claims = {
    iss: issuer,
    iat: now,
    exp: now + 900,
    aud: 'appstoreconnect-v1',
    bid: bundleId,
  };

  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unsigned = `${encode(header)}.${encode(claims)}`;

  const pem = privateKey.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsigned),
  );
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${unsigned}.${encodedSignature}`;
}

const APPLE_STATUS: Record<number, SubscriptionStatus> = {
  1: 'active', // active
  2: 'expired', // expired
  3: 'grace_period', // in billing retry
  4: 'grace_period', // in billing grace period
  5: 'expired', // revoked
};

/**
 * Asks Apple for the authoritative state of a subscription.
 * Production is tried first; a sandbox transaction falls through automatically.
 */
export async function verifyApple(input: {
  jws?: string;
  originalTransactionId?: string;
}): Promise<StoreSubscription> {
  const originalTransactionId =
    input.originalTransactionId ??
    (input.jws ? String(readJwsPayload(input.jws).originalTransactionId ?? '') : '');

  if (!originalTransactionId) throw new VerificationFailed('No transaction to verify.');

  const token = await appleToken();
  const fetchStatuses = async (host: string) =>
    fetch(`${host}/inApps/v1/subscriptions/${originalTransactionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

  let response = await fetchStatuses(APPLE_PRODUCTION);
  if (response.status === 404) response = await fetchStatuses(APPLE_SANDBOX);

  if (!response.ok) {
    throw new VerificationFailed(`Apple rejected the lookup (${response.status}).`);
  }

  const body: any = await response.json();
  // Newest transaction across all groups wins.
  const items = (body.data ?? []).flatMap((group: any) => group.lastTransactions ?? []);
  if (items.length === 0) throw new VerificationFailed('Apple returned no subscription.');

  const latest = items
    .map((item: any) => ({
      statusCode: Number(item.status),
      transaction: readJwsPayload(item.signedTransactionInfo),
      renewal: item.signedRenewalInfo ? readJwsPayload(item.signedRenewalInfo) : {},
    }))
    .sort((a: any, b: any) => Number(b.transaction.expiresDate ?? 0) - Number(a.transaction.expiresDate ?? 0))[0];

  const { statusCode, transaction, renewal } = latest;
  const expiresAt = iso(transaction.expiresDate);
  const isTrial = transaction.offerType === 1 || transaction.offerDiscountType === 'FREE_TRIAL';
  const willRenew = renewal.autoRenewStatus === 1;

  let status = APPLE_STATUS[statusCode] ?? 'expired';
  if (status === 'active') {
    if (isTrial) status = 'trialing';
    else if (!willRenew) status = 'canceled';
  }

  return {
    provider: 'apple',
    productId: String(transaction.productId ?? renewal.autoRenewProductId ?? ''),
    status,
    entitled: status !== 'expired',
    startedAt: iso(transaction.purchaseDate),
    expiresAt,
    trialEndsAt: isTrial ? expiresAt : null,
    graceUntil: status === 'grace_period' ? iso(renewal.gracePeriodExpiresDate) ?? expiresAt : null,
    willRenew,
    transactionId: String(transaction.transactionId ?? ''),
    originalTransactionId: String(transaction.originalTransactionId ?? originalTransactionId),
    // One id per transaction state, so re-verifying the same state is a no-op.
    eventId: `apple:${transaction.originalTransactionId}:${transaction.transactionId}:${statusCode}`,
    raw: { statusCode, productId: transaction.productId, expiresDate: transaction.expiresDate },
  };
}

// ────────────────────────────────────────────────────────────────── Google ──

/** Exchanges the service-account key for an androidpublisher access token. */
async function googleAccessToken(): Promise<string> {
  const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!raw) throw new NotConfigured('GOOGLE_SERVICE_ACCOUNT_JSON is not set.');

  let account: { client_email: string; private_key: string };
  try {
    account = JSON.parse(raw);
  } catch {
    throw new NotConfigured('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.');
  }

  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;

  const pem = account.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${encodedSignature}`,
    }),
  });
  if (!res.ok) throw new VerificationFailed(`Google token exchange failed (${res.status}).`);

  const data = await res.json();
  return data.access_token as string;
}

const GOOGLE_STATUS: Record<string, SubscriptionStatus> = {
  SUBSCRIPTION_STATE_ACTIVE: 'active',
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: 'grace_period',
  SUBSCRIPTION_STATE_ON_HOLD: 'grace_period',
  SUBSCRIPTION_STATE_PAUSED: 'grace_period',
  SUBSCRIPTION_STATE_CANCELED: 'canceled',
  SUBSCRIPTION_STATE_EXPIRED: 'expired',
  SUBSCRIPTION_STATE_PENDING: 'expired',
  SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: 'expired',
};

export async function verifyGoogle(purchaseToken: string): Promise<StoreSubscription> {
  const packageName = Deno.env.get('ANDROID_PACKAGE_NAME');
  if (!packageName) throw new NotConfigured('ANDROID_PACKAGE_NAME is not set.');
  if (!purchaseToken) throw new VerificationFailed('No purchase token to verify.');

  const token = await googleAccessToken();
  const res = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new VerificationFailed(`Google rejected the purchase token (${res.status}).`);

  const data: any = await res.json();
  const line = (data.lineItems ?? [])[0];
  if (!line) throw new VerificationFailed('Google returned no subscription.');

  const state = String(data.subscriptionState ?? '');
  let status = GOOGLE_STATUS[state] ?? 'expired';
  const willRenew = Boolean(line.autoRenewingPlan?.autoRenewEnabled);
  const isTrial = Boolean(line.offerDetails?.offerTags?.includes('trial')) || Boolean(data.testPurchase);

  if (status === 'active') {
    if (isTrial) status = 'trialing';
    else if (!willRenew) status = 'canceled';
  }

  const expiresAt = line.expiryTime ?? null;

  return {
    provider: 'google',
    productId: String(line.productId ?? ''),
    status,
    entitled: status !== 'expired',
    startedAt: data.startTime ?? null,
    expiresAt,
    trialEndsAt: isTrial ? expiresAt : null,
    graceUntil: status === 'grace_period' ? expiresAt : null,
    willRenew,
    transactionId: data.latestOrderId ?? null,
    // Google identifies a subscription line by its purchase token.
    originalTransactionId: purchaseToken,
    eventId: `google:${purchaseToken}:${data.latestOrderId ?? ''}:${state}`,
    raw: { state, productId: line.productId, expiryTime: expiresAt },
  };
}

/** One entry point for both stores. */
export async function verifyPurchase(input: {
  provider: 'apple' | 'google';
  token: string;
}): Promise<StoreSubscription> {
  if (input.provider === 'apple') {
    return looksLikeJws(input.token)
      ? verifyApple({ jws: input.token })
      : verifyApple({ originalTransactionId: input.token });
  }
  return verifyGoogle(input.token);
}
