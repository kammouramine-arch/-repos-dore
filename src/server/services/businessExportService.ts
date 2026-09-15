import 'server-only';
import { prisma } from '@/lib/prisma';
import { notFound } from '@/lib/errors';

/** Structured business export. Secrets, sessions, tokens and provider config are deliberately excluded. */
export async function exportBusinessData(organizationId: string) {
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
    select: {
      id: true, name: true, slug: true, country: true, currency: true, timezone: true, locale: true,
      businessProfile: { select: { legalName: true, trade: true, vatStatus: true, vatNumber: true, siret: true, addressLine1: true, city: true, postalCode: true, email: true, phone: true } },
      customers: { where: { deletedAt: null }, select: { id: true, firstName: true, lastName: true, companyName: true, email: true, phone: true, addressLine1: true, addressLine2: true, city: true, postalCode: true, country: true, notes: true, tags: true, createdAt: true, updatedAt: true } },
      leads: { where: { deletedAt: null }, select: { id: true, customerId: true, contactName: true, email: true, phone: true, city: true, postalCode: true, title: true, description: true, jobType: true, status: true, source: true, estimatedCents: true, nextFollowUpAt: true, createdAt: true, updatedAt: true } },
      jobs: { where: { deletedAt: null }, select: { id: true, customerId: true, leadId: true, title: true, description: true, status: true, addressLine1: true, city: true, postalCode: true, scheduledAt: true, completedAt: true, createdAt: true, updatedAt: true } },
      quotes: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' }, select: { id: true, customerId: true, leadId: true, jobId: true, number: true, title: true, summary: true, status: true, subtotalCents: true, discountCents: true, netSubtotalCents: true, vatCents: true, totalCents: true, validUntil: true, sentAt: true, firstViewedAt: true, acceptedAt: true, refusedAt: true, createdAt: true, updatedAt: true, items: { orderBy: { position: 'asc' }, select: { label: true, description: true, unit: true, quantity: true, unitPriceCents: true, vatRate: true, lineTotalCents: true, vatCents: true } } } },
      invoices: { select: { id: true, customerId: true, quoteId: true, jobId: true, number: true, status: true, issuedAt: true, dueAt: true, subtotalCents: true, vatCents: true, totalCents: true, paidCents: true, notes: true, createdAt: true, updatedAt: true } },
    },
  });
  if (!organization) throw notFound('Entreprise introuvable.');
  return { schemaVersion: 1, exportedAt: new Date().toISOString(), scope: 'business', organization };
}
