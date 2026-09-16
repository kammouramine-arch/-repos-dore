import 'server-only';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { centsToEuros } from '@/lib/money';
import { EXPENSE_CATEGORY_LABELS, INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@devisia/shared';
import type { AccountingExportInput, AccountingExportSummaryDTO } from '@devisia/shared';
import { customerDisplayName, deriveInvoiceStatus } from './invoiceService';
import { recordAudit } from './auditService';

/**
 * Export comptable : ce que l'artisan envoie à son comptable en fin de mois.
 *
 * Trois jeux de données, en CSV séparés par des points-virgules et encodés en
 * UTF-8 avec BOM — c'est ce qu'attend Excel en configuration française, et un
 * export que le comptable ne peut pas ouvrir ne sert à rien.
 *
 * Les montants sont écrits en euros avec une virgule décimale, pour la même
 * raison. Les identifiants techniques sont conservés en dernière colonne :
 * inutiles au comptable, indispensables quand il faut retrouver une pièce.
 */

const SEPARATOR = ';';
const BOM = '﻿';

/** Échappe une valeur pour un CSV à points-virgules. */
function cell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const text = String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Montant en euros, virgule décimale, deux décimales. */
function euros(cents: number): string {
  return centsToEuros(cents).toFixed(2).replace('.', ',');
}

function day(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : '';
}

function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers.map(cell).join(SEPARATOR)];
  for (const row of rows) lines.push(row.map(cell).join(SEPARATOR));
  return BOM + lines.join('\r\n') + '\r\n';
}

export interface AccountingExportFile {
  name: string;
  content: string;
  contentType: 'text/csv';
}

export interface AccountingExportResult {
  summary: AccountingExportSummaryDTO;
  files: AccountingExportFile[];
  /** Pièces jointes disponibles, données par référence plutôt que par contenu. */
  documents: { id: string; kind: 'invoice_pdf' | 'receipt'; label: string; url: string }[];
}

function parseRange(input: AccountingExportInput): { from: Date; to: Date } {
  const from = new Date(input.from);
  const to = new Date(input.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new AppError('VALIDATION', 'La période demandée est invalide.');
  }
  if (from.getTime() > to.getTime()) {
    throw new AppError('VALIDATION', 'La date de début doit précéder la date de fin.');
  }
  // Bornes de journée pleines : un export « du 1er au 31 » doit contenir le 31.
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  if (to.getTime() - from.getTime() > 400 * 24 * 60 * 60 * 1000) {
    throw new AppError('VALIDATION', 'La période ne peut pas dépasser treize mois.');
  }
  return { from, to };
}

/**
 * Construit l'export d'une période.
 *
 * Aucun document n'est fabriqué : les ventes viennent des factures émises, les
 * dépenses des justificatifs saisis, les encaissements des paiements réussis.
 * Une période sans activité produit un fichier avec ses seuls en-têtes plutôt
 * qu'une erreur — le comptable saura lire « rien ce mois-ci ».
 */
