import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '@/lib/env';

/**
 * Chiffrement symétrique au repos (AES-256-GCM) pour les quelques secrets que
 * le serveur doit conserver, comme le jeton de rafraîchissement Apple qui
 * permet de révoquer une autorisation à la suppression du compte. La clé
 * dérive de `AUTH_SECRET` : rien de plus à configurer.
 */
function key(): Buffer {
  return createHash('sha256').update(`devisera:secret-box:${env().AUTH_SECRET}`).digest();
}

export function seal(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function open(sealed: string): string | null {
  try {
    const [version, iv, tag, data] = sealed.split('.');
    if (version !== 'v1' || !iv || !tag || !data) return null;
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
