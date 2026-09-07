import { describe, expect, it } from 'vitest';
import { authNextStepFor } from '@devisia/shared';

describe('authentication state machine', () => {
  it('always verifies the mailbox before exposing the workspace', () => {
    expect(authNextStepFor({ emailVerified: false, canWrite: true })).toBe('verify_email');
    expect(authNextStepFor({ emailVerified: false, canWrite: false })).toBe('verify_email');
  });

  it('sends a verified account without access to the subscription gate', () => {
    expect(authNextStepFor({ emailVerified: true, canWrite: false })).toBe('subscription');
  });

  it('opens the workspace only when identity and entitlement are both valid', () => {
    expect(authNextStepFor({ emailVerified: true, canWrite: true })).toBe('app');
  });
});
