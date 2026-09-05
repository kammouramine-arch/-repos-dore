import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ find: vi.fn(), mark: vi.fn(), usage: vi.fn(), followups: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { quote: { findFirst: mocks.find } } }));
vi.mock('@/lib/email', () => ({ getEmailProvider: () => ({ name: 'console', available: true }), quoteSentEmail: vi.fn() }));
vi.mock('@/server/services/quoteService', () => ({ markQuoteSent: mocks.mark }));
vi.mock('@/server/services/quotePdfService', () => ({ buildQuotePdf: vi.fn() }));
vi.mock('@/server/services/usageService', () => ({ incrementUsage: mocks.usage, assertWithinPlan: vi.fn() }));
vi.mock('@/server/services/followUpService', () => ({ scheduleFollowUpsForQuote: mocks.followups }));
import { sendQuote } from '@/server/services/quoteSendService';

it('never marks a quote sent or consumes quota when email is not configured', async () => {
  await expect(sendQuote({ organizationId: 'org', userId: 'user', quoteId: 'quote' })).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  expect(mocks.find).not.toHaveBeenCalled();
  expect(mocks.mark).not.toHaveBeenCalled();
  expect(mocks.usage).not.toHaveBeenCalled();
  expect(mocks.followups).not.toHaveBeenCalled();
});
