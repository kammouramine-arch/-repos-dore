import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { computeQuoteTotals } from '@/lib/money';
import { env } from '@/lib/env';
import type {
  CreateInvoiceFromQuoteInput,
  InvoiceDetailDTO,
  InvoiceItemDTO,
  InvoicePaymentDTO,
  InvoiceSummaryDTO,
  RecordPaymentInput,
} from '@devisia/shared';
import { generateToken } from '@/lib/auth/tokens';
import { nextDocumentNumber } from './numberingService';
import { recordAudit } from './auditService';

/**
 * Factures de l'artisan.
 *
 * Une facture naît d'un devis accepté et en fige le contenu : ses lignes sont
 * copiées, pas référencées. Modifier le devis ou le catalogue après coup ne
 * change plus une facture émise — c'est ce qu'attend un document comptable.
 *
 * Les montants ne sont jamais fournis par le client : ils sont recalculés ici
 * par le même moteur que les devis, à partir des lignes.
 */

const DEFAULT_DUE_DAYS = 30;

/** Colonnes suffisant à composer le nom affiché d'un client. */
const CUSTOMER_NAME_SELECT = {
  companyName: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

type CustomerName = {
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

/** Raison sociale si elle existe, sinon prénom et nom. */
export function customerDisplayName(customer: CustomerName): string {
  const person = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return customer.companyName?.trim() || person || 'Client';
}

function decimal(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}

function itemToDTO(item: {
  id: string;
  kind: string;
  label: string;
  description: string | null;
  unit: string;
  quantity: Prisma.Decimal;
  unitPriceCents: number;
  discountRate: Prisma.Decimal;
  vatRate: Prisma.Decimal;
  lineTotalCents: number;
  vatCents: number;
  position: number;
}): InvoiceItemDTO {
  return {
    id: item.id,
    kind: item.kind as InvoiceItemDTO['kind'],
    label: item.label,
    description: item.description,
    unit: item.unit,
    quantity: decimal(item.quantity),
    unitPriceCents: item.unitPriceCents,
    discountRate: decimal(item.discountRate),
    vatRate: decimal(item.vatRate),
    lineTotalCents: item.lineTotalCents,
    vatCents: item.vatCents,
    position: item.position,
  };
}

function paymentToDTO(payment: {
  id: string;
  amountCents: number;
  currency: string;
  method: string;
  provider: string;
  status: string;
  reference: string | null;
  receivedAt: Date;
  refundedAt: Date | null;
  failureReason: string | null;
}): InvoicePaymentDTO {
  return {
    id: payment.id,
    amountCents: payment.amountCents,
    currency: payment.currency,
    method: payment.method as InvoicePaymentDTO['method'],
    provider: payment.provider as InvoicePaymentDTO['provider'],
    status: payment.status as InvoicePaymentDTO['status'],
    reference: payment.reference,
    receivedAt: payment.receivedAt.toISOString(),
    refundedAt: payment.refundedAt?.toISOString() ?? null,
    failureReason: payment.failureReason,
  };
}

/** Restant dû : total, moins l'acompte déjà réglé, moins les encaissements. */
export function balanceOf(invoice: { totalCents: number; depositCents: number; paidCents: number }): number {
  return Math.max(0, invoice.totalCents - invoice.depositCents - invoice.paidCents);
}

/**
 * Statut déduit des montants et de l'échéance.
 *
 * Le statut n'est jamais posé à la main par un client : il découle de ce qui a
 * été réellement encaissé. Un brouillon et une facture annulée ne sont pas
 * recalculés — ce sont des décisions de l'artisan, pas des conséquences.
 */
export function deriveInvoiceStatus(invoice: {
  status: string;
  totalCents: number;
  depositCents: number;
  paidCents: number;
  dueAt: Date | null;
  sentAt: Date | null;
}): 'BROUILLON' | 'ENVOYEE' | 'PARTIELLE' | 'PAYEE' | 'EN_RETARD' | 'ANNULEE' {
  if (invoice.status === 'ANNULEE') return 'ANNULEE';
  // Un brouillon qui a reçu de l'argent n'est plus un brouillon : le client
  // l'a forcément reçu. Le laisser en brouillon masquerait un encaissement
  // réel dans le total « en attente de règlement ».
  if (invoice.status === 'BROUILLON' && !invoice.sentAt && invoice.paidCents === 0) return 'BROUILLON';
  const balance = balanceOf(invoice);
  if (balance === 0) return 'PAYEE';
  const overdue = invoice.dueAt != null && invoice.dueAt.getTime() < Date.now();
  if (invoice.paidCents > 0) return overdue ? 'EN_RETARD' : 'PARTIELLE';
  return overdue ? 'EN_RETARD' : 'ENVOYEE';
}

function summaryToDTO(invoice: {
  id: string;
  number: string;
  title: string;
  status: string;
  customerId: string;
  customer: CustomerName;
  totalCents: number;
  depositCents: number;
  paidCents: number;
  issuedAt: Date | null;
  dueAt: Date | null;
  paidAt: Date | null;
  quoteId: string | null;
  createdAt: Date;
  sentAt: Date | null;
  publicToken: string;
}): InvoiceSummaryDTO {
  const balance = balanceOf(invoice);
  return {
    id: invoice.id,
    number: invoice.number,
    title: invoice.title,
    status: deriveInvoiceStatus(invoice),
    customerId: invoice.customerId,
    customerName: customerDisplayName(invoice.customer),
    totalCents: invoice.totalCents,
    paidCents: invoice.paidCents,
    balanceCents: balance,
    issuedAt: invoice.issuedAt?.toISOString() ?? null,
    dueAt: invoice.dueAt?.toISOString() ?? null,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    overdue: balance > 0 && invoice.dueAt != null && invoice.dueAt.getTime() < Date.now(),
    quoteId: invoice.quoteId,
    createdAt: invoice.createdAt.toISOString(),
    publicToken: invoice.publicToken,
  };
}

/**
 * Crée une facture à partir d'un devis accepté.
 *
 * Refuse tout devis non accepté : facturer un devis que le client n'a pas
 * validé produirait un document sans base. Refuse aussi la double facturation,
 * sauf si la facture précédente a été annulée.
 */
export async function createInvoiceFromQuote(
  organizationId: string,
  userId: string,
  input: CreateInvoiceFromQuoteInput,
): Promise<InvoiceDetailDTO> {
  const quote = await prisma.quote.findFirst({
    where: { id: input.quoteId, organizationId, deletedAt: null },
    include: {
      items: { orderBy: { position: 'asc' } },
      invoices: { where: { status: { not: 'ANNULEE' }, deletedAt: null } },
      customer: { select: { companyName: true, firstName: true, lastName: true, email: true } },
    },
  });
  if (!quote) throw new AppError('NOT_FOUND', 'Devis introuvable.');
  if (quote.status !== 'ACCEPTE') {
    throw new AppError('CONFLICT', 'Seul un devis accepté par le client peut être facturé.');
  }
  if (quote.invoices.length > 0) {
    throw new AppError('CONFLICT', `Ce devis a déjà été facturé (${quote.invoices[0]!.number}).`);
  }
  if (quote.items.length === 0) {
    throw new AppError('VALIDATION', 'Ce devis ne contient aucune ligne à facturer.');
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { organizationId },
    select: { vatStatus: true, paymentTerms: true, quoteTerms: true },
  });
  const vatExempt = profile?.vatStatus === 'FRANCHISE_EN_BASE';

  // Recalcul serveur : les montants du devis ne sont pas recopiés à l'aveugle.
  const totals = computeQuoteTotals({
    lines: quote.items.map((item) => ({
      quantity: decimal(item.quantity),
      unitPriceCents: item.unitPriceCents,
      discountRate: decimal(item.discountRate),
      vatRate: decimal(item.vatRate),
    })),
    globalDiscountRate: decimal(quote.discountRate),
    vatExempt,
  });

  const deductDeposit = input.deductDeposit ?? true;
  const depositCents = deductDeposit ? quote.depositCents : 0;
  const dueDays = Math.min(365, Math.max(0, input.dueInDays ?? DEFAULT_DUE_DAYS));
  const issuedAt = new Date();
  const dueAt = new Date(issuedAt.getTime() + dueDays * 24 * 60 * 60 * 1000);

  const invoice = await prisma.$transaction(async (tx) => {
    const number = await nextDocumentNumber(organizationId, 'INVOICE', tx);
    const created = await tx.invoice.create({
      data: {
        organizationId,
        customerId: quote.customerId,
        quoteId: quote.id,
        jobId: quote.jobId,
        createdById: userId,
        number,
        title: quote.title,
        status: 'BROUILLON',
        publicToken: generateToken(24),
        issuedAt,
        dueAt,
        subtotalCents: totals.subtotalCents,
        discountRate: quote.discountRate,
        discountCents: totals.discountCents,
        netSubtotalCents: totals.netSubtotalCents,
        vatCents: totals.vatCents,
        totalCents: totals.totalCents,
        depositCents,
        notes: quote.notes,
        terms: quote.terms ?? profile?.quoteTerms ?? null,
        paymentTerms: quote.paymentTerms ?? profile?.paymentTerms ?? null,
        items: {
          create: quote.items.map((item, index) => ({
            kind: item.kind,
            label: item.label,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            discountRate: item.discountRate,
            vatRate: vatExempt ? 0 : item.vatRate,
            lineTotalCents: totals.lines[index]?.lineTotalCents ?? item.lineTotalCents,
            vatCents: totals.lines[index]?.vatCents ?? 0,
            position: index,
          })),
        },
      },
    });
    await tx.quoteEvent.create({
      data: { quoteId: quote.id, type: 'FACTURE', metadata: { invoiceId: created.id, number } },
    });
    return created;
  });

  await recordAudit({
    organizationId,
    userId,
    action: 'invoice.created',
    entityType: 'invoice',
    entityId: invoice.id,
    metadata: { quoteId: quote.id, number: invoice.number },
  });

  return invoiceDetail(organizationId, invoice.id);
}

export async function listInvoices(
  organizationId: string,
  options: { status?: string; customerId?: string; limit?: number } = {},
): Promise<InvoiceSummaryDTO[]> {
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(options.customerId ? { customerId: options.customerId } : {}),
    },
    include: { customer: { select: CUSTOMER_NAME_SELECT } },
    orderBy: { createdAt: 'desc' },
    take: Math.min(200, options.limit ?? 100),
  });
  const summaries = invoices.map(summaryToDTO);
  return options.status ? summaries.filter((invoice) => invoice.status === options.status) : summaries;
}

