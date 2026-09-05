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

/** Au-delà, on cesse de sonder un à un et on tire un suffixe. */
const SONDAGES_MAX = 5;

/**
 * Slug unique et lisible pour une organisation.
 *
 * La version précédente sondait les suffixes un par un, sans borne, à
 * l'intérieur de la transaction de création. Deux artisans nommés « Plomberie
 * Martin » ne posaient pas de problème ; vingt-cinq homonymes faisaient vingt-
 * cinq allers-retours en base avant le premier `insert`, dépassaient le délai
 * de transaction, et l'inscription échouait en 500 sans rien dire. Un nom
 * d'entreprise banal est précisément ce qui devient fréquent avec le succès.
 *
 * On sonde donc quelques suffixes lisibles, puis on tire au sort : un slug
 * moins joli vaut mieux qu'une inscription refusée.
 */
export async function uniqueSlug(
  name: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string> {
  const base = slugify(name) || 'entreprise';
  const candidats = [base, ...Array.from({ length: SONDAGES_MAX }, (_, i) => `${base}-${i + 2}`)];
  const pris = new Set(
    (
      await client.organization.findMany({
        where: { slug: { in: candidats } },
        select: { slug: true },
      })
    ).map((o) => o.slug),
  );
  const libre = candidats.find((c) => !pris.has(c));
  if (libre) return libre;
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface CreateOrganizationInput {
  requireApplePurchase?: boolean;
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
  // Le slug est résolu hors transaction : la transaction ne doit contenir que
  // des écritures, pas une recherche dont la durée dépend du nombre
  // d'homonymes déjà inscrits.
  const slugPrevu = await uniqueSlug(input.name);
  return prisma.$transaction(async (tx) => {
    // Deux inscriptions simultanées peuvent viser le même slug : on ne
    // rattrape pas la course par un verrou, on lui laisse une porte de sortie.
    const slug = (await tx.organization.findUnique({
      where: { slug: slugPrevu },
      select: { id: true },
    }))
      ? `${slugPrevu}-${Math.random().toString(36).slice(2, 8)}`
      : slugPrevu;
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
            status: input.requireApplePurchase ? 'incomplete' : 'trialing',
            billingPeriod: 'MENSUEL',
            trialStartedAt: input.requireApplePurchase ? null : new Date(),
            trialEndsAt: input.requireApplePurchase ? null : new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
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
