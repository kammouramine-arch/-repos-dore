import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';
import { TRIAL_DAYS } from '@/lib/billing/plans';

/** Automatisations de relance proposées par défaut à chaque nouvelle entreprise. */
export const DEFAULT_AUTOMATIONS = [
  {
    name: 'Devis non consulté après 24 h',
    trigger: 'DEVIS_NON_CONSULTE' as const,
    delayHours: 24,
    isActive: true,
    requireApproval: true,
  },
  {
    name: 'Devis consulté sans réponse après 3 jours',
    trigger: 'DEVIS_CONSULTE_SANS_REPONSE' as const,
    delayHours: 72,
    isActive: true,
    requireApproval: true,
  },
  {
    name: 'Dernière relance après 7 jours',
    trigger: 'DEVIS_SANS_REPONSE' as const,
    delayHours: 168,
    isActive: false,
    requireApproval: true,
  },
];

const INTEGRATION_CATALOG = [
  { provider: 'STRIPE' as const, status: 'DISPONIBLE' as const },
  { provider: 'RESEND' as const, status: 'DISPONIBLE' as const },
  { provider: 'TWILIO' as const, status: 'BIENTOT' as const },
  { provider: 'WHATSAPP' as const, status: 'BIENTOT' as const },
  { provider: 'GOOGLE_CALENDAR' as const, status: 'BIENTOT' as const },
  { provider: 'GOOGLE_BUSINESS' as const, status: 'BIENTOT' as const },
  { provider: 'QUICKBOOKS' as const, status: 'BIENTOT' as const },
  { provider: 'XERO' as const, status: 'BIENTOT' as const },
  { provider: 'SAGE' as const, status: 'BIENTOT' as const },
  { provider: 'ZAPIER' as const, status: 'BIENTOT' as const },
  { provider: 'MAKE' as const, status: 'BIENTOT' as const },
];

/** Slug unique et lisible pour une organisation. */
export async function uniqueSlug(
  name: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string> {
  const base = slugify(name) || 'entreprise';
  let candidate = base;
  let suffix = 1;
  while (await client.organization.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

export interface CreateOrganizationInput {
  name: string;
  ownerUserId: string;
  ownerName?: string | null;
  email?: string | null;
  phone?: string | null;
}

/**
 * Crée une organisation complète : membre propriétaire, profil, paramètres,
 * abonnement en période d'essai, automatisations et catalogue d'intégrations.
 */
export async function createOrganization(input: CreateOrganizationInput) {
  return prisma.$transaction(async (tx) => {
    const slug = await uniqueSlug(input.name, tx);
    const organization = await tx.organization.create({
      data: {
        name: input.name,
        slug,
        members: { create: { userId: input.ownerUserId, role: 'OWNER' } },
        businessProfile: {
          create: {
            legalName: input.name,
            ownerName: input.ownerName ?? null,
            email: input.email ?? null,
            phone: input.phone ?? null,
          },
        },
        settings: { create: {} },
        subscription: {
          create: {
            plan: 'ESSENTIEL',
            status: 'trialing',
            trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
          },
        },
      },
    });

    await tx.automation.createMany({
      data: DEFAULT_AUTOMATIONS.map((automation) => ({
        organizationId: organization.id,
        name: automation.name,
        trigger: automation.trigger,
        delayHours: automation.delayHours,
        isActive: automation.isActive,
        requireApproval: automation.requireApproval,
        channel: 'EMAIL' as const,
      })),
    });

    await tx.integration.createMany({
      data: INTEGRATION_CATALOG.map((integration) => ({
        organizationId: organization.id,
        provider: integration.provider,
        status: integration.status,
      })),
    });

    return organization;
  });
}

/** Contexte complet d'une organisation (profil, paramètres, abonnement). */
export async function getOrganizationContext(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      businessProfile: { include: { logo: true } },
      settings: true,
      subscription: true,
    },
  });
  return organization;
}

export async function completeOnboarding(organizationId: string) {
  await prisma.businessProfile.update({
    where: { organizationId },
    data: { onboardingCompleted: true },
  });
}
