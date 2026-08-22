import fs from 'fs';
import path from 'path';
import { DEFAULT_CATALOGUE } from '@shared/plans';
import { planForProduct } from '@shared/entitlement';

/**
 * The store boundary.
 *
 * The verification code itself talks to Apple and Google, so it cannot be exercised
 * without live credentials. What *can* be checked here is everything around it: that
 * product ids map to the right plans, that the writes go through the idempotent path,
 * that nothing trusts the device, and that the SQL enforces what the comments claim.
 */

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const stores = read('supabase/functions/_shared/stores.ts');
const verify = read('supabase/functions/subscription-verify/index.ts');
const notifications = read('supabase/functions/store-notifications/index.ts');
const migration = read('supabase/migrations/20260101000500_store_events.sql');

describe('product catalogue', () => {
  it('maps every product id to exactly one plan and cadence', () => {
    const seen = new Map<string, string>();

    for (const tier of DEFAULT_CATALOGUE.order) {
      const plan = DEFAULT_CATALOGUE.plans[tier];
      for (const period of ['monthly', 'yearly'] as const) {
        const price = plan.pricing[period];
        if (!price) continue;

        expect(seen.has(price.productId)).toBe(false);
        seen.set(price.productId, `${tier}/${period}`);

        const match = planForProduct(DEFAULT_CATALOGUE, price.productId);
        expect(`${price.productId} → ${match?.tier}/${match?.period}`).toBe(
          `${price.productId} → ${tier}/${period}`,
        );
      }
    }

    // The six products the stores must be configured with.
    expect([...seen.keys()].sort()).toEqual([
      'meridian.plus.monthly',
      'meridian.plus.yearly',
      'meridian.pro.monthly',
      'meridian.pro.yearly',
      'meridian.ultra.monthly',
      'meridian.ultra.yearly',
    ]);
  });

  it('refuses a product id that is not in the catalogue', () => {
    expect(planForProduct(DEFAULT_CATALOGUE, 'meridian.pro.lifetime')).toBeNull();
    expect(planForProduct(DEFAULT_CATALOGUE, '')).toBeNull();
  });
});

