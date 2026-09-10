import 'server-only';
import type { Prisma, Quote, QuoteItem, Customer, Lead, PriceBookItem } from '@prisma/client';

/**
 * Conversion des entités Prisma en objets simples sérialisables.
 *
 * Deux raisons : les Decimal ne traversent pas la frontière serveur/client de
 * React, et aucune colonne interne ne doit fuir vers le navigateur par accident.
 */

function dec(value: Prisma.Decimal | null | undefined): number {
  return value == null ? 0 : Number(value);
}

export interface QuoteItemDTO {
  id: string;
  kind: QuoteItem['kind'];
  label: string;
  description: string | null;
  unit: string;
  quantity: number;
  unitPriceCents: number;
  costPriceCents: number | null;
  discountRate: number;
  vatRate: number;
  lineTotalCents: number;
  vatCents: number;
  position: number;
  priceBookItemId: string | null;
}

export function toQuoteItemDTO(item: QuoteItem): QuoteItemDTO {
  return {
    id: item.id,
    kind: item.kind,
    label: item.label,
    description: item.description,
    unit: item.unit,
    quantity: dec(item.quantity),
    unitPriceCents: item.unitPriceCents,
    costPriceCents: item.costPriceCents,
    discountRate: dec(item.discountRate),
    vatRate: dec(item.vatRate),
    lineTotalCents: item.lineTotalCents,
    vatCents: item.vatCents,
    position: item.position,
    priceBookItemId: item.priceBookItemId,
  };
}

export interface QuoteDTO {
  id: string;
  number: string;
  title: string;
  summary: string | null;
  introduction: string | null;
  status: Quote['status'];
  customerId: string;
  leadId: string | null;
  jobId: string | null;
  subtotalCents: number;
  discountRate: number;
  discountCents: number;
  netSubtotalCents: number;
  vatCents: number;
  totalCents: number;
  depositRate: number;
  depositCents: number;
  estimatedDurationMin: number | null;
  notes: string | null;
  terms: string | null;
  paymentTerms: string | null;
  validUntil: string | null;
  publicToken: string;
  sentAt: string | null;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
  acceptedAt: string | null;
  refusedAt: string | null;
  clientMessage: string | null;
  aiGenerated: boolean;
  aiConfidence: number | null;
  aiWarnings: string[];
  aiQuestions: string[];
  createdAt: string;
  updatedAt: string;
  items: QuoteItemDTO[];
}

export function toQuoteDTO(quote: Quote & { items?: QuoteItem[] }): QuoteDTO {
  return {
    id: quote.id,
    number: quote.number,
    title: quote.title,
    summary: quote.summary,
    introduction: quote.introduction,
    status: quote.status,
    customerId: quote.customerId,
    leadId: quote.leadId,
    jobId: quote.jobId,
    subtotalCents: quote.subtotalCents,
    discountRate: dec(quote.discountRate),
    discountCents: quote.discountCents,
    netSubtotalCents: quote.netSubtotalCents,
    vatCents: quote.vatCents,
    totalCents: quote.totalCents,
    depositRate: dec(quote.depositRate),
    depositCents: quote.depositCents,
    estimatedDurationMin: quote.estimatedDurationMin,
    notes: quote.notes,
    terms: quote.terms,
    paymentTerms: quote.paymentTerms,
    validUntil: quote.validUntil?.toISOString() ?? null,
    publicToken: quote.publicToken,
    sentAt: quote.sentAt?.toISOString() ?? null,
    firstViewedAt: quote.firstViewedAt?.toISOString() ?? null,
    lastViewedAt: quote.lastViewedAt?.toISOString() ?? null,
    viewCount: quote.viewCount,
    acceptedAt: quote.acceptedAt?.toISOString() ?? null,
    refusedAt: quote.refusedAt?.toISOString() ?? null,
    clientMessage: quote.clientMessage,
    aiGenerated: quote.aiGenerated,
    aiConfidence: quote.aiConfidence,
    aiWarnings: quote.aiWarnings,
    aiQuestions: quote.aiQuestions,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
    items: (quote.items ?? []).map(toQuoteItemDTO),
  };
}

export interface CustomerDTO {
  id: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  /** Toujours renseigné : le contrat partagé le promet à l'application mobile. */
  displayName: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  notes: string | null;
  tags: string[];
  source: Customer['source'];
  lastContactAt: string | null;
  createdAt: string;
}

/**
 * Nom affichable d'un client.
 *
 * Le contrat annonçait `displayName`, mais la conversion ne le produisait pas :
 * les listes mobiles affichaient une fiche sans nom, avec ses seules
 * coordonnées. Un client enregistré au seul nom de famille — le cas courant
 * quand la fiche naît pendant un devis — devenait ainsi invisible.
 */
export function customerDisplayName(customer: {
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
}): string {
  const person = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return customer.companyName?.trim() || person || 'Client sans nom';
}

export function toCustomerDTO(customer: Customer): CustomerDTO {
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    companyName: customer.companyName,
    displayName: customerDisplayName(customer),
    email: customer.email,
    phone: customer.phone,
    addressLine1: customer.addressLine1,
    addressLine2: customer.addressLine2,
    city: customer.city,
    postalCode: customer.postalCode,
    country: customer.country,
    notes: customer.notes,
    tags: customer.tags,
    source: customer.source,
    lastContactAt: customer.lastContactAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
  };
}

export interface LeadDTO {
  id: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  postalCode: string | null;
  addressLine1: string | null;
  title: string;
  description: string | null;
  jobType: string | null;
  status: Lead['status'];
  source: Lead['source'];
  sourceDetail: string | null;
  estimatedCents: number | null;
  customerId: string | null;
  lastActivityAt: string;
  nextFollowUpAt: string | null;
  createdAt: string;
}

export function toLeadDTO(lead: Lead): LeadDTO {
  return {
    id: lead.id,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    city: lead.city,
    postalCode: lead.postalCode,
    addressLine1: lead.addressLine1,
    title: lead.title,
    description: lead.description,
    jobType: lead.jobType,
    status: lead.status,
    source: lead.source,
    sourceDetail: lead.sourceDetail,
    estimatedCents: lead.estimatedCents,
    customerId: lead.customerId,
    lastActivityAt: lead.lastActivityAt.toISOString(),
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
  };
}

export interface PriceBookItemDTO {
  id: string;
  reference: string | null;
  sku: string | null;
  name: string;
  description: string | null;
  category: PriceBookItem['category'];
  unit: string;
  costPriceCents: number;
  salePriceCents: number;
  vatRate: number;
  supplier: string | null;
  keywords: string[];
  isActive: boolean;
  marginCents: number;
  marginRate: number | null;
}

export function toPriceBookItemDTO(item: PriceBookItem): PriceBookItemDTO {
  const marginCents = item.salePriceCents - item.costPriceCents;
  return {
    id: item.id,
    reference: item.reference,
    sku: item.sku,
    name: item.name,
    description: item.description,
    category: item.category,
    unit: item.unit,
    costPriceCents: item.costPriceCents,
    salePriceCents: item.salePriceCents,
    vatRate: dec(item.vatRate),
    supplier: item.supplier,
    keywords: item.keywords,
    isActive: item.isActive,
    marginCents,
    marginRate:
      item.salePriceCents === 0 ? null : Math.round((marginCents / item.salePriceCents) * 10000) / 100,
  };
}

export { dec };
