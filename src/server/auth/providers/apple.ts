import 'server-only';
import { createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, SignJWT, importPKCS8, type JWTPayload } from 'jose';
import { env } from '@/lib/env';
import { cleanName, identityRejected, isApplePrivateRelay, normalizeProviderEmail, splitAudiences, type VerifiedIdentity } from './claims';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export interface AppleTokenInput {
  identityToken: string;
  /** Nonce brut dont l'empreinte SHA-256 a été transmise à Apple par l'application. */
  nonce?: string | null;
  fullName?: { givenName?: string | null; familyName?: string | null } | null;
}

/** Vérifie les revendications d'un jeton Apple déjà authentifié (signature, expiration). */
export function assertAppleClaims(
  payload: JWTPayload & { email?: unknown; email_verified?: unknown; is_private_email?: unknown; nonce?: unknown; nonce_supported?: unknown },
  input: { nonce?: string | null; audiences: string[] },
): Omit<VerifiedIdentity, 'firstName' | 'lastName'> {
  if (payload.iss !== APPLE_ISSUER) throw identityRejected('Jeton Apple invalide.');
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audience.some((value) => typeof value === 'string' && input.audiences.includes(value))) {
    throw identityRejected('Ce jeton Apple ne concerne pas DEVISERA.');
  }
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw identityRejected('Jeton Apple invalide.');
  if (input.nonce) {
    const expected = createHash('sha256').update(input.nonce).digest('hex');
    if (payload.nonce !== expected) throw identityRejected('La session Apple ne correspond pas à cette demande.');
  } else if (payload.nonce_supported === true && typeof payload.nonce === 'string') {
    // Apple a reçu un nonce que l'application n'a pas transmis : refus.
    throw identityRejected('La session Apple ne correspond pas à cette demande.');
  }
  const email = normalizeProviderEmail(payload.email);
  // Apple ne transmet que des adresses vérifiées (réelles ou relayées) ;
  // `email_verified` arrive tantôt en booléen, tantôt en chaîne.
  const verifiedClaim = payload.email_verified === true || payload.email_verified === 'true';
  const privateRelay = payload.is_private_email === true || payload.is_private_email === 'true' || isApplePrivateRelay(email);
  return {
    provider: 'APPLE',
    subject: payload.sub,
    email,
    emailVerified: email !== null && (verifiedClaim || privateRelay || payload.email_verified === undefined),
    privateRelay,
  };
}

/** Vérifie la signature du jeton d'identité Apple avec les clés publiques d'Apple, puis ses revendications. */
export async function verifyAppleIdentityToken(input: AppleTokenInput): Promise<VerifiedIdentity> {
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(input.identityToken, APPLE_JWKS, { issuer: APPLE_ISSUER, algorithms: ['RS256'], clockTolerance: 60 }));
  } catch {
    throw identityRejected('La connexion Apple n’a pas pu être vérifiée. Réessayez.');
  }
  const claims = assertAppleClaims(payload, { nonce: input.nonce, audiences: splitAudiences(env().APPLE_SIGN_IN_BUNDLE_IDS) });
  return {
    ...claims,
    firstName: cleanName(input.fullName?.givenName),
    lastName: cleanName(input.fullName?.familyName),
  };
}

/** Vrai quand la clé Sign in with Apple est configurée (échange et révocation possibles). */
export function appleRevocationConfigured(): boolean {
  const config = env();
  return Boolean(config.APPLE_SIGN_IN_TEAM_ID && config.APPLE_SIGN_IN_KEY_ID && config.APPLE_SIGN_IN_PRIVATE_KEY);
}

async function appleClientSecret(clientId: string): Promise<string> {
  const config = env();
  const key = await importPKCS8(config.APPLE_SIGN_IN_PRIVATE_KEY!.replace(/\\n/g, '\n'), 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: config.APPLE_SIGN_IN_KEY_ID! })
    .setIssuer(config.APPLE_SIGN_IN_TEAM_ID!)
    .setIssuedAt()
    .setExpirationTime('10m')
    .setAudience(APPLE_ISSUER)
    .setSubject(clientId)
    .sign(key);
}

/**
 * Échange le code d'autorisation contre un jeton de rafraîchissement, que
 * DEVISERA conserve chiffré pour révoquer l'autorisation si le compte est
 * supprimé (exigence App Store 5.1.1 (v)). Silencieux si non configuré.
 */
export async function exchangeAppleAuthorizationCode(authorizationCode: string): Promise<string | null> {
  if (!appleRevocationConfigured()) return null;
  const clientId = splitAudiences(env().APPLE_SIGN_IN_BUNDLE_IDS)[0]!;
  try {
    const body = new URLSearchParams({ client_id: clientId, client_secret: await appleClientSecret(clientId), code: authorizationCode, grant_type: 'authorization_code' });
    const response = await fetch(`${APPLE_ISSUER}/auth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (!response.ok) return null;
    const json = (await response.json()) as { refresh_token?: string };
    return typeof json.refresh_token === 'string' ? json.refresh_token : null;
  } catch {
    return null;
  }
}

/** Révoque l'autorisation Sign in with Apple. Renvoie faux sans lever si Apple refuse ou si rien n'est configuré. */
export async function revokeAppleToken(refreshToken: string): Promise<boolean> {
  if (!appleRevocationConfigured()) return false;
  const clientId = splitAudiences(env().APPLE_SIGN_IN_BUNDLE_IDS)[0]!;
  try {
    const body = new URLSearchParams({ client_id: clientId, client_secret: await appleClientSecret(clientId), token: refreshToken, token_type_hint: 'refresh_token' });
    const response = await fetch(`${APPLE_ISSUER}/auth/revoke`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    return response.ok;
  } catch {
    return false;
  }
}
