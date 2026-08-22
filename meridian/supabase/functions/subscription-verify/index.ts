// deno-lint-ignore-file no-explicit-any
import { fail, json, preflight } from '../_shared/http.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import { loadCatalogue } from '../_shared/config.ts';
import type { Catalogue, SubscriptionStatus, Tier } from '../_shared/plans.ts';

/**
 * Verifies a store purchase and writes the resulting entitlement.
 *
 * The client never decides what it has bought. It sends the receipt (Apple) or
 * purchase token (Google); this function asks the store what is actually true and
 * writes the subscription row with the service role. The `subscriptions` table is
 * read-only to the user, so this is the only path to a paid tier.
 *
 * Credentials are required and are not assumed to exist: without them the endpoint
 * answers 501 with what is missing, rather than pretending a purchase succeeded.
 */

type Platform = 'apple' | 'google';

type StoreResult = {
  productId: string;
  expiresAt: string | null;
  startedAt: string | null;
  status: SubscriptionStatus;
  willRenew: boolean;
  isTrial: boolean;
  transactionId: string | null;
  originalTransactionId: string | null;
  graceUntil: string | null;
};

/** Finds which plan and cadence a store product id belongs to. */
function planForProduct(catalogue: Catalogue, productId: string): { tier: Tier; period: 'monthly' | 'yearly' } | null {
  for (const tier of catalogue.order) {
    const plan = catalogue.plans[tier];
    if (!plan) continue;
    if (plan.pricing.monthly?.productId === productId) return { tier, period: 'monthly' };
    if (plan.pricing.yearly?.productId === productId) return { tier, period: 'yearly' };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────── Apple ──

const APPLE_PRODUCTION = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

async function verifyApple(receipt: string): Promise<StoreResult> {
  const secret = Deno.env.get('APPLE_SHARED_SECRET');
  if (!secret) throw new NotConfigured('APPLE_SHARED_SECRET is not set.');

  const body = JSON.stringify({
    'receipt-data': receipt,
    password: secret,
    'exclude-old-transactions': true,
  });

  const post = (url: string) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });

  let response = await post(APPLE_PRODUCTION);
  let payload: any = await response.json();

  // 21007 means a sandbox receipt was sent to production, which is normal in review.
  if (payload?.status === 21007) {
    response = await post(APPLE_SANDBOX);
    payload = await response.json();
  }

  if (payload?.status !== 0) {
    throw new VerificationFailed(`Apple rejected the receipt (status ${payload?.status}).`);
  }

  const latest = (payload.latest_receipt_info ?? []).sort(
    (a: any, b: any) => Number(b.expires_date_ms ?? 0) - Number(a.expires_date_ms ?? 0),
  )[0];
  if (!latest) throw new VerificationFailed('The receipt contains no subscription.');

  const renewal = (payload.pending_renewal_info ?? []).find(
    (r: any) => r.original_transaction_id === latest.original_transaction_id,
  );

  const expiresMs = Number(latest.expires_date_ms ?? 0);
  const inBillingRetry = renewal?.is_in_billing_retry_period === '1';
  const gracePeriodMs = Number(renewal?.grace_period_expires_date_ms ?? 0);
  const now = Date.now();

  let status: SubscriptionStatus = 'expired';
  if (expiresMs > now) status = latest.is_trial_period === 'true' ? 'trialing' : 'active';
  else if (gracePeriodMs > now || inBillingRetry) status = 'grace_period';
  if (status === 'active' && renewal?.auto_renew_status === '0') status = 'canceled';

  return {
    productId: String(latest.product_id),
    expiresAt: expiresMs ? new Date(expiresMs).toISOString() : null,
    startedAt: latest.purchase_date_ms ? new Date(Number(latest.purchase_date_ms)).toISOString() : null,
    status,
    willRenew: renewal?.auto_renew_status === '1',
    isTrial: latest.is_trial_period === 'true' || latest.is_in_intro_offer_period === 'true',
    transactionId: latest.transaction_id ?? null,
    originalTransactionId: latest.original_transaction_id ?? null,
    graceUntil: gracePeriodMs ? new Date(gracePeriodMs).toISOString() : null,
  };
}

// ────────────────────────────────────────────────────────────────── Google ──

/** Exchanges the service-account key for an access token (RS256, no dependencies). */
async function googleAccessToken(): Promise<string> {
  const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!raw) throw new NotConfigured('GOOGLE_SERVICE_ACCOUNT_JSON is not set.');

  const account = JSON.parse(raw) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const base64url = (input: string) =>
    btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

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

