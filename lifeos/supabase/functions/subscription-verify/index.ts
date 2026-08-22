// deno-lint-ignore-file no-explicit-any
import { fail, json, preflight } from '../_shared/http.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import { loadCatalogue } from '../_shared/config.ts';
import { checkRateLimit } from '../_shared/ratelimit.ts';
import { NotConfigured, VerificationFailed, verifyPurchase, type StoreSubscription } from '../_shared/stores.ts';
import { applyVerified } from '../_shared/entitlement.ts';

/**
 * Verifies a store purchase and writes the resulting entitlement.
 *
 * The client never decides what it has bought. It sends the identifier the store gave
 * it — Apple's signed transaction or Google's purchase token — and this function asks
 * the store what is actually true, then writes the subscription with the service role.
 * `subscriptions` is read-only to the user, so this is the only path to a paid tier.
 *
 * Writes go through `apply_store_subscription`, which records the store's own event id
 * first: a replayed receipt or a duplicated notification updates nothing twice.
 */

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST', 405);

  const { client: db, user, error: authError } = await requireUser(req);
  if (!db || !user) return fail('unauthorized', authError ?? 'Not authenticated', 401);

  const admin = adminClient();

  // Verification is cheap for us but expensive for the stores; keep it sane.
  const limit = await checkRateLimit(admin, user.id, 'subscription_verify', 20, 300);
  if (!limit.allowed) {
    return fail('rate_limited', `Too many attempts. Try again in ${limit.retryAfter}s.`, 429);
  }

  const body = await req.json().catch(() => null);
  if (!body) return fail('bad_request', 'Body must be JSON');

  const provider = body.platform === 'apple' || body.platform === 'google' ? body.platform : null;
  if (!provider) return fail('bad_request', 'platform must be "apple" or "google"');

  const token = String(
    body.purchase_token ?? body.receipt ?? body.jws ?? body.transaction_id ?? '',
  ).trim();
  if (!token) return fail('bad_request', 'A purchase token or signed transaction is required.');

  let verified: StoreSubscription;
  try {
    verified = await verifyPurchase({ provider, token });
  } catch (e) {
    if (e instanceof NotConfigured) {
      return fail(
        'store_not_configured',
        `Store verification is not configured on this server. ${e.message} See docs/BILLING.md.`,
        501,
      );
    }
    if (e instanceof VerificationFailed) return fail('verification_failed', e.message, 402);
    return fail('verification_failed', e instanceof Error ? e.message : 'Could not verify.', 402);
  }

  // A store subscription belongs to exactly one account.
  const { data: owner } = await admin.rpc('user_for_original_transaction', {
    p_original_transaction_id: verified.originalTransactionId,
  });
  if (owner && owner !== user.id) {
    return fail('already_claimed', 'That purchase is already linked to a different account.', 409);
  }

  const catalogue = await loadCatalogue(db);
  const applied = await applyVerified(admin, catalogue, user.id, verified);
  if ('error' in applied) {
    const unknownProduct = applied.error.includes('not a plan');
    return fail(unknownProduct ? 'unknown_product' : 'db_error', applied.error, unknownProduct ? 422 : 500);
  }

  return json({
    tier: applied.tier,
    status: verified.entitled ? verified.status : 'expired',
    expires_at: verified.expiresAt,
    will_renew: verified.willRenew,
    is_trial: Boolean(verified.trialEndsAt),
    /** True when this exact state had already been recorded — nothing changed. */
    duplicate: applied.duplicate,
  });
});
