/**
 * Rapprochement entre un texte de chantier et le catalogue de prix de l'entreprise.
 *
 * Utilisé dans les deux sens :
 *  - moteur local : construire un projet de devis sans LLM ;
 *  - moteur IA : retrouver l'article exact correspondant à une ligne proposée,
 *    afin que le prix appliqué soit toujours celui configuré par l'entreprise.
 */
import { overlapScore, uniqueTokens, extractQuantities } from './text';

export interface CatalogEntry {
  id: string;
  reference: string | null;
  name: string;
  description: string | null;
  category: 'MATERIAU' | 'SERVICE' | 'MAIN_OEUVRE' | 'PACK';
  unit: string;
  costPriceCents: number;
  salePriceCents: number;
  vatRate: number;
  keywords: string[];
}

export interface CatalogMatch {
  entry: CatalogEntry;
  score: number;
  /** Quantité déduite du texte lorsqu'elle est explicite. */
  quantity: number;
  quantityExplicit: boolean;
}

const MIN_SCORE = 0.34;

function searchableText(entry: CatalogEntry): string {
  return [entry.name, entry.description ?? '', entry.keywords.join(' ')].join(' ');
}

/** Meilleurs articles du catalogue correspondant à un texte libre. */
export function matchCatalog(
  query: string,
  catalog: CatalogEntry[],
  options: { limit?: number; minScore?: number } = {},
): CatalogMatch[] {
  const tokens = uniqueTokens(query);
  if (tokens.size === 0) return [];
  const quantities = extractQuantities(query);
  const minScore = options.minScore ?? MIN_SCORE;

  const scored = catalog
    .map((entry) => {
      const score = overlapScore(tokens, searchableText(entry));
      const quantity = quantityFor(entry, quantities);
      return {
        entry,
        score,
        quantity: quantity ?? 1,
        quantityExplicit: quantity != null,
      };
    })
    .filter((match) => match.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, options.limit ?? 8);
}

/** Article unique correspondant le mieux à une désignation (rapprochement d'une ligne IA). */
export function findBestCatalogEntry(
  label: string,
  catalog: CatalogEntry[],
  reference?: string | null,
): CatalogEntry | null {
  if (reference) {
    const exact = catalog.find(
      (entry) => entry.reference && entry.reference.toLowerCase() === reference.toLowerCase(),
    );
    if (exact) return exact;
  }
  const matches = matchCatalog(label, catalog, { limit: 1, minScore: 0.42 });
  return matches[0]?.entry ?? null;
}

function quantityFor(
  entry: CatalogEntry,
  quantities: ReturnType<typeof extractQuantities>,
): number | null {
  if (quantities.length === 0) return null;
  const entryTokens = uniqueTokens(entry.name);
  for (const quantity of quantities) {
    const subjectTokens = uniqueTokens(quantity.subject);
    for (const token of subjectTokens) {
      if (entryTokens.has(token)) return quantity.value;
    }
  }
  return null;
}
