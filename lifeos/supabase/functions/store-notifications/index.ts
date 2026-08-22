// deno-lint-ignore-file no-explicit-any
import { fail, json } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';
import { loadCatalogue } from '../_shared/config.ts';
import { readJwsPayload, verifyApple, verifyGoogle, NotConfigured, VerificationFailed } from '../_shared/stores.ts';
import { applyVerified } from '../_shared/entitlement.ts';

/**
 * Renewal and cancellation notifications from the stores.
 *
 * Apple sends App Store Server Notifications v2; Google sends Real-time Developer
 * Notifications through Pub/Sub. Neither payload is trusted: it is read only far
 * enough to learn *which* subscription changed, and then the store is asked directly
 * — with our own credentials — what the state now is. That makes a forged payload
 * useless, and it means the handler is correct even if the notification is stale or
 * arrives out of order.
 *
 * Deployed without JWT verification (the stores cannot send one), so the URL carries a
 * secret only we and the store know:
 *
 *   supabase functions deploy store-notifications --no-verify-jwt
 *   https://<project>.functions.supabase.co/store-notifications?key=$STORE_WEBHOOK_SECRET
 *
 * Everything is idempotent: `apply_store_subscription` records the store's own event
 * id first, so a retried delivery changes nothing twice. Failures return 500 so the
 * store retries; anything we deliberately ignore returns 200 so it does not.
 */

type Handled = { status: number; body: Record<string, unknown> };

async function record(
  admin: ReturnType<typeof adminClient>,
  provider: 'apple' | 'google',
  eventId: string,
  kind: string,
  status: 'ignored' | 'failed',
  detail: string,
  payload: Record<string, unknown> = {},
) {
  await admin.from('store_events').upsert(
    { provider, event_id: eventId, kind, status, error: detail, payload },
    { onConflict: 'provider,event_id' },
  );
}

async function handleApple(admin: ReturnType<typeof adminClient>, body: any): Promise<Handled> {
  const signedPayload = String(body?.signedPayload ?? '');
  if (!signedPayload) return { status: 400, body: { error: 'Missing signedPayload' } };

  // Read-only: this tells us what changed, never what to write.
  const notification = readJwsPayload(signedPayload);
  const eventId = String(notification.notificationUUID ?? crypto.randomUUID());
  const kind = String(notification.notificationType ?? 'UNKNOWN');
  const subtype = String(notification.subtype ?? '');

  const transactionInfo = notification.data?.signedTransactionInfo
    ? readJwsPayload(notification.data.signedTransactionInfo)
    : null;
  const originalTransactionId = String(transactionInfo?.originalTransactionId ?? '');

  if (!originalTransactionId) {
    await record(admin, 'apple', eventId, kind, 'ignored', 'No original transaction id');
    return { status: 200, body: { ignored: true, reason: 'no_transaction' } };
  }

  const { data: userId } = await admin.rpc('user_for_original_transaction', {
    p_original_transaction_id: originalTransactionId,
  });
  if (!userId) {
    // A purchase we have never seen — the app will link it when it next verifies.
    await record(admin, 'apple', eventId, kind, 'ignored', 'Unknown transaction', { subtype });
    return { status: 200, body: { ignored: true, reason: 'unknown_transaction' } };
  }

  const verified = await verifyApple({ originalTransactionId });
  const catalogue = await loadCatalogue(admin);
  const applied = await applyVerified(admin, catalogue, userId as string, {
    ...verified,
    // Key the write to this notification so a retried delivery is a no-op.
    eventId: `apple:notification:${eventId}`,
  });

  if ('error' in applied) {
    await record(admin, 'apple', eventId, kind, 'failed', applied.error);
    return { status: 500, body: { error: applied.error } };
  }

  return {
    status: 200,
    body: { handled: true, kind, subtype, tier: applied.tier, duplicate: applied.duplicate },
  };
}

async function handleGoogle(admin: ReturnType<typeof adminClient>, body: any): Promise<Handled> {
  // Pub/Sub push: the notification is base64 inside message.data.
  const encoded = body?.message?.data;
  if (!encoded) return { status: 400, body: { error: 'Missing message.data' } };

  const notification = JSON.parse(atob(String(encoded)));
  const eventId = String(body.message.messageId ?? crypto.randomUUID());
  const subscription = notification.subscriptionNotification;

  if (!subscription?.purchaseToken) {
    // Test pings and one-off product notifications are not our concern.
    await record(admin, 'google', eventId, 'other', 'ignored', 'Not a subscription notification');
    return { status: 200, body: { ignored: true, reason: 'not_subscription' } };
  }

  const kind = `TYPE_${subscription.notificationType}`;
  const { data: userId } = await admin.rpc('user_for_original_transaction', {
    p_original_transaction_id: subscription.purchaseToken,
  });
  if (!userId) {
    await record(admin, 'google', eventId, kind, 'ignored', 'Unknown purchase token');
    return { status: 200, body: { ignored: true, reason: 'unknown_transaction' } };
  }

  const verified = await verifyGoogle(String(subscription.purchaseToken));
  const catalogue = await loadCatalogue(admin);
  const applied = await applyVerified(admin, catalogue, userId as string, {
    ...verified,
    eventId: `google:notification:${eventId}`,
  });

  if ('error' in applied) {
    await record(admin, 'google', eventId, kind, 'failed', applied.error);
    return { status: 500, body: { error: applied.error } };
  }

  return { status: 200, body: { handled: true, kind, tier: applied.tier, duplicate: applied.duplicate } };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST', 405);

  const secret = Deno.env.get('STORE_WEBHOOK_SECRET');
  if (!secret) {
    return fail('not_configured', 'STORE_WEBHOOK_SECRET is not set. See docs/BILLING.md.', 501);
  }

  // The stores cannot send a bearer token, so the endpoint is addressed by a secret.
  const url = new URL(req.url);
  const provided = url.searchParams.get('key') ?? req.headers.get('x-webhook-secret') ?? '';
  if (provided !== secret) return fail('unauthorized', 'Bad webhook key', 401);

  const body = await req.json().catch(() => null);
  if (!body) return fail('bad_request', 'Body must be JSON');

  const admin = adminClient();
  const isApple = typeof body.signedPayload === 'string';

  try {
    const result = isApple ? await handleApple(admin, body) : await handleGoogle(admin, body);
    return json(result.body, result.status);
  } catch (e) {
    if (e instanceof NotConfigured) {
      return fail('store_not_configured', e.message, 501);
    }
    const message = e instanceof VerificationFailed || e instanceof Error ? e.message : 'Failed';
    // 500 asks the store to retry, which is what we want for a transient failure.
    return fail('handler_failed', message, 500);
  }
});
