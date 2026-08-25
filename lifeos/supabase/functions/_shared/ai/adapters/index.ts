/**
 * The only place in LifeOS that knows a provider exists.
 *
 * Everything above this boundary speaks AIRequest and AIResponse; everything below is
 * one vendor's wire format. Adding a fifth provider means adding a file here and a row
 * in the registry — nothing else in the product changes.
 */

import type { AIRequest, AIResponse } from '../types.ts';
import { AIError } from '../types.ts';
import type { ModelConfig, ProviderConfig, ProviderName } from '../registry.ts';
import { generateGemini } from './gemini.ts';
import { generateOpenAIStyle } from './openaiStyle.ts';

export type AdapterResult = Omit<
  AIResponse,
  'estimatedCost' | 'actualCost' | 'accountingMethod' | 'fallbackUsed' | 'fallbackReason'
>;

export type Adapter = (
  request: AIRequest,
  model: ModelConfig,
  provider: ProviderConfig,
  apiKey: string,
  timeoutMs: number,
) => Promise<AdapterResult>;

export const ADAPTERS: Record<ProviderName, Adapter> = {
  gemini: generateGemini,
  openai: generateOpenAIStyle,
  groq: generateOpenAIStyle,
  mistral: generateOpenAIStyle,
};

/** Reads a provider's key from the environment. Keys never leave the server. */
export type KeyReader = (envVar: string) => string | undefined;

export function requireKey(provider: ProviderConfig, readKey: KeyReader): string {
  const key = readKey(provider.apiKeyEnvVar);
  if (!key) {
    throw new AIError(
      'PROVIDER_CONFIGURATION_ERROR',
      `${provider.apiKeyEnvVar} is not set, so ${provider.label} cannot be used.`,
    );
  }
  return key;
}
