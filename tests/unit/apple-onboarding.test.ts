import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { accessStateFor, authNextStepFor, type SubscriptionSnapshot } from '@devisia/shared';

const now = new Date('2026-09-08T12:00:00Z');
const base: SubscriptionSnapshot = { provider: 'apple', plan: 'PRO', status: 'active', currentPeriodEnd: '2026-09-08T12:05:00Z', trialEndsAt: null, cancelAtPeriodEnd: false };
describe('Apple onboarding and access boundaries', () => {
  it.each([
    ['active paid', {}, 'app'],
    ['active trial', { status: 'trialing', trialEndsAt: base.currentPeriodEnd }, 'app'],
    ['cancelled renewal but entitled', { cancelAtPeriodEnd: true }, 'app'],
    ['expired', { currentPeriodEnd: '2026-09-08T11:59:00Z' }, 'subscription'],
    ['not purchased', { status: 'incomplete', currentPeriodEnd: null }, 'subscription'],
    ['invalid expiry', { currentPeriodEnd: 'invalid' }, 'subscription'],
  ] as const)('%s has the correct server destination', (_name, changes, destination) => {
    const access = accessStateFor({ ...base, ...changes }, now);
    expect(authNextStepFor({ emailVerified: true, canWrite: access.canWrite })).toBe(destination);
    expect(authNextStepFor({ emailVerified: false, canWrite: access.canWrite })).toBe('verify_email');
  });
  it('keeps Home free of subscription banners and requires an explicit card selection', () => {
    expect(readFileSync('mobile/app/(app)/index.tsx', 'utf8')).not.toContain('TrialBanner');
    expect(readFileSync('mobile/src/components/trial-banner.tsx', 'utf8')).not.toContain('trialDaysLeft');
    const paywall = readFileSync('mobile/src/components/apple-paywall.tsx', 'utf8');
    expect(paywall).toContain('useState<PlanId | null>(null)');
    expect(paywall).toContain('if (!selected)');
    expect(paywall).toContain('onPress={() => setSelected(plan)}');
  });
});
