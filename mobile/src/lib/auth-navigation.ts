import type { SessionDTO } from '@devisia/shared';

/**
 * One routing decision for every mobile authentication entry point.
 *
 * Keeping this in one place prevents sign-in, sign-up and post-verification
 * flows from drifting apart (the source of the old "verify on every login"
 * regression). The server remains authoritative; this is only the client
 * projection of the already authenticated session response.
 */
export type AuthDestination = '/verification' | '/bienvenue' | '/abonnement' | '/(app)';

export function authDestination(session: SessionDTO): AuthDestination {
  if (session.nextStep === 'verify_email' || !session.user.emailVerified) return '/verification';
  // An Apple/Google sign-up still has to name their business.
  if (session.nextStep === 'onboarding' || session.organization.setupPending) return '/bienvenue';
  if (session.nextStep === 'subscription' || !session.access?.canWrite) return '/abonnement';
  return '/(app)';
}

/** True while the organization created after a social sign-in has no confirmed name. */
export function needsBusinessSetup(session: SessionDTO | null | undefined): boolean {
  return Boolean(session && session.user.emailVerified && (session.nextStep === 'onboarding' || session.organization.setupPending));
}

export function verificationSourcePath(source: 'signin' | 'signup' = 'signin'): '/(auth)/connexion' | '/(auth)/inscription' {
  return source === 'signup' ? '/(auth)/inscription' : '/(auth)/connexion';
}

export function verificationPath(source: 'signin' | 'signup' = 'signin'): `/verification?source=${'signin' | 'signup'}` {
  return `/verification?source=${source}` as `/verification?source=${'signin' | 'signup'}`;
}
