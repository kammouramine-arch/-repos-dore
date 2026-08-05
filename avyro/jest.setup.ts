/**
 * Test doubles for native modules that have no JS implementation under Jest.
 *
 * `expo-crypto` is backed by platform crypto on a device and returns
 * `undefined` for everything in a test process. Node's own crypto produces the
 * same values by the same algorithms, so the code under test is exercised for
 * real rather than mocked away — which is the only way the password and session
 * logic can be covered at all.
 */
jest.mock('expo-crypto', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('node:crypto') as typeof import('node:crypto');

  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    randomUUID: () => nodeCrypto.randomUUID(),
    getRandomBytes: (length: number) =>
      new Uint8Array(nodeCrypto.randomBytes(length)),
    digestStringAsync: async (_algorithm: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data).digest('hex'),
  };
});
