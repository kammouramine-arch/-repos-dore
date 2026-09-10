import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Environment, SignedDataVerifier } from '@apple/app-store-server-library';
import { APPLE_PRODUCTS, PLAN_ORDER, accessStateFor, planForAppleProduct } from '@devisia/shared';

describe('Apple subscription security', () => {
  it('maps only the three configured product identifiers', () => {
    for (const plan of PLAN_ORDER) expect(planForAppleProduct(APPLE_PRODUCTS[plan])).toBe(plan);
    expect(planForAppleProduct('fr.fake.unlimited')).toBeNull();
  });
  it('uses the pinned public Apple G3 certificate', () => {
    const root = readFileSync('src/lib/billing/certificates/AppleRootCA-G3.cer');
    expect(createHash('sha256').update(root).digest('hex')).toBe('63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179');
  });
  it('rejects unsigned receipts instead of trusting plan or expiry claims', async () => {
    const root = readFileSync('src/lib/billing/certificates/AppleRootCA-G3.cer');
    const verifier = new SignedDataVerifier([root], true, Environment.SANDBOX, 'fr.devisia.app');
    const fake = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ bundleId: 'fr.devisia.app', productId: APPLE_PRODUCTS.ENTREPRISE, expiresDate: Date.now() + 99_999_999 })).toString('base64url')}.`;
    await expect(verifier.verifyAndDecodeTransaction(fake)).rejects.toBeDefined();
    await expect(verifier.verifyAndDecodeNotification(fake)).rejects.toBeDefined();
  });
  it('fails closed if an Apple renewal notification is late', () => {
    const now = new Date('2026-09-05T12:00:00Z');
    const snapshot = { provider: 'apple' as const, plan: 'PRO' as const, status: 'active' as const, trialEndsAt: null, currentPeriodEnd: '2026-09-05T11:59:59Z', cancelAtPeriodEnd: false };
    expect(accessStateFor(snapshot, now).canWrite).toBe(false);
    expect(accessStateFor({ ...snapshot, currentPeriodEnd: '2026-10-05T12:00:00Z', cancelAtPeriodEnd: true }, now).canWrite).toBe(true);
  });
});
