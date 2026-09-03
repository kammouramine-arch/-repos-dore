import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

export const prisma = new PrismaClient();

/** Crée une organisation isolée pour un test, avec son propriétaire. */
export async function createTestOrganization(name = 'Entreprise Test') {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: {
      email: `test-${suffix}@devisia.test`,
      passwordHash: 'hash-de-test',
      firstName: 'Test',
      lastName: 'Utilisateur',
    },
  });

  const organization = await prisma.organization.create({
    data: {
      name: `${name} ${suffix}`,
      slug: `test-${suffix}`,
      members: { create: { userId: user.id, role: 'OWNER' } },
      settings: { create: {} },
      subscription: { create: { plan: 'PRO', status: 'active' } },
      businessProfile: {
        create: {
          legalName: `${name} ${suffix}`,
          email: `contact-${suffix}@devisia.test`,
          defaultHourlyCents: 5500,
          quoteValidityDays: 30,
        },
      },
    },
  });

  // Automatisations par défaut, comme le fait `createOrganization` en production.
  await prisma.automation.createMany({
    data: [
      { organizationId: organization.id, name: 'Relance 24 h', trigger: 'DEVIS_NON_CONSULTE', delayHours: 24, isActive: true },
      { organizationId: organization.id, name: 'Relance 3 jours', trigger: 'DEVIS_CONSULTE_SANS_REPONSE', delayHours: 72, isActive: true },
    ],
  });

  return { user, organization };
}

export async function createTestCustomer(organizationId: string, email?: string) {
  return prisma.customer.create({
    data: {
      organizationId,
      firstName: 'Jean',
      lastName: 'Dupont',
      email: email ?? `client-${randomUUID().slice(0, 8)}@devisia.test`,
      city: 'Lyon',
    },
  });
}

export async function cleanupOrganization(organizationId: string, userId?: string) {
  await prisma.organization.delete({ where: { id: organizationId } }).catch(() => undefined);
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
}

export const sampleItems = [
  {
    kind: 'MATERIAU' as const,
    label: 'Siphon évier laiton',
    unit: 'u',
    quantity: 1,
    unitPriceCents: 3200,
    vatRate: 10,
    discountRate: 0,
  },
  {
    kind: 'MAIN_OEUVRE' as const,
    label: 'Main-d’œuvre plombier',
    unit: 'h',
    quantity: 1.5,
    unitPriceCents: 5500,
    vatRate: 10,
    discountRate: 0,
  },
];