export async function buildAccountingExport(
  organizationId: string,
  userId: string,
  input: AccountingExportInput,
): Promise<AccountingExportResult> {
  const { from, to } = parseRange(input);
  const datasets = new Set(input.datasets.length > 0 ? input.datasets : (['sales', 'expenses', 'payments'] as const));
  const files: AccountingExportFile[] = [];
  const documents: AccountingExportResult['documents'] = [];
  const period = `${day(from)}_${day(to)}`;

  let salesCount = 0;
  let salesTotalCents = 0;
  let salesVatCents = 0;
  let expenseCount = 0;
  let expenseTotalCents = 0;
  let expenseVatCents = 0;
  let paymentCount = 0;
  let paymentTotalCents = 0;

  if (datasets.has('sales')) {
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { not: 'BROUILLON' },
        issuedAt: { gte: from, lte: to },
      },
      include: { customer: { select: { companyName: true, firstName: true, lastName: true, email: true } } },
      orderBy: { issuedAt: 'asc' },
    });
    const rows = invoices.map((invoice) => {
      salesCount += 1;
      salesTotalCents += invoice.totalCents;
      salesVatCents += invoice.vatCents;
      if (input.includeDocuments) {
        documents.push({
          id: invoice.id,
          kind: 'invoice_pdf',
          label: `${invoice.number}.pdf`,
          url: `/api/invoices/${invoice.id}/pdf`,
        });
      }
      return [
        day(invoice.issuedAt),
        invoice.number,
        customerDisplayName(invoice.customer),
        invoice.title,
        euros(invoice.netSubtotalCents),
        euros(invoice.vatCents),
        euros(invoice.totalCents),
        euros(invoice.paidCents),
        euros(Math.max(0, invoice.totalCents - invoice.depositCents - invoice.paidCents)),
        INVOICE_STATUS_LABELS[deriveInvoiceStatus(invoice)],
        day(invoice.dueAt),
        invoice.id,
      ];
    });
    files.push({
      name: `ventes_${period}.csv`,
      contentType: 'text/csv',
      content: toCsv(
        ['Date', 'Numéro', 'Client', 'Objet', 'Total HT', 'TVA', 'Total TTC', 'Encaissé', 'Restant dû', 'Statut', 'Échéance', 'Référence interne'],
        rows,
      ),
    });
  }

  if (datasets.has('expenses')) {
    const expenses = await prisma.expense.findMany({
      where: { organizationId, deletedAt: null, spentAt: { gte: from, lte: to } },
      orderBy: { spentAt: 'asc' },
    });
    const rows = expenses.map((expense) => {
      expenseCount += 1;
      expenseTotalCents += expense.amountCents;
      expenseVatCents += expense.vatCents;
      if (input.includeDocuments && expense.receiptFileId) {
        documents.push({
          id: expense.receiptFileId,
          kind: 'receipt',
          label: `justificatif_${day(expense.spentAt)}_${expense.merchant.replace(/[^\w-]+/g, '_')}`,
          url: `/api/files/${expense.receiptFileId}`,
        });
      }
      return [
        day(expense.spentAt),
        expense.merchant,
        EXPENSE_CATEGORY_LABELS[expense.category],
        expense.description ?? '',
        euros(expense.amountCents - expense.vatCents),
        euros(expense.vatCents),
        euros(expense.amountCents),
        PAYMENT_METHOD_LABELS[expense.paymentMethod],
        expense.reference ?? '',
        expense.receiptFileId ? 'oui' : 'non',
        expense.id,
      ];
    });
    files.push({
      name: `depenses_${period}.csv`,
      contentType: 'text/csv',
      content: toCsv(
        ['Date', 'Fournisseur', 'Poste', 'Détail', 'Montant HT', 'TVA', 'Montant TTC', 'Règlement', 'Référence', 'Justificatif', 'Référence interne'],
        rows,
      ),
    });
  }

  if (datasets.has('payments')) {
    const payments = await prisma.payment.findMany({
      where: { organizationId, status: 'REUSSI', receivedAt: { gte: from, lte: to } },
      include: { invoice: { select: { number: true } } },
      orderBy: { receivedAt: 'asc' },
    });
    const rows = payments.map((payment) => {
      paymentCount += 1;
      paymentTotalCents += payment.amountCents;
      return [
        day(payment.receivedAt),
        payment.invoice.number,
        euros(payment.amountCents),
        payment.currency,
        PAYMENT_METHOD_LABELS[payment.method],
        payment.provider === 'STRIPE' ? 'En ligne' : 'Saisi',
        payment.reference ?? payment.providerReference ?? '',
        payment.feeCents != null ? euros(payment.feeCents) : '',
        payment.id,
      ];
    });
    files.push({
      name: `encaissements_${period}.csv`,
      contentType: 'text/csv',
      content: toCsv(
        ['Date', 'Facture', 'Montant', 'Devise', 'Moyen', 'Origine', 'Référence', 'Commission', 'Référence interne'],
        rows,
      ),
    });
  }

  await recordAudit({
    organizationId,
    userId,
    action: 'accounting.exported',
    entityType: 'organization',
    entityId: organizationId,
    metadata: { from: day(from), to: day(to), datasets: [...datasets] },
  });

  return {
    summary: {
      from: day(from),
      to: day(to),
      salesCount,
      salesTotalCents,
      salesVatCents,
      expenseCount,
      expenseTotalCents,
      expenseVatCents,
      paymentCount,
      paymentTotalCents,
      documentCount: documents.length,
    },
    files,
    documents,
  };
}
