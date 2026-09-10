import type { SessionDTO } from '@devisia/shared';

/**
 * One routing decision for every mobile authentication entry point.
 *
 * Keeping this in one place prevents sign-in, sign-up and post-verification
 * flows from drifting apart (the source of the old "verify on every login"
 * regression). The server remains authoritative; this is only the client
 * projection of the already authenticated session response.
 */
export type AuthDestination = '/verification' | '/abonnement' | '/(app)';

export function authDestination(session: SessionDTO): AuthDestination {
  if (session.nextStep === 'verify_email' || !session.user.emailVerified) return '/verification';
  if (session.nextStep === 'subscription' || !session.access?.canWrite) return '/abonnement';
  return '/(app)';
}

export function verificationSourcePath(source: 'signin' | 'signup' = 'signin'): '/(auth)/connexion' | '/(auth)/inscription' {
  return source === 'signup' ? '/(auth)/inscription' : '/(auth)/connexion';
}

export function verificationPath(source: 'signin' | 'signup' = 'signin'): `/verification?source=${'signin' | 'signup'}` {
  return `/verification?source=${source}` as `/verification?source=${'signin' | 'signup'}`;
}
