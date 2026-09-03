import 'server-only';
import type { LeadSourceType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { notFound } from '@/lib/errors';
import { toCustomerDTO } from '../dto';
import { recordAudit } from './auditService';

export interface CustomerWriteInput {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string;
  notes?: string | null;
  tags?: string[];
  source?: LeadSourceType;
}

export async function listCustomers(
  organizationId: string,
  options: { search?: string; take?: number; skip?: number } = {},
) {
  const where: Prisma.CustomerWhereInput = {
    organizationId,
    deletedAt: null,
    ...(options.search
      ? {
          OR: [
            { firstName: { contains: options.search, mode: 'insensitive' } },
            { lastName: { contains: options.search, mode: 'insensitive' } },
            { companyName: { contains: options.search, mode: 'insensitive' } },
            { email: { contains: options.search, mode: 'insensitive' } },
            { phone: { contains: options.search, mode: 'insensitive' } },
            { city: { contains: options.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.take ?? 50,
      skip: options.skip ?? 0,
      include: {
        quotes: {
          where: { deletedAt: null },
          select: { id: true, status: true, totalCents: true },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    total,
    items: rows.map((customer) => {
      const accepted = customer.quotes.filter((quote) => quote.status === 'ACCEPTE');
      return {
        ...toCustomerDTO(customer),
        quoteCount: customer.quotes.length,
        acceptedCount: accepted.length,
        revenueCents: accepted.reduce((acc, quote) => acc + quote.totalCents, 0),
      };
    }),
  };
}

/** Fiche client complète : chantiers, devis, factures, échanges, activité. */
export async function getCustomer(organizationId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId, deletedAt: null },
    include: {
      quotes: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: { items: false },
      },
      jobs: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      invoices: { orderBy: { createdAt: 'desc' }, include: { payments: true } },
      leads: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      conversations: {
        orderBy: { lastMessageAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 20 } },
      },
    },
  });
  if (!customer) throw notFound('Client introuvable.');

  const accepted = customer.quotes.filter((quote) => quote.status === 'ACCEPTE');
  return {
    customer,
    stats: {
      quoteCount: customer.quotes.length,
      acceptedCount: accepted.length,
      jobCount: customer.jobs.length,
      revenueCents: accepted.reduce((acc, quote) => acc + quote.totalCents, 0),
      pendingCents: customer.quotes
        .filter((quote) => ['ENVOYE', 'CONSULTE', 'MODIFICATION_DEMANDEE'].includes(quote.status))
        .reduce((acc, quote) => acc + quote.totalCents, 0),
    },
  };
}

export async function createCustomer(
  organizationId: string,
  userId: string,
  input: CustomerWriteInput,
) {
  const customer = await prisma.customer.create({
    data: {
      organizationId,
      firstName: input.firstName || null,
      lastName: input.lastName || null,
      companyName: input.companyName || null,
      email: input.email?.toLowerCase() || null,
      phone: input.phone || null,
      addressLine1: input.addressLine1 || null,
      addressLine2: input.addressLine2 || null,
      city: input.city || null,
      postalCode: input.postalCode || null,
      country: input.country ?? 'FR',
      notes: input.notes || null,
      tags: input.tags ?? [],
      source: input.source ?? 'MANUEL',
    },
  });
  await recordAudit({
    action: 'customer.created',
    organizationId,
    userId,
    entityType: 'customer',
    entityId: customer.id,
  });
  return toCustomerDTO(customer);
}

export async function updateCustomer(
  organizationId: string,
  userId: string,
  customerId: string,
  input: CustomerWriteInput,
) {
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw notFound('Client introuvable.');

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      firstName: input.firstName === undefined ? undefined : input.firstName || null,
      lastName: input.lastName === undefined ? undefined : input.lastName || null,
      companyName: input.companyName === undefined ? undefined : input.companyName || null,
      email: input.email === undefined ? undefined : input.email?.toLowerCase() || null,
      phone: input.phone === undefined ? undefined : input.phone || null,
      addressLine1: input.addressLine1 === undefined ? undefined : input.addressLine1 || null,
      addressLine2: input.addressLine2 === undefined ? undefined : input.addressLine2 || null,
      city: input.city === undefined ? undefined : input.city || null,
      postalCode: input.postalCode === undefined ? undefined : input.postalCode || null,
      country: input.country,
      notes: input.notes === undefined ? undefined : input.notes || null,
      tags: input.tags,
      source: input.source,
    },
  });
  await recordAudit({
    action: 'customer.updated',
    organizationId,
    userId,
    entityType: 'customer',
    entityId: customerId,
  });
  return toCustomerDTO(customer);
}

/** Suppression logique : l'historique financier du client est conservé. */
export async function deleteCustomer(organizationId: string, userId: string, customerId: string) {
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw notFound('Client introuvable.');
  await prisma.customer.update({ where: { id: customerId }, data: { deletedAt: new Date() } });
  await recordAudit({
    action: 'customer.deleted',
    organizationId,
    userId,
    entityType: 'customer',
    entityId: customerId,
  });
}
