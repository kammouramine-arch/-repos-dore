import 'server-only';
import { prisma } from '@/lib/prisma';
import {
  buildHeuristicQuoteDraft,
  findBestCatalogEntry,
  getAIProvider,
  quoteDraftSchema,
  wrapUntrusted,
  escapeForPrompt,
  type CatalogEntry,
  type QuoteDraft,
} from '@/lib/ai';
import { QUOTE_DRAFT_SYSTEM } from '@/lib/ai/prompts';
import { eurosToCents } from '@/lib/money';
import { getStorageProvider } from '@/lib/storage';
import { loadCatalog } from './priceBookService';
import { totalsFor, type QuoteLineInput } from './quoteService';
import { incrementUsage } from './usageService';
import { trackEvent } from './analyticsService';

export interface GenerateQuoteInput {
  organizationId: string;
  userId: string;
  description: string;
  /** Identifiants de fichiers déjà téléversés (photos de chantier). */
  fileIds?: string[];
  leadId?: string | null;
}

export interface GeneratedLine extends QuoteLineInput {
  /** Vrai lorsque le prix provient du catalogue de l'entreprise. */
  fromCatalog: boolean;
}

export interface GeneratedQuote {
  title: string;
  summary: string;
  workDescription: string[];
  lines: GeneratedLine[];
  questions: string[];
  warnings: string[];
  /** Ce qui a été réellement constaté (description, photos). */
  observations: string[];
  /** Ce qui a été supposé et reste à confirmer par l'artisan. */
  assumptions: string[];
  confidence: number;
  estimatedDurationMin: number | null;
  totals: ReturnType<typeof totalsFor>;
  degraded: boolean;
  provider: string;
  /** Modèle qui a réellement rédigé le devis ; nul en mode dégradé. */
  model: string | null;
}

/**
 * Prépare un projet de devis à partir d'une description (et de photos).
 *
 * L'IA propose les lignes ; les prix proviennent en priorité du catalogue de
 * l'entreprise et tous les montants sont recalculés par `lib/money.ts`.
 * Rien n'est enregistré : l'utilisateur valide dans l'éditeur.
 */
export async function generateQuoteDraft(input: GenerateQuoteInput): Promise<GeneratedQuote> {
  const [profile, catalog] = await Promise.all([
    prisma.businessProfile.findUnique({ where: { organizationId: input.organizationId } }),
    loadCatalog(input.organizationId),
  ]);

  const hourlyRateCents = profile?.defaultHourlyCents ?? 4500;
  const defaultVatRate = profile ? Number(profile.defaultVatRate) : 20;
  const vatExempt = profile?.vatStatus === 'FRANCHISE_EN_BASE';

  const images = await loadImages(input.organizationId, input.fileIds ?? []);
  const provider = getAIProvider();

  let draft: QuoteDraft;
  let degraded = true;
  let providerName = 'local';
  let modelName: string | null = null;

  if (provider) {
    try {
      const result = await provider.generateStructuredOutput({
        system: QUOTE_DRAFT_SYSTEM,
        context: buildBusinessContext({
          catalog,
          trade: profile?.trade ?? 'AUTRE',
          hourlyRateCents,
          defaultVatRate,
          terms: profile?.quoteTerms ?? null,
        }),
        untrusted: wrapUntrusted(input.description, 'description_chantier'),
        images,
        schema: quoteDraftSchema,
        schemaName: 'projet_de_devis',
        maxTokens: 4096,
      });
      draft = result.data;
      degraded = false;
      providerName = result.usage.provider;
      modelName = result.usage.model ?? null;
      await logAIRequest(input, 'QUOTE_DRAFT', result.usage.provider, result.usage.model, result.usage);
    } catch (error) {
      // Le moteur local prend le relais : l'utilisateur obtient toujours un devis.
      console.error('[ai] génération LLM indisponible, bascule sur le moteur local', error);
      draft = buildHeuristicQuoteDraft({
        description: input.description,
        catalog,
        hourlyRateCents,
        defaultVatRate,
        trade: profile?.trade,
      });
      await logAIRequest(input, 'QUOTE_DRAFT', 'local', null, null, 'fallback');
    }
  } else {
    draft = buildHeuristicQuoteDraft({
      description: input.description,
      catalog,
      hourlyRateCents,
      defaultVatRate,
      trade: profile?.trade,
    });
    await logAIRequest(input, 'QUOTE_DRAFT', 'local', null, null);
  }

  const { lines, extraQuestions } = resolveLines({
    draft,
    catalog,
    hourlyRateCents,
    defaultVatRate,
    vatExempt,
  });

  const totals = totalsFor({ items: lines, vatExempt });

  await incrementUsage(input.organizationId, 'AI_GENERATION');
  await trackEvent('ai_generation', {
    organizationId: input.organizationId,
    userId: input.userId,
    properties: { degraded, lines: lines.length },
  });

  return {
    title: draft.titre,
    summary: draft.resume,
    workDescription: draft.descriptionTravaux,
    lines,
    questions: [...draft.questions, ...extraQuestions].slice(0, 8),
    warnings: draft.alertes,
    observations: draft.observations,
    assumptions: draft.hypotheses,
    confidence: Math.round(draft.confiance),
    estimatedDurationMin: draft.dureeEstimeeMinutes ?? null,
    totals,
    degraded,
    provider: providerName,
    model: modelName,
  };
}

