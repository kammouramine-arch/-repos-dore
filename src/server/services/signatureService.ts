import 'server-only';
import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import type { QuoteSignatureDTO, SignQuoteInput } from '@devisia/shared';
import { recordAudit } from './auditService';

/**
 * Signature d'un devis par le client de l'artisan.
 *
 * Ce que le produit promet, exactement : le client ouvre un lien, lit le
 * devis, coche qu'il l'accepte et trace sa signature au doigt. DEVISERA
 * conserve le tracé, l'identité déclarée, l'horodatage, l'adresse IP et
 * l'empreinte du devis signé.
 *
 * Ce que le produit ne promet pas : il ne s'agit pas d'une signature
 * électronique qualifiée au sens du règlement eIDAS. Aucune autorité de
 * certification n'intervient et l'identité du signataire n'est pas vérifiée.
 * Aucun écran, aucun PDF et aucune page marketing ne doit prétendre le
 * contraire.
 *
 * L'empreinte `documentHash` est ce qui rend la signature vérifiable : elle
 * fige les lignes et les totaux au moment de la signature. Si l'artisan
 * modifie ensuite le devis, l'empreinte ne correspond plus, la signature est
 * marquée invalidée et le devis doit repartir en validation. Un devis signé ne
 * peut donc pas changer en silence après coup.
 */

/** Tracé accepté : un chemin SVG normalisé, borné en taille. */
const MAX_STROKE_LENGTH = 24_000;
const STROKE_PATTERN = /^[MLQCZmlqcz0-9.,\s-]+$/;

/**
 * Empreinte du contenu contractuel d'un devis.
 *
 * Seul ce qui engage est pris en compte : les lignes, les montants et la date
 * de validité. Un changement de titre ou de note interne ne casse pas une
 * signature ; une ligne, un prix ou un total modifié la casse.
 */
export function quoteDocumentHash(quote: {
  totalCents: number;
  netSubtotalCents: number;
  vatCents: number;
  depositCents: number;
  validUntil: Date | null;
  items: { label: string; quantity: Prisma.Decimal | number; unitPriceCents: number; vatRate: Prisma.Decimal | number; lineTotalCents: number }[];
}): string {
  const payload = JSON.stringify({
    total: quote.totalCents,
    net: quote.netSubtotalCents,
    vat: quote.vatCents,
    deposit: quote.depositCents,
    validUntil: quote.validUntil?.toISOString() ?? null,
    items: quote.items.map((item) => ({
      label: item.label,
      quantity: String(item.quantity),
      unit: item.unitPriceCents,
      vatRate: String(item.vatRate),
      total: item.lineTotalCents,
    })),
  });
  return createHash('sha256').update(payload).digest('hex');
}

export function signatureToDTO(signature: {
  id: string;
  signerName: string;
  signerEmail: string | null;
  strokePath: string;
  signedAt: Date;
  totalCents: number;
  invalidatedAt: Date | null;
}): QuoteSignatureDTO {
  return {
    id: signature.id,
    signerName: signature.signerName,
    signerEmail: signature.signerEmail,
    strokePath: signature.strokePath,
    signedAt: signature.signedAt.toISOString(),
    totalCents: signature.totalCents,
    invalidatedAt: signature.invalidatedAt?.toISOString() ?? null,
  };
}

function assertStroke(strokePath: string): string {
  const trimmed = strokePath.trim();
  if (trimmed.length < 8) {
    throw new AppError('VALIDATION', 'La signature est vide. Tracez votre signature dans le cadre.');
  }
  if (trimmed.length > MAX_STROKE_LENGTH) {
    throw new AppError('VALIDATION', 'La signature est trop détaillée. Recommencez d’un geste plus simple.');
  }
  // Le tracé est inséré tel quel dans un attribut SVG `d` : n'accepter que la
  // grammaire des chemins évite qu'un contenu arbitraire atteigne le PDF.
  if (!STROKE_PATTERN.test(trimmed)) {
    throw new AppError('VALIDATION', 'Le tracé de signature est invalide.');
  }
  return trimmed;
}

/**
 * Enregistre la signature d'un devis depuis la page publique.
 *
 * Le devis passe à ACCEPTE dans la même transaction que la signature : il ne
 * peut pas exister de devis signé resté « envoyé », ni l'inverse.
 */
