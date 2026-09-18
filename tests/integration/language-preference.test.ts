import { beforeAll, afterAll, it, expect } from 'vitest';
import { cleanupOrganization, createTestOrganization, prisma } from '../helpers';
import { updatePreferredLanguage } from '@/server/services/languageService';
import { buildSessionDTOFor } from '@/server/services/sessionDto';
let org: Awaited<ReturnType<typeof createTestOrganization>>;
beforeAll(async () => { org = await createTestOrganization('Language preference'); });
afterAll(async () => { await cleanupOrganization(org.organization.id, org.user.id); await prisma.$disconnect(); });
it('persists English without changing French country, currency or timezone', async () => {
  await updatePreferredLanguage(org.user.id, 'en');
  const session = await buildSessionDTOFor(org.user.id, org.organization.id);
  expect(session.user.locale).toBe('en');
  const business = await prisma.organization.findUniqueOrThrow({ where: { id: org.organization.id } });
  expect([business.country, business.currency, business.timezone]).toEqual(['FR', 'EUR', 'Europe/Paris']);
  await updatePreferredLanguage(org.user.id, 'fr');
  expect((await buildSessionDTOFor(org.user.id, org.organization.id)).user.locale).toBe('fr');
});
it('rejects unsupported languages instead of silently changing the preference', async () => {
  await expect(updatePreferredLanguage(org.user.id, 'en-US')).rejects.toThrow();
  expect((await prisma.user.findUniqueOrThrow({ where: { id: org.user.id } })).locale).toBe('fr');
});
