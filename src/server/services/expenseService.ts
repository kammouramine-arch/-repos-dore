import 'server-only';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { eurosToCents } from '@/lib/money';
import { getAIProvider, receiptExtractionSchema, RECEIPT_EXTRACTION_SYSTEM } from '@/lib/ai';
import { getStorageProvider } from '@/lib/storage';
import type {
  ExpenseDTO,
  ExpenseInput,
  ExpenseListDTO,
  ReceiptExtractionDTO,
} from '@devisia/shared';
import { EXPENSE_CATEGORY_LABELS } from '@devisia/shared';
import { recordAudit } from './auditService';
import { incrementUsage } from './usageService';

/**
 * Dépenses de l'entreprise et lecture de leurs justificatifs.
 *
 * Le principe qui gouverne ce fichier : l'IA propose, l'artisan dispose.
 * `extractReceipt` ne crée rien en base. Elle renvoie une lecture, avec ses
 * trous assumés, que l'écran présente pour relecture. La dépense n'existe
 * qu'après `createExpense`, c'est-à-dire après validation humaine.
 *
 * La lecture brute est conservée à côté des valeurs validées : quand un
 * comptable conteste un montant six mois plus tard, on peut montrer ce que le
 * ticket disait et ce que l'artisan a corrigé.
 */

function expenseToDTO(expense: {
  id: string;
  merchant: string;
  category: string;
  description: string | null;
  spentAt: Date;
  amountCents: number;
  vatCents: number;
  currency: string;
  reference: string | null;
  paymentMethod: string;
  receiptFileId: string | null;
  aiExtracted: boolean;
  createdAt: Date;
}): ExpenseDTO {
  return {
    id: expense.id,
    merchant: expense.merchant,
    category: expense.category as ExpenseDTO['category'],
    description: expense.description,
    spentAt: expense.spentAt.toISOString(),
    amountCents: expense.amountCents,
    vatCents: expense.vatCents,
    currency: expense.currency,
    reference: expense.reference,
    paymentMethod: expense.paymentMethod as ExpenseDTO['paymentMethod'],
    receiptFileId: expense.receiptFileId,
    receiptUrl: expense.receiptFileId ? `/api/files/${expense.receiptFileId}` : null,
    aiExtracted: expense.aiExtracted,
    createdAt: expense.createdAt.toISOString(),
  };
}

/** Date lue sur un ticket, acceptée seulement si elle est plausible. */
function parseReceiptDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  // Un ticket daté de 1970 ou de 2140 est une erreur de lecture, pas une date.
  if (year < 2000 || parsed.getTime() > Date.now() + 48 * 60 * 60 * 1000) return null;
  return parsed.toISOString();
}

/**
 * Lit un justificatif déjà téléversé et renvoie ce que l'IA y a trouvé.
 *
 * N'écrit aucune dépense : c'est une proposition à relire. Les champs que
 * l'IA n'a pas su lire sont listés dans `missing` pour que l'écran puisse les
 * mettre en avant plutôt que de les laisser vides sans explication.
 */
export async function extractReceipt(
  organizationId: string,
  userId: string,
  fileId: string,
): Promise<ReceiptExtractionDTO> {
  const provider = getAIProvider();
  if (!provider) {
    throw new AppError(
      'PROVIDER_UNAVAILABLE',
      'La lecture automatique des justificatifs n’est pas activée. Saisissez la dépense à la main.',
    );
  }

  const file = await prisma.file.findFirst({
    where: { id: fileId, organizationId, deletedAt: null },
  });
  if (!file) throw new AppError('NOT_FOUND', 'Justificatif introuvable.');
  if (!file.mimeType.startsWith('image/') && file.mimeType !== 'application/pdf') {
    throw new AppError('VALIDATION', 'Le justificatif doit être une photo ou un PDF.');
  }

  const storage = getStorageProvider();
  const buffer = await storage.get(file.storageKey);
  const result = await provider.generateStructuredOutput({
    schema: receiptExtractionSchema,
    schemaName: 'LectureJustificatif',
    system: RECEIPT_EXTRACTION_SYSTEM,
    // Le justificatif est la seule entrée, et elle vient de l'extérieur :
    // aucune instruction de confiance ne l'accompagne.
    untrusted: '',
    images: [{ base64: buffer.toString('base64'), mimeType: file.mimeType, fileName: file.fileName }],
  });

  await incrementUsage(organizationId, 'RECEIPT_SCAN');
  await prisma.aIRequest
    .create({
      data: {
        organizationId,
        userId,
        kind: 'RECEIPT_EXTRACTION',
        provider: result.usage.provider,
        model: result.usage.model,
        latencyMs: result.usage.latencyMs,
      },
    })
    .catch(() => undefined);

  const parsed = result.data;
  const spentAt = parseReceiptDate(parsed.date);
  const missing = [...(parsed.champsIllisibles ?? [])];
  if (!parsed.marchand) missing.push('marchand');
  if (!spentAt) missing.push('date');
  if (parsed.totalTTC == null) missing.push('montant');

  return {
    merchant: parsed.marchand?.trim() || null,
    spentAt,
    amountCents: parsed.totalTTC != null ? eurosToCents(parsed.totalTTC) : null,
    // La TVA n'est reprise que si le ticket l'imprime : jamais recalculée.
    vatCents: parsed.montantTVA != null ? eurosToCents(parsed.montantTVA) : null,
    currency: parsed.devise?.toUpperCase() || 'EUR',
    reference: parsed.reference?.trim() || null,
    category: (parsed.categorie as ReceiptExtractionDTO['category']) ?? null,
    confidence: Math.round(parsed.confiance ?? 0),
    missing: [...new Set(missing)],
    warnings: parsed.avertissements ?? [],
  };
}

