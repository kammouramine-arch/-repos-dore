import { aiProviderKind } from '../env';
import { createAnthropicProvider } from './anthropic';
import { createTranscriptionProvider } from './transcription';
import type { AIProvider, TranscriptionProvider } from './types';

let providerCache: { value: AIProvider | null } | null = null;
let transcriptionCache: { value: TranscriptionProvider | null } | null = null;

/**
 * Fournisseur IA actif, ou null lorsqu'aucune clé n'est configurée.
 * Dans ce cas, les services basculent sur le moteur local (`heuristic.ts`).
 */
export function getAIProvider(): AIProvider | null {
  if (!providerCache) {
    providerCache = { value: aiProviderKind() === 'anthropic' ? createAnthropicProvider() : null };
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
};

export function aiCapabilities(): AICapabilities {
  const provider = getAIProvider();
  return {
    generation: provider != null,
    vision: provider != null,
    transcription: getTranscriptionProvider() != null,
  };
}

export * from './types';
export * from './schemas';
export { buildHeuristicQuoteDraft, buildTemplateFollowUp, tradeLabel } from './heuristic';
export { matchCatalog, findBestCatalogEntry, type CatalogEntry, type CatalogMatch } from './catalog-match';
export { wrapUntrusted, sanitizeUntrusted, escapeForPrompt } from './sanitize';
