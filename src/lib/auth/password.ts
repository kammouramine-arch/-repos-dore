import bcrypt from 'bcryptjs';
import { validation } from '../errors';
import { passwordErrors } from '@devisia/shared';

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
  const errors = passwordErrors(plain);
  if (errors.length > 0) {
    throw validation('Mot de passe trop faible.', { password: errors });
  }
}
