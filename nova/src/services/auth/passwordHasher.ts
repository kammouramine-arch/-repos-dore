import * as Crypto from 'expo-crypto';

/**
 * The algorithm a digest was produced with.
 *
 * Stored alongside every digest so more than one can exist at a time. That is
 * the whole point: when hashing moves to the server's KDF, old digests stay
 * verifiable while `needsRehash` marks them for upgrade on the next successful
 * sign-in. Without this field the migration would need every user's plaintext,
 * which by definition nobody has.
 */
export type PasswordAlgorithm = 'salted-sha256-v1';

export const CURRENT_ALGORITHM: PasswordAlgorithm = 'salted-sha256-v1';

export interface PasswordDigest {
  algorithm: PasswordAlgorithm;
  salt: string;
  hash: string;
}

const SALT_BYTES = 16;

/**
 * Fixed salt used to verify a password against nothing at all, so that a
 * missing account costs the same time as a wrong password.
 */
const DECOY_SALT = '00000000000000000000000000000000';

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
 * The device-local stand-in used while Nova has no backend: it keeps plaintext
 * passwords out of the keystore and makes rainbow tables useless. It is
 * deliberately NOT a slow KDF — password stretching (Argon2id) belongs on the
 * server, and moves there with the hosted identity service.
 */
export const hashPassword = async (
  password: string,
  salt: string = toHex(Crypto.getRandomBytes(SALT_BYTES)),
): Promise<PasswordDigest> => {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`,
  );

  return { algorithm: CURRENT_ALGORITHM, salt, hash };
};

export const verifyPassword = async (
  password: string,
  digest: PasswordDigest,
): Promise<boolean> => {
  const candidate = await hashPassword(password, digest.salt);
  return equals(candidate.hash, digest.hash);
};

/**
 * Performs the same work as a verification without having anything to verify.
 *
 * Called when no account matches the email, so that the "unknown account" and
 * "wrong password" paths are indistinguishable from the outside. Without it,
 * response time alone reveals which addresses are registered.
 */
export const burnVerification = async (password: string): Promise<void> => {
  await hashPassword(password, DECOY_SALT);
};

/** True when a stored digest predates the current algorithm and should be upgraded. */
export const needsRehash = (digest: PasswordDigest): boolean =>
  digest.algorithm !== CURRENT_ALGORITHM;
