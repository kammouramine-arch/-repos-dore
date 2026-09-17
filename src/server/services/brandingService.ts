import 'server-only';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { featureBlock } from '@devisia/shared';
import { assertStroke } from './signatureService';
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
    signatureStrokePath: string | null;
    signatureName: string | null;
    signatureDrawnAt: Date | null;
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
    signature: {
      strokePath: profile.signatureStrokePath,
      name: profile.signatureName,
      drawnAt: profile.signatureDrawnAt?.toISOString() ?? null,
    },
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
        signatureStrokePath: true,
        signatureName: true,
        signatureDrawnAt: true,
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
      // Le nom affiché est la raison sociale : une seule valeur, deux écrans
      // où la corriger.
      ...(input.legalName != null ? { legalName: input.legalName.trim() } : {}),
      ...(input.brandColor != null ? { brandColor: input.brandColor } : {}),
      ...(input.documentTemplate != null ? { documentTemplate: input.documentTemplate } : {}),
      ...(input.documentFooter !== undefined ? { documentFooter: input.documentFooter?.trim() || null } : {}),
      ...(input.paymentDetails !== undefined ? { paymentDetails: input.paymentDetails?.trim() || null } : {}),
      ...(input.logoFileId !== undefined ? { logoFileId: input.logoFileId } : {}),
      ...(input.signatureFileId !== undefined ? { signatureFileId: input.signatureFileId } : {}),
      /*
       * La signature manuscrite de l'entreprise.
       *
       * Le tracé passe par la même validation que celle du client : il finit
       * dans un attribut `d` du PDF, et n'accepter que la grammaire des
       * chemins est ce qui empêche un contenu arbitraire d'y arriver. `null`
       * efface — l'artisan a le droit de retirer sa signature.
       */
      ...(input.signatureStrokePath !== undefined
        ? input.signatureStrokePath === null
          ? { signatureStrokePath: null, signatureName: null, signatureDrawnAt: null }
          : {
              signatureStrokePath: assertStroke(input.signatureStrokePath),
              signatureName: input.signatureName?.trim() || null,
              signatureDrawnAt: new Date(),
            }
        : {}),
    },
    select: {
      legalName: true,
      brandColor: true,
      documentTemplate: true,
      documentFooter: true,
      paymentDetails: true,
      logoFileId: true,
      signatureFileId: true,
      signatureStrokePath: true,
      signatureName: true,
      signatureDrawnAt: true,
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

/**
 * Signature de l'entreprise, recopiée sur un document au moment où il part.
 *
 * Le rendu PDF lisait la signature vivante du profil. Un artisan qui
 * remplaçait la sienne changeait donc, sans le savoir, l'apparence de devis
 * déjà reçus par ses clients — et un devis signé dont le tracé change après
 * coup n'est plus un document, c'est une page web.
 *
 * L'instantané est repris à chaque envoi explicite : c'est ce geste-là qui
 * émet le document. Entre deux envois, rien ne bouge. Un brouillon n'a pas
 * d'instantané et suit la signature courante — il n'est parti nulle part.
 */
export async function issuerSignatureSnapshot(
  organizationId: string,
): Promise<{ issuerSignaturePath: string | null; issuerSignatureName: string | null; issuerSignatureAt: Date | null }> {
  const profile = await prisma.businessProfile.findUnique({
    where: { organizationId },
    select: { signatureStrokePath: true, signatureName: true, legalName: true },
  });
  if (!profile?.signatureStrokePath) {
    return { issuerSignaturePath: null, issuerSignatureName: null, issuerSignatureAt: null };
  }
  return {
    issuerSignaturePath: profile.signatureStrokePath,
    issuerSignatureName: profile.signatureName || profile.legalName,
    issuerSignatureAt: new Date(),
  };
}
