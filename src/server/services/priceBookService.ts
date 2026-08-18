import 'server-only';
import type { PriceBookCategory, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { eurosToCents } from '@/lib/money';
import { notFound } from '@/lib/errors';
import type { CatalogEntry } from '@/lib/ai';
import { toPriceBookItemDTO } from '../dto';
import { recordAudit } from './auditService';

/** Catalogue de l'organisation au format attendu par le moteur de rapprochement. */
export async function loadCatalog(organizationId: string): Promise<CatalogEntry[]> {
  const items = await prisma.priceBookItem.findMany({
    where: { organizationId, deletedAt: null, isActive: true },
    orderBy: { name: 'asc' },
  });
  return items.map((item) => ({
    id: item.id,
    reference: item.reference,
    name: item.name,
    description: item.description,
    category: item.category,
    unit: item.unit,
    costPriceCents: item.costPriceCents,
    salePriceCents: item.salePriceCents,
    vatRate: Number(item.vatRate),
    keywords: item.keywords,
  }));
}

export interface PriceBookFilter {
  search?: string;
  category?: PriceBookCategory;
  includeInactive?: boolean;
}

export async function listPriceBook(organizationId: string, filter: PriceBookFilter = {}) {
  const where: Prisma.PriceBookItemWhereInput = {
    organizationId,
    deletedAt: null,
    ...(filter.includeInactive ? {} : { isActive: true }),
    ...(filter.category ? { category: filter.category } : {}),
    ...(filter.search
      ? {
          OR: [
            { name: { contains: filter.search, mode: 'insensitive' } },
            { reference: { contains: filter.search, mode: 'insensitive' } },
            { description: { contains: filter.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const items = await prisma.priceBookItem.findMany({ where, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  return items.map(toPriceBookItemDTO);
}

export interface PriceBookWriteInput {
  name: string;
  reference?: string | null;
  sku?: string | null;
  description?: string | null;
  category: PriceBookCategory;
  unit: string;
  costPriceCents: number;
  salePriceCents: number;
  vatRate: number;
  supplier?: string | null;
  keywords?: string[];
  isActive?: boolean;
}

export async function createPriceBookItem(
  organizationId: string,
  userId: string,
  input: PriceBookWriteInput,
) {
  const item = await prisma.priceBookItem.create({
    data: {
      organizationId,
      name: input.name,
      reference: input.reference || null,
      sku: input.sku || null,
      description: input.description || null,
      category: input.category,
      unit: input.unit,
      costPriceCents: input.costPriceCents,
      salePriceCents: input.salePriceCents,
      vatRate: input.vatRate,
      supplier: input.supplier || null,
      keywords: input.keywords ?? [],
      isActive: input.isActive ?? true,
    },
  });
  await recordAudit({
    action: 'pricebook.updated',
    organizationId,
    userId,
    entityType: 'pricebook',
    entityId: item.id,
  });
  return toPriceBookItemDTO(item);
}

export async function updatePriceBookItem(
  organizationId: string,
  userId: string,
  id: string,
  input: Partial<PriceBookWriteInput>,
) {
  const existing = await prisma.priceBookItem.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw notFound('Article introuvable.');

  const item = await prisma.priceBookItem.update({
    where: { id },
    data: {
      name: input.name,
      reference: input.reference === undefined ? undefined : input.reference || null,
      sku: input.sku === undefined ? undefined : input.sku || null,
      description: input.description === undefined ? undefined : input.description || null,
      category: input.category,
      unit: input.unit,
      costPriceCents: input.costPriceCents,
      salePriceCents: input.salePriceCents,
      vatRate: input.vatRate,
      supplier: input.supplier === undefined ? undefined : input.supplier || null,
      keywords: input.keywords,
      isActive: input.isActive,
    },
  });
  await recordAudit({
    action: 'pricebook.updated',
    organizationId,
    userId,
    entityType: 'pricebook',
    entityId: id,
  });
  return toPriceBookItemDTO(item);
}

/** Suppression logique : les devis existants conservent leur référence d'article. */
export async function deletePriceBookItem(organizationId: string, userId: string, id: string) {
  const existing = await prisma.priceBookItem.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw notFound('Article introuvable.');
  await prisma.priceBookItem.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  await recordAudit({
    action: 'pricebook.updated',
    organizationId,
    userId,
    entityType: 'pricebook',
    entityId: id,
    metadata: { deleted: true },
  });
}

export interface CsvRow {
  nom: string;
  reference?: string;
  description?: string;
  categorie?: string;
  unite?: string;
  prix_achat?: string;
  prix_vente?: string;
  tva?: string;
  fournisseur?: string;
}

const CATEGORY_MAP: Record<string, PriceBookCategory> = {
  materiau: 'MATERIAU',
  materiaux: 'MATERIAU',
  fourniture: 'MATERIAU',
  service: 'SERVICE',
  prestation: 'SERVICE',
  'main-oeuvre': 'MAIN_OEUVRE',
  main_oeuvre: 'MAIN_OEUVRE',
  "main d'oeuvre": 'MAIN_OEUVRE',
  pack: 'PACK',
  forfait: 'PACK',
};

/** Analyse un CSV (séparateur `,` ou `;`) sans dépendance externe. */
export function parseCsv(content: string): Record<string, string>[] {
  const text = content.replace(/\r\n/g, '\n').trim();
  if (!text) return [];
  const delimiter = (text.split('\n')[0]?.match(/;/g)?.length ?? 0) > (text.split('\n')[0]?.match(/,/g)?.length ?? 0) ? ';' : ',';

  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === delimiter) {
      current.push(field.trim());
      field = '';
    } else if (char === '\n') {
      current.push(field.trim());
      rows.push(current);
      current = [];
      field = '';
    } else field += char;
  }
  current.push(field.trim());
  rows.push(current);

  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map((key) =>
    key
      .toLowerCase()
      .normalize('NFD')
      .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, ''),
  );

  return body
    .filter((row) => row.some((cell) => cell.length > 0))
    .map((row) => Object.fromEntries(keys.map((key, index) => [key, row[index] ?? ''])));
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/** Import CSV du catalogue : mise à jour par référence, création sinon. */
export async function importPriceBookCsv(
  organizationId: string,
  userId: string,
  content: string,
): Promise<ImportResult> {
  const rows = parseCsv(content);
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (const [index, row] of rows.entries()) {
    const name = row.nom || row.name || row.designation || row.libelle;
    const saleRaw = row.prix_vente || row.prix || row.prix_vente_ht || row.sale_price;
    if (!name || !saleRaw) {
      result.skipped += 1;
      if (result.errors.length < 10) {
        result.errors.push(`Ligne ${index + 2} ignorée : nom ou prix de vente manquant.`);
      }
      continue;
    }

    const data = {
      name: name.slice(0, 160),
      description: row.description?.slice(0, 600) || null,
      category: CATEGORY_MAP[(row.categorie || row.category || '').toLowerCase()] ?? 'MATERIAU',
      unit: (row.unite || row.unit || 'u').slice(0, 16),
      costPriceCents: eurosToCents(row.prix_achat || row.cost_price || '0'),
      salePriceCents: eurosToCents(saleRaw),
      vatRate: Number((row.tva || row.vat || '20').replace(',', '.')) || 20,
      supplier: row.fournisseur?.slice(0, 120) || null,
      keywords: (row.mots_cles || '')
        .split(/[;,|]/)
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 12),
    };

    const reference = (row.reference || row.ref || '').slice(0, 64) || null;

    if (reference) {
      const existing = await prisma.priceBookItem.findFirst({
        where: { organizationId, reference },
        select: { id: true },
      });
      if (existing) {
        await prisma.priceBookItem.update({ where: { id: existing.id }, data });
        result.updated += 1;
        continue;
      }
    }

    await prisma.priceBookItem.create({ data: { ...data, reference, organizationId } });
    result.created += 1;
  }

  await recordAudit({
    action: 'pricebook.imported',
    organizationId,
    userId,
    metadata: { created: result.created, updated: result.updated, skipped: result.skipped },
  });
  return result;
}

/** Export CSV compatible avec l'import. */
export async function exportPriceBookCsv(organizationId: string): Promise<string> {
  const items = await prisma.priceBookItem.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  const header = 'reference;nom;description;categorie;unite;prix_achat;prix_vente;tva;fournisseur;mots_cles';
  const escape = (value: string | null) =>
    value == null ? '' : `"${value.replace(/"/g, '""')}"`;
  const lines = items.map((item) =>
    [
      escape(item.reference),
      escape(item.name),
      escape(item.description),
      item.category,
      escape(item.unit),
      (item.costPriceCents / 100).toFixed(2),
      (item.salePriceCents / 100).toFixed(2),
      Number(item.vatRate).toFixed(2),
      escape(item.supplier),
      escape(item.keywords.join(',')),
    ].join(';'),
  );
  return [header, ...lines].join('\n');
}
