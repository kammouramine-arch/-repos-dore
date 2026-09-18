import 'server-only';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { env } from '@/lib/env';
import { cleanName, identityRejected, normalizeProviderEmail, splitAudiences, type VerifiedIdentity } from './claims';

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export function googleSignInConfigured(): boolean {
  return splitAudiences(env().GOOGLE_SIGN_IN_CLIENT_IDS).length > 0;
}

/** Vérifie les revendications d'un jeton Google déjà authentifié (signature, expiration). */
export function assertGoogleClaims(
  payload: JWTPayload & { email?: unknown; email_verified?: unknown; given_name?: unknown; family_name?: unknown },
  audiences: string[],
): VerifiedIdentity {
  if (typeof payload.iss !== 'string' || !GOOGLE_ISSUERS.includes(payload.iss)) throw identityRejected('Jeton Google invalide.');
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (audiences.length === 0 || !audience.some((value) => typeof value === 'string' && audiences.includes(value))) {
    throw identityRejected('Ce jeton Google ne concerne pas DEVISERA.');
  }
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw identityRejected('Jeton Google invalide.');
  const email = normalizeProviderEmail(payload.email);
  const emailVerified = email !== null && (payload.email_verified === true || payload.email_verified === 'true');
  return {
    provider: 'GOOGLE',
    subject: payload.sub,
    email,
    emailVerified,
    privateRelay: false,
    firstName: cleanName(payload.given_name),
    lastName: cleanName(payload.family_name),
  };
}

/** Vérifie la signature du jeton d'identité Google avec les clés publiques de Google, puis ses revendications. */
export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedIdentity> {
  const audiences = splitAudiences(env().GOOGLE_SIGN_IN_CLIENT_IDS);
  if (audiences.length === 0) throw identityRejected('La connexion Google n’est pas encore activée sur ce serveur.');
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(idToken, GOOGLE_JWKS, { issuer: GOOGLE_ISSUERS, algorithms: ['RS256'], clockTolerance: 60 }));
  } catch {
    throw identityRejected('La connexion Google n’a pas pu être vérifiée. Réessayez.');
  }
  return assertGoogleClaims(payload, audiences);
}
