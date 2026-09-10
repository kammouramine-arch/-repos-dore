import 'server-only';
import { prisma } from '@/lib/prisma';
import { centsToEuros } from '@/lib/money';
import type { BusinessProfileValue } from '@/components/app/business-form';

/** Charge le profil d'entreprise au format attendu par le formulaire. */
export async function loadBusinessProfileValue(organizationId: string): Promise<BusinessProfileValue> {
  const profile = await prisma.businessProfile.findUnique({
    where: { organizationId },
    include: { logo: true },
  });

  return {
    legalName: profile?.legalName ?? '',
    ownerName: profile?.ownerName ?? '',
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
    website: profile?.website ?? '',
    addressLine1: profile?.addressLine1 ?? '',
    postalCode: profile?.postalCode ?? '',
    city: profile?.city ?? '',
    siret: profile?.siret ?? '',
    vatNumber: profile?.vatNumber ?? '',
    insurance: profile?.insurance ?? '',
    trade: profile?.trade ?? 'AUTRE',
    vatStatus: profile?.vatStatus ?? 'ASSUJETTI',
    defaultVatRate: profile ? Number(profile.defaultVatRate) : 20,
    defaultHourlyEuros: centsToEuros(profile?.defaultHourlyCents ?? 4500),
    paymentTerms: profile?.paymentTerms ?? '',
    quoteValidityDays: profile?.quoteValidityDays ?? 30,
    quoteTerms: profile?.quoteTerms ?? '',
    quoteFooter: profile?.quoteFooter ?? '',
    brandColor: profile?.brandColor ?? '#2547E0',
    logoUrl: profile?.logo ? `/api/files/${profile.logo.id}` : null,
  };
}