export async function invoiceDetail(organizationId: string, invoiceId: string): Promise<InvoiceDetailDTO> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId, deletedAt: null },
    include: {
      customer: { select: CUSTOMER_NAME_SELECT },
      items: { orderBy: { position: 'asc' } },
      payments: { orderBy: { receivedAt: 'desc' } },
    },
  });
  if (!invoice) throw new AppError('NOT_FOUND', 'Facture introuvable.');

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { stripeChargesEnabled: true },
  });

  const base = env().APP_URL;
  return {
    ...summaryToDTO(invoice),
    customerEmail: invoice.customer.email,
    subtotalCents: invoice.subtotalCents,
    discountRate: decimal(invoice.discountRate),
    discountCents: invoice.discountCents,
    netSubtotalCents: invoice.netSubtotalCents,
    vatCents: invoice.vatCents,
    depositCents: invoice.depositCents,
    notes: invoice.notes,
    terms: invoice.terms,
    paymentTerms: invoice.paymentTerms,
    sentAt: invoice.sentAt?.toISOString() ?? null,
    items: invoice.items.map(itemToDTO),
    payments: invoice.payments.map(paymentToDTO),
    publicUrl: `${base}/facture/${invoice.publicToken}`,
    pdfUrl: `${base}/api/invoices/${invoice.id}/pdf`,
    onlinePaymentAvailable: organization?.stripeChargesEnabled ?? false,
  };
}

