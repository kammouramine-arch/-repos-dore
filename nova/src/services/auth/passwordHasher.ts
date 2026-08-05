import * as Crypto from 'expo-crypto';

export interface PasswordDigest {
  salt: string;
  hash: string;
}

const SALT_BYTES = 16;

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/** Length-safe comparison that does not short-circuit on the first difference. */
const equals = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
};

/**
 * Per-account salted SHA-256.
 *
 * This is the device-local stand-in used while Sprint 1 has no backend: it
 * keeps plaintext passwords out of the keystore and makes rainbow tables
 * useless. It is deliberately NOT a slow KDF — password stretching (Argon2id)
 * belongs on the server, and moves there with the hosted identity service.
 */
export const hashPassword = async (
  password: string,
  salt: string = toHex(Crypto.getRandomBytes(SALT_BYTES)),
): Promise<PasswordDigest> => {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`,
  );

  return { salt, hash };
};

export const verifyPassword = async (
  password: string,
  digest: PasswordDigest,
): Promise<boolean> => {
  const candidate = await hashPassword(password, digest.salt);
  return equals(candidate.hash, digest.hash);
};
