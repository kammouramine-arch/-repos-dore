import 'server-only';
import type { Prisma, QuoteItemKind, QuoteStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computeQuoteTotals, type LineInput } from '@/lib/money';
import { generateToken } from '@/lib/auth/tokens';
import { AppError, notFound } from '@/lib/errors';
import { nextDocumentNumber } from './numberingService';
import { recordAudit } from './auditService';
import { trackEvent } from './analyticsService';
import { notify } from './notificationService';
import { dec } from '../dto';

export interface QuoteLineInput {
  id?: string;
  kind: QuoteItemKind;
  label: string;
  description?: string | null;
  unit?: string;
  quantity: number;
  unitPriceCents: number;
  costPriceCents?: number | null;
  discountRate?: number;
  vatRate: number;
  priceBookItemId?: string | null;
}

export interface QuoteWriteInput {
  customerId: string;
  leadId?: string | null;
  jobId?: string | null;
  title: string;
  summary?: string | null;
  introduction?: string | null;
  notes?: string | null;
  terms?: string | null;
  paymentTerms?: string | null;
  validUntil?: Date | null;
  discountRate?: number;
  depositRate?: number;
  estimatedDurationMin?: number | null;
  items: QuoteLineInput[];
  aiGenerated?: boolean;
  aiConfidence?: number | null;
  aiWarnings?: string[];
  aiQuestions?: string[];
}

const EDITABLE_STATUSES: QuoteStatus[] = ['BROUILLON', 'ENVOYE', 'CONSULTE', 'MODIFICATION_DEMANDEE'];

/** Charge un devis en garantissant qu'il appartient bien à l'organisation appelante. */
export async function getQuote(organizationId: string, quoteId: string) {
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId, deletedAt: null },
    include: {
      items: { orderBy: { position: 'asc' } },
      customer: true,
      lead: true,
      events: { orderBy: { createdAt: 'desc' }, take: 30 },
      followUps: { orderBy: { scheduledFor: 'asc' } },
      files: { where: { deletedAt: null } },
    },
  });
  if (!quote) throw notFound('Devis introuvable.');
  return quote;
}

/**
 * Totaux recalculés à partir des lignes — jamais repris d'une entrée client
 * ni d'une sortie d'IA.
 */
export function totalsFor(input: {
  items: QuoteLineInput[];
  discountRate?: number;
  depositRate?: number;
  vatExempt?: boolean;
}) {
  const lines: LineInput[] = input.items.map((item) => ({
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    discountRate: item.discountRate ?? 0,
    vatRate: input.vatExempt ? 0 : item.vatRate,
    costPriceCents: item.costPriceCents ?? null,
  }));
  return computeQuoteTotals({
    lines,
    globalDiscountRate: input.discountRate ?? 0,
    depositRate: input.depositRate ?? 0,
    vatExempt: input.vatExempt,
  });
}

async function isVatExempt(organizationId: string): Promise<boolean> {
  const profile = await prisma.businessProfile.findUnique({
    where: { organizationId },
    select: { vatStatus: true },
  });
  return profile?.vatStatus === 'FRANCHISE_EN_BASE';
}

