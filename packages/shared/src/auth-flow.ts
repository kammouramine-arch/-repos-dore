/**
 * Deterministic authentication state machine shared by the API and clients.
 *
 * A session is not enough to enter the workspace: the account must first prove
 * mailbox ownership, then have an active trial/subscription.
 */
export type AuthNextStep = 'verify_email' | 'subscription' | 'app';

export function authNextStepFor(input: { emailVerified: boolean; canWrite: boolean }): AuthNextStep {
  if (!input.emailVerified) return 'verify_email';
  if (!input.canWrite) return 'subscription';
  return 'app';
}
