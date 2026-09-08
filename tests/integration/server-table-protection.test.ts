import { afterAll, expect, it } from 'vitest';
import { prisma } from '../helpers';

afterAll(() => prisma.$disconnect());

it('keeps sensitive server-only tables protected from policy-free public access', async () => {
  const rows = await prisma.$queryRaw<Array<{ relname: string; relrowsecurity: boolean }>>`
    SELECT relname, relrowsecurity FROM pg_class
    WHERE oid IN ('public.email_challenges'::regclass, 'public.file_blobs'::regclass)
    ORDER BY relname
  `;
  expect(rows).toEqual([
    { relname: 'email_challenges', relrowsecurity: true },
    { relname: 'file_blobs', relrowsecurity: true },
  ]);
  const policies = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('email_challenges', 'file_blobs')
  `;
  expect(policies).toEqual([]);
});
