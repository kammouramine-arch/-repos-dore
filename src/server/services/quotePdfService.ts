import 'server-only';
import { prisma } from '@/lib/prisma';
import { notFound } from '@/lib/errors';
import { getStorageProvider } from '@/lib/storage';
import { renderQuotePdf, type QuotePdfInput } from '@/lib/pdf/quote-pdf';
import { computeQuoteTotals } from '@/lib/money';
import { fullName } from '@/lib/utils';

/** Construit et rend le PDF d'un devis à partir des données enregistrées. */
export async function buildQuotePdf(quoteId: string): Promise<{ bytes: Uint8Array; fileName: string }> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      items: { orderBy: { position: 'asc' } },
      customer: true,
      organization: { include: { businessProfile: { include: { logo: true } } } },
    },
  });
  if (!quote || quote.deletedAt) throw notFound('Devis introuvable.');

  const profile = quote.organization.businessProfile;
  const vatExempt = profile?.vatStatus === 'FRANCHISE_EN_BASE';

  // Ventilation de TVA recalculée : le PDF ne fait jamais confiance à un total stocké seul.
  const totals = computeQuoteTotals({
    lines: quote.items.map((item) => ({
      quantity: Number(item.quantity),
      unitPriceCents: item.unitPriceCents,
      discountRate: Number(item.discountRate),
      vatRate: vatExempt ? 0 : Number(item.vatRate),
    })),
    globalDiscountRate: Number(quote.discountRate),
    depositRate: Number(quote.depositRate),
    vatExempt,
  });

  let logo: { bytes: Uint8Array; mimeType: string } | null = null;
  if (profile?.logo) {
    try {
      const buffer = await getStorageProvider().get(profile.logo.storageKey);
      logo = { bytes: new Uint8Array(buffer), mimeType: profile.logo.mimeType };
    } catch (error) {
      console.error('[pdf] logo illisible', error);
    }
  }

  const input: QuotePdfInput = {
    number: quote.number,
    title: quote.title,
    summary: quote.summary,
    introduction: quote.introduction,
    createdAt: quote.createdAt,
    validUntil: quote.validUntil,
    company: {
      name: profile?.legalName ?? quote.organization.name,
      ownerName: profile?.ownerName,
      addressLine1: profile?.addressLine1,
      postalCode: profile?.postalCode,
      city: profile?.city,
      phone: profile?.phone,
      email: profile?.email,
      website: profile?.website,
      siret: profile?.siret,
      vatNumber: profile?.vatNumber,
      insurance: profile?.insurance,
      brandColor: profile?.brandColor,
      logo,
      vatExempt,
    },
    customer: {
      name: fullName(quote.customer.firstName, quote.customer.lastName, quote.customer.companyName),
      addressLine1: quote.customer.addressLine1,
      postalCode: quote.customer.postalCode,
      city: quote.customer.city,
      email: quote.customer.email,
      phone: quote.customer.phone,
    },
    lines: quote.items.map((item) => ({
      label: item.label,
      description: item.description,
      unit: item.unit,
      quantity: Number(item.quantity),
      unitPriceCents: item.unitPriceCents,
      discountRate: Number(item.discountRate),
      vatRate: Number(item.vatRate),
      lineTotalCents: item.lineTotalCents,
    })),
    workDescription: [],
    subtotalCents: totals.subtotalCents,
    discountRate: Number(quote.discountRate),
    discountCents: totals.discountCents,
    netSubtotalCents: totals.netSubtotalCents,
    vatBreakdown: totals.vatBreakdown,
    vatCents: totals.vatCents,
    totalCents: totals.totalCents,
    depositCents: totals.depositCents,
    estimatedDurationMin: quote.estimatedDurationMin,
    notes: quote.notes,
    terms: quote.terms ?? profile?.quoteTerms ?? null,
    paymentTerms: quote.paymentTerms ?? profile?.paymentTerms ?? null,
    footer: profile?.quoteFooter ?? null,
  };

  const bytes = await renderQuotePdf(input);
  return { bytes, fileName: `Devis-${quote.number}.pdf` };
}
