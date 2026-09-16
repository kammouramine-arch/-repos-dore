import 'server-only';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { featureBlock } from '@devisia/shared';
import type { BrandingDTO, BrandingInput, DocumentTemplateId } from '@devisia/shared';
import { recordAudit } from './auditService';

/**
 * Marque documentaire de l'entreprise.
 *
 * Ce qui distingue le devis d'un plombier de celui du plombier d'à côté :
 * un logo, une couleur, un modèle de mise en page, des coordonnées de
 * règlement et une signature. Trois modèles seulement, tenus — un catalogue
 * de vingt mises en page médiocres ne rendrait service à personne.
 *
 * Le modèle Minimal reste ouvert à toutes les formules : un artisan qui paie
 * l'Essentiel doit pouvoir envoyer un document propre. Moderne et Exécutif
 * sont réservés, et la restriction est appliquée ici, pas seulement masquée
 * dans l'écran.
 */

/** Modèle ouvert sans condition : personne ne reste sans document présentable. */
const FREE_TEMPLATE: DocumentTemplateId = 'MINIMAL';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function toDTO(
  profile: {
    legalName: string;
    brandColor: string;
    documentTemplate: string;
    documentFooter: string | null;
    paymentDetails: string | null;
    logoFileId: string | null;
    signatureFileId: string | null;
  },
  advancedAvailable: boolean,
  planReason: string | null,
): BrandingDTO {
  return {
    legalName: profile.legalName,
    brandColor: profile.brandColor,
    documentTemplate: profile.documentTemplate as DocumentTemplateId,
    documentFooter: profile.documentFooter,
    paymentDetails: profile.paymentDetails,
    logoFileId: profile.logoFileId,
    logoUrl: profile.logoFileId ? `/api/public/logo/${profile.logoFileId}` : null,
    signatureFileId: profile.signatureFileId,
    signatureUrl: profile.signatureFileId ? `/api/files/${profile.signatureFileId}` : null,
    advancedTemplatesAvailable: advancedAvailable,
    planReason,
  };
}

export async function getBranding(organizationId: string): Promise<BrandingDTO> {
  const [profile, subscription] = await Promise.all([
    prisma.businessProfile.findUnique({
      where: { organizationId },
      select: {
        legalName: true,
        brandColor: true,
        documentTemplate: true,
        documentFooter: true,
        paymentDetails: true,
        logoFileId: true,
        signatureFileId: true,
      },
    }),
    prisma.subscription.findUnique({ where: { organizationId }, select: { plan: true } }),
  ]);
  if (!profile) throw new AppError('NOT_FOUND', 'Profil d’entreprise introuvable.');

  const verdict = featureBlock(subscription?.plan ?? 'ESSENTIEL', 'advancedBranding');
  return toDTO(profile, !verdict.blocked, verdict.reason);
}

/**
 * Met à jour la marque.
 *
 * Un fichier référencé doit appartenir à l'entreprise : sans cette
 * vérification, un identifiant deviné afficherait le logo d'une autre société
 * sur les devis.
 */
export async function updateBranding(
  organizationId: string,
  userId: string,
  input: BrandingInput,
): Promise<BrandingDTO> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { plan: true },
  });
  const verdict = featureBlock(subscription?.plan ?? 'ESSENTIEL', 'advancedBranding');

  if (input.documentTemplate && input.documentTemplate !== FREE_TEMPLATE && verdict.blocked) {
    throw new AppError('PLAN_LIMIT', verdict.reason ?? 'Ce modèle n’est pas inclus dans votre formule.');
  }
  if (input.brandColor != null && !HEX_COLOR.test(input.brandColor)) {
    throw new AppError('VALIDATION', 'La couleur doit être au format hexadécimal, par exemple #0F62FE.');
  }

  for (const fileId of [input.logoFileId, input.signatureFileId]) {
    if (!fileId) continue;
    const file = await prisma.file.findFirst({
      where: { id: fileId, organizationId, deletedAt: null },
      select: { id: true, mimeType: true },
    });
    if (!file) throw new AppError('NOT_FOUND', 'Image introuvable.');
    if (!file.mimeType.startsWith('image/')) {
      throw new AppError('VALIDATION', 'Le logo et la signature doivent être des images.');
    }
  }

  const profile = await prisma.businessProfile.update({
    where: { organizationId },
    data: {
      ...(input.brandColor != null ? { brandColor: input.brandColor } : {}),
      ...(input.documentTemplate != null ? { documentTemplate: input.documentTemplate } : {}),
      ...(input.documentFooter !== undefined ? { documentFooter: input.documentFooter?.trim() || null } : {}),
      ...(input.paymentDetails !== undefined ? { paymentDetails: input.paymentDetails?.trim() || null } : {}),
      ...(input.logoFileId !== undefined ? { logoFileId: input.logoFileId } : {}),
      ...(input.signatureFileId !== undefined ? { signatureFileId: input.signatureFileId } : {}),
    },
    select: {
      legalName: true,
      brandColor: true,
      documentTemplate: true,
      documentFooter: true,
      paymentDetails: true,
      logoFileId: true,
      signatureFileId: true,
    },
  });

  if (input.logoFileId) {
    await prisma.file.update({ where: { id: input.logoFileId }, data: { kind: 'LOGO' } });
  }
  if (input.signatureFileId) {
    await prisma.file.update({ where: { id: input.signatureFileId }, data: { kind: 'SIGNATURE' } });
  }

  await recordAudit({
    organizationId,
    userId,
    action: 'branding.updated',
    entityType: 'organization',
    entityId: organizationId,
    metadata: { template: profile.documentTemplate },
  });
  return toDTO(profile, !verdict.blocked, verdict.reason);
}

/**
 * Modèle réellement applicable à un document.
 *
 * Si la formule a été rétrogradée après coup, le profil peut encore porter
 * « Exécutif ». Le rendu retombe alors sur Minimal plutôt que d'échouer ou de
 * livrer discrètement une fonctionnalité non payée.
 */
export function effectiveTemplate(
  stored: DocumentTemplateId,
  advancedAvailable: boolean,
): DocumentTemplateId {
  return advancedAvailable ? stored : FREE_TEMPLATE;
}