/** Marque la facture comme émise et ouvre sa page publique de règlement. */
export async function markInvoiceSent(
  organizationId: string,
  userId: string,
  invoiceId: string,
): Promise<InvoiceDetailDTO> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId, deletedAt: null },
  });
  if (!invoice) throw new AppError('NOT_FOUND', 'Facture introuvable.');
  if (invoice.status === 'ANNULEE') throw new AppError('CONFLICT', 'Cette facture est annulée.');

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      sentAt: invoice.sentAt ?? new Date(),
      issuedAt: invoice.issuedAt ?? new Date(),
      status: invoice.status === 'BROUILLON' ? 'ENVOYEE' : invoice.status,
    },
  });
  await recordAudit({
    organizationId,
    userId,
    action: 'invoice.sent',
    entityType: 'invoice',
    entityId: invoiceId,
    metadata: { number: invoice.number },
  });
  return invoiceDetail(organizationId, invoiceId);
}

/**
 * Recalcule le montant encaissé et le statut d'une facture.
 *
 * Seuls les encaissements réussis comptent : une tentative en attente, échouée
 * ou remboursée ne réduit pas le restant dû. C'est la fonction appelée aussi
 * bien après une saisie manuelle qu'après un webhook Stripe, ce qui garantit
 * qu'un seul calcul fait autorité.
 */
