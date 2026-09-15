import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Génère un token opaque à haute entropie (base64url). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Empreinte stockée en base — le token en clair n'est jamais persisté. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Empreinte d'IP non réversible, pour l'audit sans stocker de donnée personnelle. */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}