async function verifyGoogle(purchaseToken: string): Promise<StoreResult> {
  const packageName = Deno.env.get('ANDROID_PACKAGE_NAME');
  if (!packageName) throw new NotConfigured('ANDROID_PACKAGE_NAME is not set.');

  const token = await googleAccessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${purchaseToken}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new VerificationFailed(`Google rejected the purchase token (${res.status}).`);

  const data: any = await res.json();
  const line = (data.lineItems ?? [])[0];
  if (!line) throw new VerificationFailed('The purchase contains no subscription.');

  const state = String(data.subscriptionState ?? '');
  const status: SubscriptionStatus =
    state === 'SUBSCRIPTION_STATE_ACTIVE'
      ? line.offerDetails?.offerId && data.testPurchase == null && line.autoRenewingPlan?.autoRenewEnabled === false
        ? 'canceled'
        : 'active'
      : state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'
        ? 'grace_period'
        : state === 'SUBSCRIPTION_STATE_CANCELED'
          ? 'canceled'
          : state === 'SUBSCRIPTION_STATE_ON_HOLD' || state === 'SUBSCRIPTION_STATE_PAUSED'
            ? 'grace_period'
            : 'expired';

  return {
    productId: String(line.productId),
    expiresAt: line.expiryTime ?? null,
    startedAt: data.startTime ?? null,
    status,
    willRenew: Boolean(line.autoRenewingPlan?.autoRenewEnabled),
    isTrial: Boolean(line.offerDetails?.offerTags?.includes('trial')),
    transactionId: data.latestOrderId ?? null,
    originalTransactionId: data.linkedPurchaseToken ?? purchaseToken,
    graceUntil: state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD' ? (line.expiryTime ?? null) : null,
  };
}

class NotConfigured extends Error {}
class VerificationFailed extends Error {}

// ───────────────────────────────────────────────────────────────── handler ──

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST', 405);

  const { client: db, user, error: authError } = await requireUser(req);
  if (!db || !user) return fail('unauthorized', authError ?? 'Not authenticated', 401);

  const body = await req.json().catch(() => null);
  if (!body) return fail('bad_request', 'Body must be JSON');

  const platform = body.platform as Platform;
  if (platform !== 'apple' && platform !== 'google') {
    return fail('bad_request', 'platform must be "apple" or "google"');
  }

  let result: StoreResult;
  try {
    result =
      platform === 'apple'
        ? await verifyApple(String(body.receipt ?? ''))
        : await verifyGoogle(String(body.purchase_token ?? ''));
  } catch (e) {
    if (e instanceof NotConfigured) {
      return fail(
        'store_not_configured',
        `Store verification is not configured on this server. ${e.message} See docs/BILLING.md.`,
        501,
      );
    }
    return fail('verification_failed', e instanceof Error ? e.message : 'Could not verify.', 402);
  }

  const catalogue = await loadCatalogue(db);
  const match = planForProduct(catalogue, result.productId);
  if (!match) {
    return fail('unknown_product', `"${result.productId}" is not a plan in this catalogue.`, 422);
  }

  const admin = adminClient();

  // A store subscription belongs to one account. If this original transaction is
  // already attached elsewhere, refuse rather than silently moving entitlement.
  if (result.originalTransactionId) {
    const { data: existing } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('store_original_transaction_id', result.originalTransactionId)
      .maybeSingle();
    if (existing && existing.user_id !== user.id) {
      return fail(
        'already_claimed',
        'That purchase is already linked to a different account.',
        409,
      );
    }
  }

  const entitled = result.status !== 'expired';
  const { error: writeError } = await admin
    .from('subscriptions')
    .upsert(
      {
        user_id: user.id,
        tier: entitled ? match.tier : 'free',
        status: entitled ? result.status : 'expired',
        platform,
        provider: platform,
        product_id: result.productId,
        started_at: result.startedAt ?? new Date().toISOString(),
        current_period_start: result.startedAt,
        current_period_end: result.expiresAt,
        trial_ends_at: result.isTrial ? result.expiresAt : null,
        grace_until: result.graceUntil,
        canceled_at: result.status === 'canceled' ? new Date().toISOString() : null,
        will_renew: result.willRenew,
        store_transaction_id: result.transactionId,
        store_original_transaction_id: result.originalTransactionId,
        last_verified_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (writeError) return fail('db_error', writeError.message, 500);

  return json({
    tier: entitled ? match.tier : 'free',
    status: entitled ? result.status : 'expired',
    period: match.period,
    expires_at: result.expiresAt,
    will_renew: result.willRenew,
    is_trial: result.isTrial,
  });
});