export async function createQuote(
  organizationId: string,
  userId: string,
  input: QuoteWriteInput,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) throw notFound('Client introuvable.');

  const vatExempt = await isVatExempt(organizationId);
  const totals = totalsFor({ ...input, vatExempt });

  const quote = await prisma.$transaction(async (tx) => {
    const number = await nextDocumentNumber(organizationId, 'QUOTE', tx);
    return tx.quote.create({
      data: {
        organizationId,
        createdById: userId,
        customerId: input.customerId,
        leadId: input.leadId ?? null,
        jobId: input.jobId ?? null,
        number,
        title: input.title,
        summary: input.summary ?? null,
        introduction: input.introduction ?? null,
        notes: input.notes ?? null,
        terms: input.terms ?? null,
        paymentTerms: input.paymentTerms ?? null,
        validUntil: input.validUntil ?? null,
        estimatedDurationMin: input.estimatedDurationMin ?? null,
        discountRate: input.discountRate ?? 0,
        depositRate: input.depositRate ?? 0,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        netSubtotalCents: totals.netSubtotalCents,
        vatCents: totals.vatCents,
        totalCents: totals.totalCents,
        depositCents: totals.depositCents,
        publicToken: generateToken(24),
        aiGenerated: input.aiGenerated ?? false,
        aiConfidence: input.aiConfidence ?? null,
        aiWarnings: input.aiWarnings ?? [],
        aiQuestions: input.aiQuestions ?? [],
        items: {
          create: input.items.map((item, index) => ({
            kind: item.kind,
            label: item.label,
            description: item.description ?? null,
            unit: item.unit ?? 'u',
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            costPriceCents: item.costPriceCents ?? null,
            discountRate: item.discountRate ?? 0,
            vatRate: vatExempt ? 0 : item.vatRate,
            lineTotalCents: totals.lines[index]?.lineTotalCents ?? 0,
            vatCents: totals.lines[index]?.vatCents ?? 0,
            position: index,
            priceBookItemId: item.priceBookItemId ?? null,
          })),
        },
        events: { create: { type: 'CREE', actor: `user:${userId}` } },
      },
      include: { items: { orderBy: { position: 'asc' } } },
    });
  });

  await recordAudit({
    action: 'quote.created',
    organizationId,
    userId,
    entityType: 'quote',
    entityId: quote.id,
    metadata: { number: quote.number, totalCents: quote.totalCents },
  });
  await trackEvent('quote_created', {
    organizationId,
    userId,
    properties: { aiGenerated: input.aiGenerated ?? false, totalCents: quote.totalCents },
  });

  return quote;
}

export async function updateQuote(
  organizationId: string,
  userId: string,
  quoteId: string,
  input: QuoteWriteInput,
) {
  const existing = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!existing) throw notFound('Devis introuvable.');
  if (!EDITABLE_STATUSES.includes(existing.status)) {
    throw new AppError('CONFLICT', "Ce devis n'est plus modifiable.");
  }

  const vatExempt = await isVatExempt(organizationId);
  const totals = totalsFor({ ...input, vatExempt });

  const quote = await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId } });
    return tx.quote.update({
      where: { id: quoteId },
      data: {
        customerId: input.customerId,
        leadId: input.leadId ?? null,
        jobId: input.jobId ?? null,
        title: input.title,
        summary: input.summary ?? null,
        introduction: input.introduction ?? null,
        notes: input.notes ?? null,
        terms: input.terms ?? null,
        paymentTerms: input.paymentTerms ?? null,
        validUntil: input.validUntil ?? null,
        estimatedDurationMin: input.estimatedDurationMin ?? null,
        discountRate: input.discountRate ?? 0,
        depositRate: input.depositRate ?? 0,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        netSubtotalCents: totals.netSubtotalCents,
        vatCents: totals.vatCents,
        totalCents: totals.totalCents,
        depositCents: totals.depositCents,
        items: {
          create: input.items.map((item, index) => ({
            kind: item.kind,
            label: item.label,
            description: item.description ?? null,
            unit: item.unit ?? 'u',
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            costPriceCents: item.costPriceCents ?? null,
            discountRate: item.discountRate ?? 0,
            vatRate: vatExempt ? 0 : item.vatRate,
            lineTotalCents: totals.lines[index]?.lineTotalCents ?? 0,
            vatCents: totals.lines[index]?.vatCents ?? 0,
            position: index,
            priceBookItemId: item.priceBookItemId ?? null,
          })),
        },
        events: { create: { type: 'MODIFIE', actor: `user:${userId}` } },
      },
      include: { items: { orderBy: { position: 'asc' } } },
    });
  });

  await recordAudit({
    action: 'quote.updated',
    organizationId,
    userId,
    entityType: 'quote',
    entityId: quoteId,
  });
  return quote;
}