export async function recomputeInvoiceTotals(
  invoiceId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  const invoice = await client.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: { where: { status: 'REUSSI' } } },
  });
  if (!invoice) return;

  const paidCents = invoice.payments.reduce((acc, payment) => acc + payment.amountCents, 0);
  const status = deriveInvoiceStatus({ ...invoice, paidCents });
  const settled = status === 'PAYEE';

  await client.invoice.update({
    where: { id: invoiceId },
    data: {
      paidCents,
      status,
      paidAt: settled ? (invoice.paidAt ?? new Date()) : null,
    },
  });
}

/** Saisie manuelle d'un encaissement (virement, chèque, espèces). */
export async function recordPayment(
  organizationId: string,
  userId: string,
  invoiceId: string,
  input: RecordPaymentInput,
): Promise<InvoiceDetailDTO> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId, deletedAt: null },
  });
  if (!invoice) throw new AppError('NOT_FOUND', 'Facture introuvable.');
  if (invoice.status === 'ANNULEE') throw new AppError('CONFLICT', 'Cette facture est annulée.');
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new AppError('VALIDATION', 'Le montant encaissé doit être supérieur à zéro.');
  }
  const balance = balanceOf(invoice);
  if (input.amountCents > balance) {
    throw new AppError('VALIDATION', 'Le montant dépasse le restant dû de la facture.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        organizationId,
        invoiceId,
        amountCents: input.amountCents,
        method: input.method,
        provider: 'MANUEL',
        status: 'REUSSI',
        reference: input.reference?.trim() || null,
        receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
      },
    });
    await recomputeInvoiceTotals(invoiceId, tx);
  });

  await recordAudit({
    organizationId,
    userId,
    action: 'payment.recorded',
    entityType: 'invoice',
    entityId: invoiceId,
    metadata: { amountCents: input.amountCents, method: input.method },
  });
  return invoiceDetail(organizationId, invoiceId);
}

export async function cancelInvoice(
  organizationId: string,
  userId: string,
  invoiceId: string,
): Promise<InvoiceDetailDTO> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId, deletedAt: null },
    include: { payments: { where: { status: 'REUSSI' } } },
  });
  if (!invoice) throw new AppError('NOT_FOUND', 'Facture introuvable.');
  if (invoice.payments.length > 0) {
    throw new AppError(
      'CONFLICT',
      'Cette facture a déjà reçu un règlement. Émettez un avoir plutôt que de l’annuler.',
    );
  }
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'ANNULEE' } });
  await recordAudit({
    organizationId,
    userId,
    action: 'invoice.cancelled',
    entityType: 'invoice',
    entityId: invoiceId,
  });
  return invoiceDetail(organizationId, invoiceId);
}