/**
 * Traduit les lignes proposées par l'IA en lignes de devis chiffrées.
 * Priorité absolue au catalogue de l'entreprise sur les prix suggérés.
 */
function resolveLines(params: {
  draft: QuoteDraft;
  catalog: CatalogEntry[];
  hourlyRateCents: number;
  defaultVatRate: number;
  vatExempt: boolean;
}): { lines: GeneratedLine[]; extraQuestions: string[] } {
  const { draft, catalog, hourlyRateCents, defaultVatRate, vatExempt } = params;
  const lines: GeneratedLine[] = [];
  const extraQuestions: string[] = [];

  for (const material of draft.materiaux) {
    const entry = findBestCatalogEntry(material.designation, catalog, material.referenceCatalogue);
    const suggested = material.prixUnitaireHT != null ? eurosToCents(material.prixUnitaireHT) : null;
    const unitPriceCents = entry ? entry.salePriceCents : (suggested ?? 0);

    if (!entry && suggested == null) {
      extraQuestions.push(`Quel prix appliquer pour « ${material.designation} » ?`);
    }

    lines.push({
      kind: 'MATERIAU',
      label: entry?.name ?? material.designation,
      description: material.description ?? entry?.description ?? null,
      unit: entry?.unit ?? material.unite ?? 'u',
      quantity: material.quantite,
      unitPriceCents,
      costPriceCents: entry?.costPriceCents ?? null,
      discountRate: 0,
      vatRate: vatExempt ? 0 : (entry?.vatRate ?? material.tauxTVA ?? defaultVatRate),
      priceBookItemId: entry?.id ?? null,
      fromCatalog: entry != null,
    });
  }

  for (const labour of draft.mainOeuvre) {
    const entry = findBestCatalogEntry(labour.designation, catalog, labour.referenceCatalogue);
    const suggested = labour.tauxHoraire != null ? eurosToCents(labour.tauxHoraire) : null;
    const unitPriceCents = entry ? entry.salePriceCents : (suggested ?? hourlyRateCents);

    lines.push({
      kind: 'MAIN_OEUVRE',
      label: entry?.name ?? labour.designation,
      description: labour.description ?? entry?.description ?? null,
      unit: entry?.unit ?? 'h',
      quantity: labour.heures,
      unitPriceCents,
      costPriceCents: entry?.costPriceCents ?? null,
      discountRate: 0,
      vatRate: vatExempt ? 0 : (entry?.vatRate ?? defaultVatRate),
      priceBookItemId: entry?.id ?? null,
      fromCatalog: entry != null,
    });
  }

  return { lines, extraQuestions: [...new Set(extraQuestions)] };
}

/** Contexte de confiance transmis au LLM : catalogue et paramètres de l'entreprise. */
function buildBusinessContext(params: {
  catalog: CatalogEntry[];
  trade: string;
  hourlyRateCents: number;
  defaultVatRate: number;
  terms: string | null;
}): string {
  const catalogLines = params.catalog
    .slice(0, 120)
    .map(
      (entry) =>
        `- ${escapeForPrompt(entry.name)} | ref: ${entry.reference ?? '—'} | ${entry.category} | ${entry.unit} | ${(entry.salePriceCents / 100).toFixed(2)} EUR HT | TVA ${entry.vatRate} %`,
    )
    .join('\n');

  return [
    `Métier principal : ${params.trade}.`,
    `Taux horaire par défaut : ${(params.hourlyRateCents / 100).toFixed(2)} EUR HT.`,
    `Taux de TVA par défaut : ${params.defaultVatRate} %.`,
    params.terms ? `Conditions habituelles : ${escapeForPrompt(params.terms)}` : null,
    params.catalog.length > 0
      ? `Catalogue de prix de l'entreprise (à utiliser en priorité) :\n${catalogLines}`
      : "L'entreprise n'a pas encore de catalogue de prix.",
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function loadImages(organizationId: string, fileIds: string[]) {
  if (fileIds.length === 0) return undefined;
  const files = await prisma.file.findMany({
    where: { id: { in: fileIds.slice(0, 6) }, organizationId, deletedAt: null },
  });
  if (files.length === 0) return undefined;

  const storage = getStorageProvider();
  const images = [];
  for (const file of files) {
    if (!file.mimeType.startsWith('image/')) continue;
    try {
      const buffer = await storage.get(file.storageKey);
      images.push({
        base64: buffer.toString('base64'),
        mimeType: file.mimeType,
        fileName: file.fileName,
      });
    } catch (error) {
      console.error('[ai] photo illisible', error);
    }
  }
  return images.length > 0 ? images : undefined;
}

async function logAIRequest(
  input: GenerateQuoteInput,
  kind: 'QUOTE_DRAFT' | 'TRANSCRIPTION' | 'IMAGE_ANALYSIS' | 'MESSAGE_DRAFT' | 'ASSISTANT',
  provider: string,
  model?: string | null,
  usage?: { latencyMs: number; inputTokens?: number; outputTokens?: number } | null,
  note?: string,
) {
  await prisma.aIRequest
    .create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        kind,
        provider,
        model: model ?? null,
        status: 'OK',
        latencyMs: usage?.latencyMs ?? null,
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        error: note ?? null,
      },
    })
    .catch(() => undefined);
}