/** Suppression logique : les devis envoyés restent conservés pour l'historique financier. */
export async function deleteQuote(organizationId: string, userId: string, quoteId: string) {
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!quote) throw notFound('Devis introuvable.');
  if (quote.status === 'ACCEPTE') {
    throw new AppError('CONFLICT', 'Un devis accepté ne peut pas être supprimé.');
  }
  await prisma.quote.update({
    where: { id: quoteId },
    data: { deletedAt: new Date(), status: 'ANNULE' },
  });
  await recordAudit({
    action: 'quote.deleted',
    organizationId,
    userId,
    entityType: 'quote',
    entityId: quoteId,
  });
}

/** Marque un devis comme envoyé (l'envoi effectif est piloté par sendQuote). */
export async function markQuoteSent(organizationId: string, quoteId: string, userId: string) {
  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: 'ENVOYE',
      sentAt: new Date(),
      events: { create: { type: 'ENVOYE', actor: `user:${userId}` } },
    },
  });
  await trackEvent('quote_sent', {
    organizationId,
    userId,
    properties: { totalCents: quote.totalCents },
  });
  await recordAudit({
    action: 'quote.sent',
    organizationId,
    userId,
    entityType: 'quote',
    entityId: quoteId,
    metadata: { number: quote.number },
  });
  return quote;
}

/** Consultation par le client via le lien public. */
export async function registerQuoteView(
  publicToken: string,
  context: { ipHash?: string | null; userAgent?: string | null },
) {
  const quote = await prisma.quote.findUnique({
    where: { publicToken },
    select: { id: true, organizationId: true, status: true, number: true, customerId: true, firstViewedAt: true },
  });
  if (!quote) return null;

  const isFirstView = quote.firstViewedAt == null;
  const nextStatus: QuoteStatus = quote.status === 'ENVOYE' ? 'CONSULTE' : quote.status;

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      status: nextStatus,
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
      firstViewedAt: quote.firstViewedAt ?? new Date(),
      events: {
        create: {
          type: 'CONSULTE',
          actor: 'client',
          ipHash: context.ipHash ?? null,
          userAgent: context.userAgent?.slice(0, 255) ?? null,
        },
      },
    },
  });

  if (isFirstView) {
    const customer = await prisma.customer.findUnique({
      where: { id: quote.customerId },
      select: { firstName: true, lastName: true, companyName: true },
    });
    const name =
      customer?.companyName ??
      [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') ??
      'Le client';
    await notify({
      organizationId: quote.organizationId,
      type: 'DEVIS_CONSULTE',
      title: `${name} a consulté le devis ${quote.number}.`,
      href: `/app/devis/${quote.id}`,
    });
    await trackEvent('quote_viewed', { organizationId: quote.organizationId });
  }

  return quote.id;
}

export type ClientDecision = 'ACCEPTE' | 'REFUSE' | 'MODIFICATION_DEMANDEE';

