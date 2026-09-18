import 'server-only';
import { safeErrorCategory } from '@/lib/safe-error';
import { prisma } from '@/lib/prisma';
import { notFound } from '@/lib/errors';
import { getStorageProvider } from '@/lib/storage';
import { renderQuotePdf, type PdfBusinessSignature, type QuotePdfInput } from '@/lib/pdf/quote-pdf';
import { computeQuoteTotals } from '@/lib/money';
import { fullName } from '@/lib/utils';
import { planHasFeature, type DocumentTemplateId } from '@devisia/shared';
import { effectiveTemplate } from './brandingService';

/**
 * Signature de l'entreprise à porter sur un document.
 *
 * L'instantané pris à l'envoi prime toujours. Un document déjà parti garde la
 * main qui l'a signé ce jour-là, même si l'artisan en a tracé une autre
 * depuis. Sans instantané — un brouillon, un aperçu — c'est la signature
 * courante du profil qui sert : il n'y a encore rien de figé.
 */
function issuerSignature(
  document: {
    issuerSignaturePath: string | null;
    issuerSignatureName: string | null;
    issuerSignatureAt: Date | null;
  },
  profile: { signatureStrokePath: string | null; signatureName: string | null; signatureDrawnAt: Date | null } | null | undefined,
): PdfBusinessSignature | null {
  if (document.issuerSignaturePath) {
    return {
      strokePath: document.issuerSignaturePath,
      name: document.issuerSignatureName,
      drawnAt: document.issuerSignatureAt,
    };
  }
  if (!profile?.signatureStrokePath) return null;
  return {
    strokePath: profile.signatureStrokePath,
    name: profile.signatureName,
    drawnAt: profile.signatureDrawnAt,
  };
}

/** Construit et rend le PDF d'un devis à partir des données enregistrées. */
export async function buildQuotePdf(quoteId: string): Promise<{ bytes: Uint8Array; fileName: string }> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      items: { orderBy: { position: 'asc' } },
      customer: true,
      // Une seule signature valide au plus : c'est elle qui est imprimée.
      signatures: { where: { invalidatedAt: null }, orderBy: { signedAt: 'desc' }, take: 1 },
      organization: {
        include: {
          businessProfile: { include: { logo: true } },
          subscription: { select: { plan: true } },
        },
      },
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
console.error('[pdf] logo illisible', safeErrorCategory(error));
    }
  }

  // Le modèle enregistré ne s'applique que si la formule le couvre encore :
  // après une rétrogradation, le rendu retombe sur Minimal plutôt que de
  // livrer en silence une option non payée.
  const advancedBranding = planHasFeature(quote.organization.subscription?.plan ?? 'ESSENTIEL', 'advancedBranding');
  const signature = quote.signatures[0];

  const input: QuotePdfInput = {
    document: 'quote',
    template: effectiveTemplate((profile?.documentTemplate ?? 'MODERNE') as DocumentTemplateId, advancedBranding),
    businessSignature: issuerSignature(quote, profile),
    signature: signature
      ? { signerName: signature.signerName, signedAt: signature.signedAt, strokePath: signature.strokePath }
      : null,
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
      paymentDetails: profile?.paymentDetails,
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
    footer: profile?.documentFooter ?? profile?.quoteFooter ?? null,
    language: quote.organization.locale,
    country: quote.organization.country,
    currency: quote.organization.currency,
  };

  const bytes = await renderQuotePdf(input);
  const documentPrefix = quote.organization.locale === 'en'
    ? (quote.organization.country === 'US' ? 'Estimate' : 'Quote')
    : 'Devis';
  return { bytes, fileName: `${documentPrefix}-${quote.number}.pdf` };
}

/**
 * Construit le PDF d'une facture.
 *
 * Même moteur de rendu que le devis : un artisan qui envoie les deux ne doit
 * pas avoir l'air d'utiliser deux logiciels. Seuls changent l'intitulé, le
 * bloc de règlement et les lignes, lues sur la facture et non sur le devis
 * d'origine — une facture émise ne bouge plus.
 */
export async function buildInvoicePdf(invoiceId: string): Promise<{ bytes: Uint8Array; fileName: string }> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      items: { orderBy: { position: 'asc' } },
      customer: true,
      organization: {
        include: {
          businessProfile: { include: { logo: true } },
          subscription: { select: { plan: true } },
        },
      },
    },
  });
  if (!invoice || invoice.deletedAt) throw notFound('Facture introuvable.');

  const profile = invoice.organization.businessProfile;
  const vatExempt = profile?.vatStatus === 'FRANCHISE_EN_BASE';

  const totals = computeQuoteTotals({
    lines: invoice.items.map((item) => ({
      quantity: Number(item.quantity),
      unitPriceCents: item.unitPriceCents,
      discountRate: Number(item.discountRate),
      vatRate: vatExempt ? 0 : Number(item.vatRate),
    })),
    globalDiscountRate: Number(invoice.discountRate),
    vatExempt,
  });

  let logo: { bytes: Uint8Array; mimeType: string } | null = null;
  if (profile?.logo) {
    try {
      const buffer = await getStorageProvider().get(profile.logo.storageKey);
      logo = { bytes: new Uint8Array(buffer), mimeType: profile.logo.mimeType };
    } catch (error) {
      console.error('[pdf] logo illisible', safeErrorCategory(error));
    }
  }

  const advancedBranding = planHasFeature(
    invoice.organization.subscription?.plan ?? 'ESSENTIEL',
    'advancedBranding',
  );

  const input: QuotePdfInput = {
    document: 'invoice',
    template: effectiveTemplate((profile?.documentTemplate ?? 'MODERNE') as DocumentTemplateId, advancedBranding),
    // La facture porte la même signature d'entreprise que le devis : c'est
    // le même émetteur qui s'engage.
    businessSignature: issuerSignature(invoice, profile),
    number: invoice.number,
    title: invoice.title,
    createdAt: invoice.issuedAt ?? invoice.createdAt,
    dueAt: invoice.dueAt,
    paidCents: invoice.paidCents,
    company: {
      name: profile?.legalName ?? invoice.organization.name,
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
      paymentDetails: profile?.paymentDetails,
      logo,
      vatExempt,
    },
    customer: {
      name: fullName(invoice.customer.firstName, invoice.customer.lastName, invoice.customer.companyName),
      addressLine1: invoice.customer.addressLine1,
      postalCode: invoice.customer.postalCode,
      city: invoice.customer.city,
      email: invoice.customer.email,
      phone: invoice.customer.phone,
    },
    lines: invoice.items.map((item) => ({
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
    discountRate: Number(invoice.discountRate),
    discountCents: totals.discountCents,
    netSubtotalCents: totals.netSubtotalCents,
    vatBreakdown: totals.vatBreakdown,
    vatCents: totals.vatCents,
    totalCents: totals.totalCents,
    depositCents: invoice.depositCents,
    notes: invoice.notes,
    terms: invoice.terms ?? profile?.quoteTerms ?? null,
    paymentTerms: invoice.paymentTerms ?? profile?.paymentTerms ?? null,
    footer: profile?.documentFooter ?? profile?.quoteFooter ?? null,
    language: invoice.organization.locale,
    country: invoice.organization.country,
    currency: invoice.organization.currency,
  };

  const bytes = await renderQuotePdf(input);
  const prefix = invoice.organization.locale === 'en' ? 'Invoice' : 'Facture';
  return { bytes, fileName: `${prefix}-${invoice.number}.pdf` };
}
