/**
 * Deterministic authentication state machine shared by the API and clients.
 *
 * A session is not enough to enter the workspace: the account must first prove
 * mailbox ownership, then have an active trial/subscription.
 */
export type AuthNextStep = 'verify_email' | 'onboarding' | 'subscription' | 'app';

export function authNextStepFor(input: { emailVerified: boolean; canWrite: boolean; setupPending?: boolean }): AuthNextStep {
  if (!input.emailVerified) return 'verify_email';
  // An organization created on the fly after Apple/Google sign-in still needs
  // its business name before any plan or workspace makes sense.
  if (input.setupPending) return 'onboarding';
  if (!input.canWrite) return 'subscription';
  return 'app';
}

export type AuthIdentityProvider = 'apple' | 'google';