describe('verification asks the store, never the client', () => {
  it('authenticates to Apple with our own App Store Server key', () => {
    expect(stores).toContain('api.storekit.itunes.apple.com');
    expect(stores).toContain('APPLE_ISSUER_ID');
    expect(stores).toContain('appstoreconnect-v1');
    // ES256, signed server-side.
    expect(stores).toContain("namedCurve: 'P-256'");
    // Sandbox transactions fall through automatically.
    expect(stores).toContain('APPLE_SANDBOX');
  });

  it('authenticates to Google with a service account', () => {
    expect(stores).toContain('androidpublisher.googleapis.com');
    expect(stores).toContain('GOOGLE_SERVICE_ACCOUNT_JSON');
    expect(stores).toContain('subscriptionsv2');
  });

  it('reads the client payload only to find what to look up', () => {
    // The unverified payload is explicitly documented as untrusted, and the state
    // written comes from the store's own response.
    expect(stores).toMatch(/without verifying it/i);
    expect(stores).toMatch(/nothing from it is trusted/i);
  });

  it('never accepts a tier, price or status from the request body', () => {
    expect(verify).not.toMatch(/body\.(tier|plan|status|expires|entitlement)/);
    // The tier is derived from the verified product id, in the shared writer.
    const entitlement = read('supabase/functions/_shared/entitlement.ts');
    expect(entitlement).toContain('planForProduct(catalogue, verified.productId)');
    expect(entitlement).toContain('verified.entitled ? match.tier : \'free\'');
  });

  it('requires an authenticated user before doing anything', () => {
    expect(verify).toContain('requireUser(req)');
    expect(verify).toMatch(/if \(!db \|\| !user\) return fail\('unauthorized'/);
  });

  it('rate limits verification attempts', () => {
    expect(verify).toContain("checkRateLimit(admin, user.id, 'subscription_verify'");
  });

  it('refuses a purchase already attached to another account', () => {
    expect(verify).toContain('user_for_original_transaction');
    expect(verify).toContain('already_claimed');
  });

  it('says plainly when the store credentials are missing instead of granting anything', () => {
    expect(verify).toContain('store_not_configured');
    expect(verify).toContain('501');
  });
});

describe('idempotency', () => {
  it('records the store event id before writing entitlement', () => {
    expect(migration).toContain('create table public.store_events');
    expect(migration).toContain('unique (provider, event_id)');
    expect(migration).toMatch(/insert into public\.store_events[\s\S]*on conflict \(provider, event_id\) do nothing/);
    // A duplicate returns early, before the subscription is touched.
    expect(migration).toMatch(/if v_inserted = false then[\s\S]*return query select false, true;/);
  });

  it('writes entitlement only through that function', () => {
    const entitlement = read('supabase/functions/_shared/entitlement.ts');
    expect(entitlement).toContain('apply_store_subscription');
    // No direct write to subscriptions anywhere in the store path.
    for (const source of [entitlement, verify, notifications]) {
      expect(source).not.toMatch(/from\('subscriptions'\)\s*\.\s*(update|upsert|insert)/);
    }
  });

  it('keeps the entitlement writer out of reach of the client', () => {
    expect(migration).toContain('revoke all on function public.apply_store_subscription');
    expect(migration).not.toMatch(/grant execute on function public\.apply_store_subscription[^;]*authenticated/);
  });

  it('derives a stable event id from the store, not from the clock', () => {
    expect(stores).toMatch(/eventId: `apple:\$\{transaction\.originalTransactionId\}/);
    expect(stores).toMatch(/eventId: `google:\$\{purchaseToken\}/);
  });
});

describe('store notifications', () => {
  it('treats the notification as a trigger and re-verifies with the store', () => {
    expect(notifications).toMatch(/Neither payload is trusted/i);
    expect(notifications).toContain('verifyApple({ originalTransactionId })');
    expect(notifications).toContain('verifyGoogle(');
  });

  it('is authenticated by a shared secret, since stores cannot send a JWT', () => {
    expect(notifications).toContain('STORE_WEBHOOK_SECRET');
    expect(notifications).toMatch(/if \(provided !== secret\) return fail\('unauthorized'/);
  });

  it('keys each write to the notification so a retry changes nothing', () => {
    expect(notifications).toContain('apple:notification:${eventId}');
    expect(notifications).toContain('google:notification:${eventId}');
  });

  it('asks for a retry on failure and not on a deliberate ignore', () => {
    // Unknown transactions are a 200 (do not retry); handler failures are a 500.
    expect(notifications).toMatch(/status: 200, body: \{ ignored: true/);
    expect(notifications).toMatch(/status: 500, body: \{ error: applied\.error \}/);
  });

  it('never imports another function module, which would start a second server', () => {
    expect(notifications).not.toMatch(/from '\.\.\/(subscription-verify|ai-chat|transcribe|daily-brief)\//);
  });
});

describe('rate limiting', () => {
  it('counts server-side, in a window, per user and action', () => {
    expect(migration).toContain('create table public.rate_limits');
    expect(migration).toContain('primary key (user_id, action, window_start)');
    expect(migration).toContain('revoke all on function public.check_rate_limit');
  });

  it('is protection in front of the meter, not a replacement for it', () => {
    const helper = read('supabase/functions/_shared/ratelimit.ts');
    // A limiter failure must not take the endpoint down.
    expect(helper).toMatch(/if \(error\) return \{ allowed: true/);
  });
});

describe('the client cannot grant itself anything', () => {
  it('has no path from the app to the subscriptions table except reading it', () => {
    const walk = (dir: string, files: string[] = []): string[] => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, files);
        else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
      }
      return files;
    };

    for (const file of [...walk(path.join(root, 'src')), ...walk(path.join(root, 'app'))]) {
      const body = fs.readFileSync(file, 'utf8');
      const writes = /from\('subscriptions'\)\s*\.\s*(insert|update|upsert|delete)/.test(body);
      expect(`${path.relative(root, file)}: ${writes}`).toBe(`${path.relative(root, file)}: false`);
    }
  });

  it('sends the store token to the server rather than acting on it', () => {
    const purchases = read('src/services/purchases/index.ts');
    expect(purchases).toContain("functions.invoke");
    expect(purchases).toContain('subscription-verify');
    expect(purchases).not.toMatch(/setTier|grantTier|localEntitlement/);
  });

  it('only finishes a transaction after the server has verified it', () => {
    const purchases = read('src/services/purchases/index.ts');
    const verifyIndex = purchases.indexOf('await verify(receipt)');
    const ackIndex = purchases.indexOf('acknowledgePurchase?.(productId)');
    expect(verifyIndex).toBeGreaterThan(-1);
    expect(ackIndex).toBeGreaterThan(verifyIndex);
  });
});
