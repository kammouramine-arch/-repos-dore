import * as Crypto from 'expo-crypto';

/** Cryptographically random identifier, used for entities and session tokens. */
export const createId = (): string => Crypto.randomUUID();
