import bcrypt from 'bcryptjs';
import { validation } from '../errors';

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  assertPasswordStrength(plain);
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** Politique de mot de passe : lisible pour l'utilisateur, suffisante contre le bruteforce. */
export function assertPasswordStrength(plain: string) {
  const errors: string[] = [];
  if (plain.length < 10) errors.push('Au moins 10 caractères.');
  if (!/[a-zà-ÿ]/i.test(plain)) errors.push('Au moins une lettre.');
  if (!/\d/.test(plain)) errors.push('Au moins un chiffre.');
  if (errors.length > 0) {
    throw validation('Mot de passe trop faible.', { password: errors });
  }
}
