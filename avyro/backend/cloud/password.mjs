import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

// Cloudflare production WebCrypto caps PBKDF2 at 100k, unlike local workerd.
// Keep the 600k work factor in the private Durable Object using the MIT library.
export async function derivePasswordValue(password, salt) {
  const derived = await pbkdf2Async(sha256, password, salt, { c: 600000, dkLen: 32 });
  try { return Buffer.from(derived).toString('hex'); }
  finally { derived.fill(0); }
}
