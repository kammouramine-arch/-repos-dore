import 'server-only';
import { safeErrorCategory } from '@/lib/safe-error';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
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
import { QUOTE_DRAFT_SYSTEM, localizedSystemPrompt } from '@/lib/ai/prompts';
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
  /** Mobile/account language; falls back to the organisation locale. */
  language?: 'fr' | 'en';
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
  /**
   * Pourquoi le moteur local a pris le relais ; nul quand l'IA a répondu.
   *
   * La bascule est voulue — un artisan obtient toujours un devis — mais elle
   * effaçait jusqu'ici la cause, y compris pour qui exploite le service. Un
   * devis dégradé doit pouvoir dire de quoi il l'est.
   */
  degradedReason: string | null;
  /**
   * Jetons consommés par la génération ; nul en mode dégradé.
   *
   * Exposé pour qu'un coût par artisan puisse être calculé sur des mesures
   * réelles plutôt que sur une estimation.
   */
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    thoughtsTokens: number | null;
    totalTokens: number | null;
    latencyMs: number;
  } | null;
}

/**
 * Prépare un projet de devis à partir d'une description (et de photos).
 *
 * L'IA propose les lignes ; les prix proviennent en priorité du catalogue de
 * l'entreprise et tous les montants sont recalculés par `lib/money.ts`.
 * Rien n'est enregistré : l'utilisateur valide dans l'éditeur.
 */