/** Décision du client depuis la page publique du devis. */
export async function registerClientDecision(
  publicToken: string,
  decision: ClientDecision,
  payload: { message?: string | null; signatureName?: string | null; ipHash?: string | null },
) {
  const quote = await prisma.quote.findUnique({
    where: { publicToken },
    include: { customer: { select: { firstName: true, lastName: true, companyName: true } } },
  });
  if (!quote || quote.deletedAt) throw notFound('Devis introuvable.');
  if (['ACCEPTE', 'REFUSE', 'ANNULE'].includes(quote.status)) {
    throw new AppError('CONFLICT', 'Ce devis a déjà reçu une réponse.');
  }
  if (quote.validUntil && quote.validUntil < new Date()) {
    throw new AppError('CONFLICT', "Ce devis n'est plus valable. Contactez l'entreprise.");
  }

  const now = new Date();
  const updated = await prisma.quote.update({
    where: { id: quote.id },
    data: {
      status: decision,
      respondedAt: now,
      acceptedAt: decision === 'ACCEPTE' ? now : null,
      refusedAt: decision === 'REFUSE' ? now : null,
      clientMessage: payload.message?.slice(0, 2000) ?? null,
      signatureName: decision === 'ACCEPTE' ? payload.signatureName?.slice(0, 120) ?? null : null,
      events: {
        create: {
          type:
            decision === 'ACCEPTE'
              ? 'ACCEPTE'
              : decision === 'REFUSE'
                ? 'REFUSE'
                : 'MODIFICATION_DEMANDEE',
          actor: 'client',
          ipHash: payload.ipHash ?? null,
        },
      },
    },
  });

  // Les relances en attente sur ce devis n'ont plus lieu d'être.
  await prisma.followUp.updateMany({
    where: { quoteId: quote.id, status: { in: ['SUGGEREE', 'PLANIFIEE'] } },
    data: { status: 'ANNULEE' },
  });

  const customerName =
    quote.customer.companyName ??
    [quote.customer.firstName, quote.customer.lastName].filter(Boolean).join(' ') ??
    'Le client';

  const titles: Record<ClientDecision, string> = {
    ACCEPTE: `${customerName} a accepté le devis ${quote.number}.`,
    REFUSE: `${customerName} a refusé le devis ${quote.number}.`,
    MODIFICATION_DEMANDEE: `${customerName} demande une modification du devis ${quote.number}.`,
  };
  const types = {
    ACCEPTE: 'DEVIS_ACCEPTE',
    REFUSE: 'DEVIS_REFUSE',
    MODIFICATION_DEMANDEE: 'DEVIS_MODIFICATION',
  } as const;

  await notify({
    organizationId: quote.organizationId,
    type: types[decision],
    title: titles[decision],
    body: payload.message ?? undefined,
    href: `/app/devis/${quote.id}`,
  });

  if (decision === 'ACCEPTE') {
    await trackEvent('quote_accepted', {
      organizationId: quote.organizationId,
      properties: { totalCents: quote.totalCents },
    });
    if (quote.leadId) {
      await prisma.lead.update({
        where: { id: quote.leadId },
        data: { status: 'GAGNE', lastActivityAt: now },
      });
    }
  } else if (decision === 'REFUSE') {
    await trackEvent('quote_refused', { organizationId: quote.organizationId });
    if (quote.leadId) {
      await prisma.lead.update({
        where: { id: quote.leadId },
        data: { status: 'PERDU', lastActivityAt: now },
      });
    }
  }

  await recordAudit({
    action:
      decision === 'ACCEPTE'
        ? 'quote.accepted'
        : decision === 'REFUSE'
          ? 'quote.refused'
          : 'quote.change_requested',
    organizationId: quote.organizationId,
    entityType: 'quote',
    entityId: quote.id,
  });

  return updated;
}

/** Devis envoyés depuis plus de `hours` heures et toujours sans réponse. */
export async function pendingQuotes(organizationId: string, hours = 0) {
  const threshold = new Date(Date.now() - hours * 60 * 60 * 1000);
  return prisma.quote.findMany({
    where: {
      organizationId,
      deletedAt: null,
      status: { in: ['ENVOYE', 'CONSULTE', 'MODIFICATION_DEMANDEE'] },
      sentAt: { lte: threshold },
    },
    include: { customer: true, followUps: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { sentAt: 'asc' },
  });
}

/** Marque comme expirés les devis dont la date de validité est dépassée. */
export async function expireOutdatedQuotes(organizationId?: string) {
  const where: Prisma.QuoteWhereInput = {
    deletedAt: null,
    status: { in: ['ENVOYE', 'CONSULTE'] },
    validUntil: { lt: new Date() },
    ...(organizationId ? { organizationId } : {}),
  };
  const result = await prisma.quote.updateMany({ where, data: { status: 'EXPIRE' } });
  return result.count;
}

export { dec };
