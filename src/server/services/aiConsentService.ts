import 'server-only';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { aiProviderKind } from '@/lib/env';
import {
  AI_CONSENT_VERSION,
  NO_AI_CONSENT,
  aiConsentGranted,
  aiConsentRequired,
  type AiConsentDTO,
  type AiConsentStatus,
  type AiProviderKind,
} from '@devisia/shared';

/**
 * Consentement à l'envoi de données au fournisseur d'IA tiers.
 *
 * La décision est enregistrée par personne et par entreprise, avec la version
 * du texte et le fournisseur nommé. Le serveur est la dernière ligne : aucune
 * route ne contacte le fournisseur sans une autorisation valide, quel que soit
 * le client (iOS, web) et même si l'interface a été contournée.
 */

function toDTO(record: { status: AiConsentStatus; version: number; provider: string; decidedAt: Date } | null): AiConsentDTO {
  if (!record) return NO_AI_CONSENT;
  return {
    status: record.status,
    version: record.version,
    provider: record.provider as AiProviderKind,
    decidedAt: record.decidedAt.toISOString(),
  };
}

export async function getAiConsent(userId: string, organizationId: string): Promise<AiConsentDTO> {
  const record = await prisma.aiConsent.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { status: true, version: true, provider: true, decidedAt: true },
  });
  return toDTO(record);
}

/** Enregistre la décision prise sur le texte courant, pour le fournisseur courant. */
export async function recordAiConsent(
  userId: string,
  organizationId: string,
  status: AiConsentStatus,
  version: number = AI_CONSENT_VERSION,
): Promise<AiConsentDTO> {
  if (version !== AI_CONSENT_VERSION) {
    throw new AppError('VALIDATION', 'Le texte de consentement a changé. Relisez-le avant de décider.');
  }
  const provider = aiProviderKind();
  const decidedAt = new Date();
  const record = await prisma.aiConsent.upsert({
    where: { userId_organizationId: { userId, organizationId } },
    create: { userId, organizationId, status, version, provider, decidedAt },
    update: { status, version, provider, decidedAt },
    select: { status: true, version: true, provider: true, decidedAt: true },
  });
  return toDTO(record);
}

/** Vrai quand le fournisseur actif est un tiers : une autorisation est alors nécessaire. */
export function aiConsentNeeded(): boolean {
  return aiConsentRequired(aiProviderKind());
}

/** Vrai si une requête au fournisseur tiers est autorisée pour cette personne. */
export async function hasAiConsent(userId: string, organizationId: string): Promise<boolean> {
  const provider = aiProviderKind();
  if (!aiConsentRequired(provider)) return true;
  return aiConsentGranted(await getAiConsent(userId, organizationId), provider);
}

/** Refuse la requête avant tout contact avec le fournisseur si l'autorisation manque. */
export async function assertAiConsent(userId: string, organizationId: string): Promise<void> {
  if (!(await hasAiConsent(userId, organizationId))) {
    throw new AppError('AI_CONSENT_REQUIRED');
  }
}
