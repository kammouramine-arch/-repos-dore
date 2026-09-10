import { aiProviderKind } from '../env';
import { createAnthropicProvider } from './anthropic';
import { createGeminiProvider } from './gemini';
import { createTranscriptionProvider } from './transcription';
import type { AIProvider, AIProviderName, TranscriptionProvider } from './types';

let providerCache: { value: AIProvider | null } | null = null;
let transcriptionCache: { value: TranscriptionProvider | null } | null = null;

/**
 * Fournisseur IA actif, ou null lorsqu'aucune clé n'est configurée.
 * Dans ce cas, les services basculent sur le moteur local (`heuristic.ts`).
 */
export function getAIProvider(): AIProvider | null {
  if (!providerCache) {
    const kind = aiProviderKind();
    providerCache = {
      value:
        kind === 'gemini'
          ? createGeminiProvider()
          : kind === 'anthropic'
            ? createAnthropicProvider()
            : null,
    };
  }
  return providerCache.value;
}

export function getTranscriptionProvider(): TranscriptionProvider | null {
  if (!transcriptionCache) {
    transcriptionCache = { value: createTranscriptionProvider() };
  }
  return transcriptionCache.value;
}

/** Réinitialise les caches (tests). */
export function resetAIProviders() {
  providerCache = null;
  transcriptionCache = null;
}

export type AICapabilities = {
  generation: boolean;
  vision: boolean;
  transcription: boolean;
  /**
   * Fournisseur réellement retenu au démarrage.
   *
   * `generation: true` dit seulement qu'une clé est configurée, pas laquelle
   * ni si elle répond. Sans ce champ, une production qui bascule en silence
   * sur le moteur local est indiscernable d'une production qui n'a pas encore
   * reçu le déploiement — on l'a constaté deux fois. Le nom du fournisseur ne
   * révèle rien de secret et lève l'ambiguïté immédiatement.
   */
  provider: AIProviderName | 'local';
};

export function aiCapabilities(): AICapabilities {
  const provider = getAIProvider();
  return {
    generation: provider != null,
    vision: provider != null,
    transcription: getTranscriptionProvider() != null,
    provider: provider?.name ?? 'local',
  };
}

export * from './types';
export * from './schemas';
export { buildHeuristicQuoteDraft, buildTemplateFollowUp, tradeLabel } from './heuristic';
export { GeminiProvider, createGeminiProvider, toGeminiSchema } from './gemini';
export { matchCatalog, findBestCatalogEntry, type CatalogEntry, type CatalogMatch } from './catalog-match';
export { wrapUntrusted, sanitizeUntrusted, escapeForPrompt } from './sanitize';