export async function signQuote(
  publicToken: string,
  input: SignQuoteInput,
  context: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<QuoteSignatureDTO> {
  const signerName = input.signerName.trim();
  if (signerName.length < 2) {
    throw new AppError('VALIDATION', 'Indiquez le nom de la personne qui signe.');
  }
  if (input.accepted !== true) {
    throw new AppError('VALIDATION', 'Vous devez accepter le devis avant de signer.');
  }
  const strokePath = assertStroke(input.strokePath);

  const quote = await prisma.quote.findUnique({
    where: { publicToken },
    include: { items: { orderBy: { position: 'asc' } }, signatures: true },
  });
  if (!quote || quote.deletedAt) throw new AppError('NOT_FOUND', 'Ce devis n’est plus disponible.');

  if (quote.status === 'ANNULE') {
    throw new AppError('CONFLICT', 'Ce devis a été annulé par l’entreprise.');
  }
  if (quote.status === 'ACCEPTE' && quote.signatures.some((s) => !s.invalidatedAt)) {
    throw new AppError('CONFLICT', 'Ce devis a déjà été signé.');
  }
  if (quote.validUntil && quote.validUntil.getTime() < Date.now()) {
    throw new AppError('CONFLICT', 'Ce devis a dépassé sa date de validité. Demandez-en un nouveau à l’entreprise.');
  }

  const documentHash = quoteDocumentHash(quote);

  const signature = await prisma.$transaction(async (tx) => {
    const created = await tx.quoteSignature.create({
      data: {
        organizationId: quote.organizationId,
        quoteId: quote.id,
        signerName,
        signerEmail: input.signerEmail?.trim() || null,
        strokePath,
        documentHash,
        totalCents: quote.totalCents,
        accepted: true,
        // Conservés comme éléments de preuve d'une acceptation en ligne.
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent?.slice(0, 500) ?? null,
      },
    });
    await tx.quote.update({
      where: { id: quote.id },
      data: {
        status: 'ACCEPTE',
        acceptedAt: new Date(),
        respondedAt: new Date(),
        signatureName: signerName,
      },
    });
    await tx.quoteEvent.create({
      data: { quoteId: quote.id, type: 'SIGNE', actor: 'client', metadata: { signerName, signatureId: created.id } },
    });
    return created;
  });

  return signatureToDTO(signature);
}

/**
 * Invalide les signatures d'un devis dont le contenu contractuel a changé.
 *
 * Appelée après toute mise à jour d'un devis. Si l'empreinte du devis n'a pas
 * bougé, rien ne se passe : renommer un devis ou corriger une note n'annule
 * pas l'accord du client. Sinon la signature est marquée invalidée, le devis
 * redevient un brouillon envoyable et l'événement est tracé.
 *
 * Renvoie le nombre de signatures invalidées, pour que l'appelant puisse en
 * informer l'artisan.
 */
export async function invalidateSignaturesIfChanged(
  quoteId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<number> {
  const quote = await client.quote.findUnique({
    where: { id: quoteId },
    include: {
      items: { orderBy: { position: 'asc' } },
      signatures: { where: { invalidatedAt: null } },
    },
  });
  if (!quote || quote.signatures.length === 0) return 0;

  const currentHash = quoteDocumentHash(quote);
  const stale = quote.signatures.filter((signature) => signature.documentHash !== currentHash);
  if (stale.length === 0) return 0;

  await client.quoteSignature.updateMany({
    where: { id: { in: stale.map((s) => s.id) } },
    data: { invalidatedAt: new Date() },
  });
  await client.quote.update({
    where: { id: quoteId },
    data: { status: 'MODIFICATION_DEMANDEE', acceptedAt: null, signatureName: null },
  });
  await client.quoteEvent.create({
    data: {
      quoteId,
      type: 'MODIFIE',
      metadata: { invalidatedSignatures: stale.length, reason: 'contenu contractuel modifié après signature' },
    },
  });
  return stale.length;
}

/** Signature valide d'un devis, s'il en existe une. */
export async function activeSignature(quoteId: string): Promise<QuoteSignatureDTO | null> {
  const signature = await prisma.quoteSignature.findFirst({
    where: { quoteId, invalidatedAt: null },
    orderBy: { signedAt: 'desc' },
  });
  return signature ? signatureToDTO(signature) : null;
}

/** Journalise la consultation d'une signature par l'entreprise. */
export async function auditSignatureAccess(organizationId: string, userId: string, quoteId: string): Promise<void> {
  await recordAudit({
    organizationId,
    userId,
    action: 'quote.signature.viewed',
    entityType: 'quote',
    entityId: quoteId,
  });
}