export async function generateQuoteDraft(input: GenerateQuoteInput): Promise<GeneratedQuote> {
  const [profile, catalog, images, organization] = await Promise.all([
    prisma.businessProfile.findUnique({ where: { organizationId: input.organizationId } }),
    loadCatalog(input.organizationId),
    loadImages(input.organizationId, input.fileIds ?? []),
    prisma.organization.findUnique({ where: { id: input.organizationId }, select: { locale: true, country: true, currency: true } }),
  ]);

  const hourlyRateCents = profile?.defaultHourlyCents ?? 4500;
  const defaultVatRate = profile ? Number(profile.defaultVatRate) : 20;
  const vatExempt = profile?.vatStatus === 'FRANCHISE_EN_BASE';

  const provider = getAIProvider();
  const language: 'fr' | 'en' = input.language ?? (organization?.locale === 'en' ? 'en' : 'fr');

  let draft: QuoteDraft;
  let degraded = true;
  let providerName = 'local';
  let modelName: string | null = null;
  let degradedReason: string | null = provider ? null : "Aucun fournisseur d'IA configuré.";
  let usage: GeneratedQuote['usage'] = null;

  if (provider) {
    try {
      const result = await provider.generateStructuredOutput({
        system: localizedSystemPrompt(QUOTE_DRAFT_SYSTEM, { ...(organization ?? {}), locale: language }),
        context: buildBusinessContext({
          catalog,
          trade: profile?.trade ?? 'AUTRE',
          hourlyRateCents,
          defaultVatRate,
          terms: profile?.quoteTerms ?? null,
          currency: organization?.currency ?? 'EUR',
          country: organization?.country ?? 'FR',
          language,
        }),
        untrusted: wrapUntrusted(input.description, 'description_chantier'),
        images,
        schema: quoteDraftSchema,
        schemaName: 'projet_de_devis',
        maxTokens: 8192,
      });
      // Un devis sans aucune ligne n'est pas un devis. Le schéma l'autorise —
      // les tableaux ont une valeur par défaut — et un modèle rapide peut ne
      // rendre qu'un titre et un résumé. Le livrer comme un devis préparé par
      // l'IA serait pire que le mode dégradé : l'artisan verrait un total à
      // zéro, présenté comme fiable.
      if (result.data.materiaux.length === 0 && result.data.mainOeuvre.length === 0) {
        throw new AppError(
          'PROVIDER_UNAVAILABLE',
          "L'IA n'a chiffré aucune ligne : devis inexploitable.",
        );
      }
      draft = result.data;
      degraded = false;
      providerName = result.usage.provider;
      modelName = result.usage.model ?? null;
      usage = {
        inputTokens: result.usage.inputTokens ?? null,
        outputTokens: result.usage.outputTokens ?? null,
        thoughtsTokens: result.usage.thoughtsTokens ?? null,
        totalTokens: result.usage.totalTokens ?? null,
        latencyMs: result.usage.latencyMs,
      };
      await logAIRequest(input, 'QUOTE_DRAFT', result.usage.provider, result.usage.model, result.usage);
    } catch (error) {
      // Le moteur local prend le relais : l'utilisateur obtient toujours un devis.
console.error('[ai] génération LLM indisponible, bascule sur le moteur local', safeErrorCategory(error));
      degradedReason = error instanceof Error ? error.message : String(error);
      draft = buildHeuristicQuoteDraft({
        description: input.description,
        catalog,
        hourlyRateCents,
        defaultVatRate,
        trade: profile?.trade,
        language,
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
      language,
    });
    await logAIRequest(input, 'QUOTE_DRAFT', 'local', null, null);
  }

  const { lines, extraQuestions } = resolveLines({
    draft,
    catalog,
    hourlyRateCents,
    defaultVatRate,
    vatExempt,
    language,
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
    degradedReason: degraded ? degradedReason : null,
    usage: degraded ? null : usage,
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
  language: 'fr' | 'en';
}): { lines: GeneratedLine[]; extraQuestions: string[] } {
  const { draft, catalog, hourlyRateCents, defaultVatRate, vatExempt, language } = params;
  const lines: GeneratedLine[] = [];
  const extraQuestions: string[] = [];

  for (const material of draft.materiaux) {
    const entry = findBestCatalogEntry(material.designation, catalog, material.referenceCatalogue);
    const suggested = material.prixUnitaireHT != null ? eurosToCents(material.prixUnitaireHT) : null;
    const unitPriceCents = entry ? entry.salePriceCents : (suggested ?? 0);

    if (!entry && suggested == null) {
      extraQuestions.push(language === 'en' ? `What price should be applied to “${material.designation}”?` : `Quel prix appliquer pour « ${material.designation} » ?`);
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
  currency: string;
  country: string;
  language: 'fr' | 'en';
}): string {
  const taxLabel = params.country === 'FR' ? 'TVA' : params.country === 'US' ? 'sales tax' : 'VAT';
  const english = params.language === 'en';
  const catalogLines = params.catalog
    .slice(0, 120)
    .map(
      (entry) =>
        `- ${escapeForPrompt(entry.name)} | ref: ${entry.reference ?? '—'} | ${entry.category} | ${entry.unit} | ${(entry.salePriceCents / 100).toFixed(2)} ${params.currency} excl. tax | ${taxLabel} ${entry.vatRate} %`,
    )
    .join('\n');

  return [
    `${english ? 'Main trade' : 'Métier principal'} : ${params.trade}.`,
    english
      ? `Default hourly rate: ${(params.hourlyRateCents / 100).toFixed(2)} ${params.currency} excl. tax.`
      : `Taux horaire par défaut : ${(params.hourlyRateCents / 100).toFixed(2)} ${params.currency} HT.`,
    english ? `Default ${taxLabel} rate: ${params.defaultVatRate} %.` : `Taux de ${taxLabel} par défaut : ${params.defaultVatRate} %.`,
    params.terms ? `${english ? 'Usual terms' : 'Conditions habituelles'} : ${escapeForPrompt(params.terms)}` : null,
    params.catalog.length > 0
      ? (english ? `Company price book (use it first):\n${catalogLines}` : `Catalogue de prix de l'entreprise (à utiliser en priorité) :\n${catalogLines}`)
      : (english ? 'The company has no price book yet.' : "L'entreprise n'a pas encore de catalogue de prix."),
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
      console.error('[ai] photo illisible', safeErrorCategory(error));
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
