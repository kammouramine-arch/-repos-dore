import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeEach, expect, it } from 'vitest';
import { cleanupOrganization, createTestOrganization, prisma } from '../helpers';
import { hashToken } from '@/lib/auth/tokens';
import { confirmEmailCode } from '@/server/services/accountService';

let org: Awaited<ReturnType<typeof createTestOrganization>>;
const code = '123456';

beforeEach(async () => {
  org = await createTestOrganization('Email codes');
  const id = randomUUID();
  await prisma.emailChallenge.create({ data: {
    userId: org.user.id, id, email: org.user.email,
    tokenHash: hashToken(`${id}:${org.user.id}:${org.user.email}:${code}`),
    expiresAt: new Date(Date.now() + 600_000), sentAt: new Date(), windowStart: new Date(),
  } });
});
afterEach(async () => { if (org) await cleanupOrganization(org.organization.id, org.user.id); });
afterAll(() => prisma.$disconnect());

it('commits at most five wrong attempts under concurrent requests', async () => {
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => confirmEmailCode(org.user.id, randomUUID(), '000000')));
  expect(results.every((result) => result.status === 'rejected')).toBe(true);
  const record = await prisma.emailChallenge.findUniqueOrThrow({ where: { userId: org.user.id } });
  expect(record.attempts).toBe(5);
  await expect(confirmEmailCode(org.user.id, randomUUID(), code)).rejects.toMatchObject({ code: 'VALIDATION' });
});

it('allows a valid code to be consumed only once under concurrent requests', async () => {
  const results = await Promise.allSettled([
    confirmEmailCode(org.user.id, randomUUID(), code),
    confirmEmailCode(org.user.id, randomUUID(), code),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: org.user.id } });
  expect(user.emailVerifiedAt).not.toBeNull();
});
