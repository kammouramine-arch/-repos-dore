import {
  CURRENT_ALGORITHM,
  burnVerification,
  hashPassword,
  needsRehash,
  verifyPassword,
  type PasswordDigest,
} from './passwordHasher';

const PASSWORD = 'novadrive1';

describe('hashPassword', () => {
  it('records the algorithm that produced the digest', async () => {
    const digest = await hashPassword(PASSWORD);

    expect(digest.algorithm).toBe(CURRENT_ALGORITHM);
    expect(digest.hash).toHaveLength(64);
  });

  it('salts every digest differently', async () => {
    const [first, second] = await Promise.all([
      hashPassword(PASSWORD),
      hashPassword(PASSWORD),
    ]);

    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });

  it('is deterministic for a given salt', async () => {
    const first = await hashPassword(PASSWORD, 'fixed-salt');
    const second = await hashPassword(PASSWORD, 'fixed-salt');

    expect(first.hash).toBe(second.hash);
  });

  it('never returns the password', async () => {
    const digest = await hashPassword(PASSWORD);

    expect(JSON.stringify(digest)).not.toContain(PASSWORD);
  });
});

describe('verifyPassword', () => {
  it('accepts the password it was made from', async () => {
    const digest = await hashPassword(PASSWORD);

    await expect(verifyPassword(PASSWORD, digest)).resolves.toBe(true);
  });

  it('rejects anything else', async () => {
    const digest = await hashPassword(PASSWORD);

    await expect(verifyPassword('novadrive2', digest)).resolves.toBe(false);
    await expect(verifyPassword('', digest)).resolves.toBe(false);
  });

  it('rejects a digest whose salt has been tampered with', async () => {
    const digest = await hashPassword(PASSWORD);

    await expect(
      verifyPassword(PASSWORD, { ...digest, salt: 'different' }),
    ).resolves.toBe(false);
  });
});

describe('burnVerification', () => {
  it('completes without needing an account to verify against', async () => {
    // The defence against account enumeration: the unknown-email path performs
    // the same hash so it cannot be identified by how quickly it fails.
    await expect(burnVerification(PASSWORD)).resolves.toBeUndefined();
  });
});

describe('needsRehash', () => {
  it('leaves current digests alone', async () => {
    expect(needsRehash(await hashPassword(PASSWORD))).toBe(false);
  });

  it('flags a digest from an older algorithm', () => {
    // What the move to a server-side KDF will look like from this side.
    const legacy = {
      algorithm: 'salted-sha256-v0',
      salt: 'abc',
      hash: 'def',
    } as unknown as PasswordDigest;

    expect(needsRehash(legacy)).toBe(true);
  });
});
