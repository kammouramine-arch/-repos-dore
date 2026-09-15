import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({ env: () => ({ APPLE_SIGN_IN_BUNDLE_IDS: 'fr.devisia.app', GOOGLE_SIGN_IN_CLIENT_IDS: 'ios-client.apps.googleusercontent.com' }) }));

import { assertAppleClaims } from '@/server/auth/providers/apple';
import { assertGoogleClaims } from '@/server/auth/providers/google';
import { isApplePrivateRelay, normalizeProviderEmail } from '@/server/auth/providers/claims';
import { authNextStepFor } from '@devisia/shared';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const appleBase = { iss: 'https://appleid.apple.com', aud: 'fr.devisia.app', sub: '001234.abcdef', email: 'Karim@Example.test', email_verified: 'true' };

describe('Apple identity claims', () => {
  it('accepts a token for the DEVISERA bundle with a matching nonce and reads the relay flag', () => {
    const claims = assertAppleClaims({ ...appleBase, email: 'x@privaterelay.appleid.com', is_private_email: 'true', nonce: sha256('raw-nonce') }, { nonce: 'raw-nonce', audiences: ['fr.devisia.app'] });
    expect(claims).toEqual({ provider: 'APPLE', subject: '001234.abcdef', email: 'x@privaterelay.appleid.com', emailVerified: true, privateRelay: true });
  });

  it('rejects another app, another issuer or a nonce mismatch', () => {
    expect(() => assertAppleClaims({ ...appleBase, aud: 'com.other.app' }, { audiences: ['fr.devisia.app'] })).toThrow(/ne concerne pas/);
    expect(() => assertAppleClaims({ ...appleBase, iss: 'https://evil.example' }, { audiences: ['fr.devisia.app'] })).toThrow(/invalide/);
    expect(() => assertAppleClaims({ ...appleBase, nonce: sha256('other') }, { nonce: 'raw-nonce', audiences: ['fr.devisia.app'] })).toThrow(/ne correspond pas/);
    expect(() => assertAppleClaims({ ...appleBase, nonce: sha256('other'), nonce_supported: true }, { audiences: ['fr.devisia.app'] })).toThrow(/ne correspond pas/);
  });

  it('normalizes the address and treats Apple addresses as verified', () => {
    const claims = assertAppleClaims({ ...appleBase, email_verified: undefined }, { audiences: ['fr.devisia.app'] });
    expect(claims.email).toBe('karim@example.test');
    expect(claims.emailVerified).toBe(true);
    expect(isApplePrivateRelay('abc@privaterelay.appleid.com')).toBe(true);
    expect(normalizeProviderEmail('not-an-email')).toBeNull();
  });
});

describe('Google identity claims', () => {
  const base = { iss: 'accounts.google.com', aud: 'ios-client.apps.googleusercontent.com', sub: '1099', email: 'sophie@example.test', email_verified: true, given_name: 'Sophie', family_name: 'Lemoine' };

  it('accepts a token for a configured client and keeps the verified flag honest', () => {
    expect(assertGoogleClaims(base, ['ios-client.apps.googleusercontent.com'])).toEqual({ provider: 'GOOGLE', subject: '1099', email: 'sophie@example.test', emailVerified: true, privateRelay: false, firstName: 'Sophie', lastName: 'Lemoine' });
    expect(assertGoogleClaims({ ...base, email_verified: false }, ['ios-client.apps.googleusercontent.com']).emailVerified).toBe(false);
  });

  it('rejects unknown audiences and issuers, and refuses everything when no client is configured', () => {
    expect(() => assertGoogleClaims({ ...base, aud: 'other-client' }, ['ios-client.apps.googleusercontent.com'])).toThrow(/ne concerne pas/);
    expect(() => assertGoogleClaims({ ...base, iss: 'https://evil.example' }, ['ios-client.apps.googleusercontent.com'])).toThrow(/invalide/);
    expect(() => assertGoogleClaims(base, [])).toThrow(/ne concerne pas/);
  });
});

describe('next step after sign-in', () => {
  it('sends a social sign-up to onboarding before any plan, and nowhere near email verification', () => {
    expect(authNextStepFor({ emailVerified: true, canWrite: false, setupPending: true })).toBe('onboarding');
    expect(authNextStepFor({ emailVerified: true, canWrite: false, setupPending: false })).toBe('subscription');
    expect(authNextStepFor({ emailVerified: false, canWrite: false, setupPending: true })).toBe('verify_email');
    expect(authNextStepFor({ emailVerified: true, canWrite: true })).toBe('app');
  });
});
