import { prisma } from '@/lib/prisma';
import { requireAuth, requirePermission } from '@/lib/auth/session';
import { fail, ok, parseBody } from '@/server/api';
import { AppError } from '@/lib/errors';
import { businessProfileSchema } from '@/server/validation';
import { recordAudit } from '@/server/services/auditService';

/**
 * Profil d'entreprise.
 *
 * Le web éditait ces informations par action serveur, inaccessible depuis
 * l'application mobile — d'où les renvois « à gérer sur le web » qui sortaient
 * l'artisan de l'application. Cette route expose exactement les mêmes champs et
 * la même validation, pour que le mobile soit un citoyen de première classe.
 */
const SELECTION = {
  legalName: true,
  ownerName: true,
  email: true,
  phone: true,
  website: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  postalCode: true,
  country: true,
  siret: true,
  vatNumber: true,
  insurance: true,
  trade: true,
  vatStatus: true,
  defaultVatRate: true,
  defaultHourlyCents: true,
  quoteValidityDays: true,
  paymentTerms: true,
  quoteTerms: true,
  quoteFooter: true,
  brandColor: true,
  logoFileId: true,
} as const;

export async function GET() {
  try {
    const auth = await requireAuth();
    const profile = await prisma.businessProfile.findUnique({
      where: { organizationId: auth.organization.organizationId },
      select: SELECTION,
    });
    if (!profile) throw new AppError('NOT_FOUND', 'Profil d’entreprise introuvable.');
    return ok(profile);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requirePermission('settings:write');
    const organizationId = auth.organization.organizationId;
    const body = await parseBody(request, businessProfileSchema);

    const profile = await prisma.businessProfile.update({
      where: { organizationId },
      data: body,
      select: SELECTION,
    });

    // Le nom commercial sert d'identité à l'organisation dans toute
    // l'application : les deux ne doivent jamais diverger.
    await prisma.organization.update({
      where: { id: organizationId },
      data: { name: body.legalName },
    });

    await recordAudit({ action: 'settings.updated', organizationId, userId: auth.user.id });
    return ok(profile);
  } catch (error) {
    return fail(error);
  }
}
