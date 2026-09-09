import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ create: vi.fn(), usage: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: {
  quote: { findFirst: async () => ({ id: 'quote', number: 'TEST', status: 'ENVOYE', publicToken: 'test', customer: { email: 'test@example.test' }, organization: { name: 'Test', locale: 'fr', subscription: { plan: 'PRO' } } }) },
  followUp: { create: mocks.create },
} }));
vi.mock('@/lib/email', () => ({ getEmailProvider: () => ({ send: async () => ({ delivered: false }) }), followUpEmail: () => ({}) }));
vi.mock('@/server/services/usageService', () => ({ assertWithinPlan: vi.fn(), incrementUsage: mocks.usage }));
import { sendFollowUp } from '@/server/services/followUpService';
it('never marks a follow-up sent or charges quota without provider acceptance', async () => {
  await expect(sendFollowUp({ organizationId: 'org', userId: 'user', quoteId: 'quote', subject: 'Test', body: 'Test' })).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.usage).not.toHaveBeenCalled();
});