/** Enregistre une dépense relue par l'artisan. */
export async function createExpense(
  organizationId: string,
  userId: string,
  input: ExpenseInput,
): Promise<ExpenseDTO> {
  const merchant = input.merchant.trim();
  if (merchant.length < 2) throw new AppError('VALIDATION', 'Indiquez le nom du commerce.');
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new AppError('VALIDATION', 'Le montant de la dépense doit être supérieur à zéro.');
  }
  const vatCents = input.vatCents ?? 0;
  if (vatCents < 0 || vatCents > input.amountCents) {
    throw new AppError('VALIDATION', 'La TVA ne peut pas dépasser le montant total.');
  }
  const spentAt = new Date(input.spentAt);
  if (Number.isNaN(spentAt.getTime())) throw new AppError('VALIDATION', 'La date de la dépense est invalide.');

  if (input.receiptFileId) {
    const file = await prisma.file.findFirst({
      where: { id: input.receiptFileId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!file) throw new AppError('NOT_FOUND', 'Justificatif introuvable.');
  }

  const expense = await prisma.expense.create({
    data: {
      organizationId,
      createdById: userId,
      merchant,
      category: input.category,
      description: input.description?.trim() || null,
      spentAt,
      amountCents: input.amountCents,
      vatCents,
      reference: input.reference?.trim() || null,
      paymentMethod: input.paymentMethod ?? 'CARTE',
      receiptFileId: input.receiptFileId ?? null,
      parsed: (input.parsed ?? undefined) as never,
      aiExtracted: input.parsed != null,
    },
  });

  if (input.receiptFileId) {
    await prisma.file.update({ where: { id: input.receiptFileId }, data: { kind: 'RECU' } });
  }
  await recordAudit({
    organizationId,
    userId,
    action: 'expense.created',
    entityType: 'expense',
    entityId: expense.id,
    metadata: { amountCents: expense.amountCents, aiExtracted: expense.aiExtracted },
  });
  return expenseToDTO(expense);
}

export async function updateExpense(
  organizationId: string,
  userId: string,
  expenseId: string,
  input: ExpenseInput,
): Promise<ExpenseDTO> {
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new AppError('NOT_FOUND', 'Dépense introuvable.');

  const spentAt = new Date(input.spentAt);
  if (Number.isNaN(spentAt.getTime())) throw new AppError('VALIDATION', 'La date de la dépense est invalide.');
  const vatCents = input.vatCents ?? 0;
  if (vatCents < 0 || vatCents > input.amountCents) {
    throw new AppError('VALIDATION', 'La TVA ne peut pas dépasser le montant total.');
  }

  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      merchant: input.merchant.trim(),
      category: input.category,
      description: input.description?.trim() || null,
      spentAt,
      amountCents: input.amountCents,
      vatCents,
      reference: input.reference?.trim() || null,
      paymentMethod: input.paymentMethod ?? 'CARTE',
      receiptFileId: input.receiptFileId ?? null,
    },
  });
  await recordAudit({
    organizationId,
    userId,
    action: 'expense.updated',
    entityType: 'expense',
    entityId: expenseId,
  });
  return expenseToDTO(expense);
}

export async function deleteExpense(organizationId: string, userId: string, expenseId: string): Promise<void> {
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new AppError('NOT_FOUND', 'Dépense introuvable.');
  await prisma.expense.update({ where: { id: expenseId }, data: { deletedAt: new Date() } });
  await recordAudit({
    organizationId,
    userId,
    action: 'expense.deleted',
    entityType: 'expense',
    entityId: expenseId,
  });
}

export async function listExpenses(
  organizationId: string,
  options: { from?: string; to?: string; category?: string; limit?: number } = {},
): Promise<ExpenseListDTO> {
  const where = {
    organizationId,
    deletedAt: null,
    ...(options.category ? { category: options.category as never } : {}),
    ...(options.from || options.to
      ? {
          spentAt: {
            ...(options.from ? { gte: new Date(options.from) } : {}),
            ...(options.to ? { lte: new Date(options.to) } : {}),
          },
        }
      : {}),
  };

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { spentAt: 'desc' },
    take: Math.min(500, options.limit ?? 200),
  });

  const byCategory = new Map<string, { totalCents: number; count: number }>();
  let totalCents = 0;
  let vatCents = 0;
  for (const expense of expenses) {
    totalCents += expense.amountCents;
    vatCents += expense.vatCents;
    const bucket = byCategory.get(expense.category) ?? { totalCents: 0, count: 0 };
    bucket.totalCents += expense.amountCents;
    bucket.count += 1;
    byCategory.set(expense.category, bucket);
  }

  return {
    expenses: expenses.map(expenseToDTO),
    totalCents,
    vatCents,
    count: expenses.length,
    byCategory: [...byCategory.entries()]
      .map(([category, bucket]) => ({ category: category as ExpenseDTO['category'], ...bucket }))
      .sort((a, b) => b.totalCents - a.totalCents),
  };
}

/** Libellé lisible d'un poste de dépense, pour les exports. */
export function categoryLabel(category: ExpenseDTO['category']): string {
  return EXPENSE_CATEGORY_LABELS[category];
}
