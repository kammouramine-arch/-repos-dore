import { describe, expect, it } from 'vitest';
import { authDestination, verificationPath, verificationSourcePath } from '../../mobile/src/lib/auth-navigation';
import type { SessionDTO } from '@devisia/shared';

function session(input: Partial<SessionDTO['user']> & { nextStep: SessionDTO['nextStep']; canWrite: boolean }): SessionDTO {
  return {
    user: { id: 'user', email: 'user@example.test', firstName: null, lastName: null, locale: 'fr', emailVerified: input.emailVerified ?? false },
    organization: { id: 'org', name: 'Atelier', role: 'OWNER', trade: null, onboardingCompleted: false },
    subscription: null,
    access: { canWrite: input.canWrite, inTrial: false, trialDaysLeft: 0, trialExpired: false, paymentIssue: false, reason: input.canWrite ? null : 'subscription_required' },
    nextStep: input.nextStep,
    capabilities: { generation: true, vision: true, transcription: true, provider: 'local' },
  };
}

describe('mobile auth navigation', () => {
  it('routes verified sessions directly to the app or subscription, never verification', () => {
    expect(authDestination(session({ emailVerified: true, nextStep: 'app', canWrite: true }))).toBe('/(app)');
    expect(authDestination(session({ emailVerified: true, nextStep: 'subscription', canWrite: false }))).toBe('/abonnement');
  });

  it('routes only unverified sessions to the verification screen', () => {
    expect(authDestination(session({ emailVerified: false, nextStep: 'verify_email', canWrite: true }))).toBe('/verification');
  });

  it('preserves the source when changing email or starting over', () => {
    expect(verificationPath('signup')).toBe('/verification?source=signup');
    expect(verificationSourcePath('signup')).toBe('/(auth)/inscription');
    expect(verificationSourcePath('signin')).toBe('/(auth)/connexion');
  });
});
