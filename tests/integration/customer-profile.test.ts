import { beforeAll, afterAll, it, expect } from 'vitest';
import { cleanupOrganization, createTestCustomer, createTestOrganization, prisma, sampleItems } from '../helpers';
import { getCustomerProfile } from '@/server/services/customerService';
import { createQuote } from '@/server/services/quoteService';
let org: Awaited<ReturnType<typeof createTestOrganization>>;
let customer: Awaited<ReturnType<typeof createTestCustomer>>;
beforeAll(async () => { org = await createTestOrganization('Client profile'); customer = await createTestCustomer(org.organization.id); });
afterAll(async () => { await cleanupOrganization(org.organization.id, org.user.id); await prisma.$disconnect(); });
it('includes real quotes but does not treat a draft as sent revenue', async () => {
  const quote = await createQuote(org.organization.id, org.user.id, { customerId: customer.id, title: 'Profile fixture', items: sampleItems });
  const profile = await getCustomerProfile(org.organization.id, customer.id);
  expect(profile.customer.id).toBe(customer.id);
  expect(profile.stats.quoteCount).toBe(1);
  expect(profile.stats.revenueCents).toBe(0);
  expect(profile.quotes[0].id).toBe(quote.id);
  expect(profile.customer).not.toHaveProperty('conversations');
});
it('does not return a customer through another tenant', async () => {
  await expect(getCustomerProfile('00000000-0000-0000-0000-000000000000', customer.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
