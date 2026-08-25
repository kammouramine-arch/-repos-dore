/**
 * Tool translation.
 *
 * LifeOS declares each tool exactly once, as a zod schema in `tools.ts`, which is also
 * what validates the model's arguments. That JSON Schema is the single source of truth;
 * this file only re-wraps it in each provider's envelope. No tool is defined twice, and
 * a schema change cannot drift between validation and declaration.
 */

import type { AITool } from './types.ts';
import type { ProviderName } from './registry.ts';

/** OpenAI, Groq and Mistral all speak the same `{type:'function', function:{...}}` shape. */
type OpenAIStyleTool = {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

/** Gemini nests declarations under a single `functionDeclarations` entry. */
type GeminiToolset = {
  functionDeclarations: { name: string; description: string; parameters: Record<string, unknown> }[];
};

function openAIStyle(tools: AITool[]): OpenAIStyleTool[] {
  return tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

/**
 * Gemini's schema dialect rejects several JSON Schema keywords that zod emits. Passing
 * them through produces a 400 that reads like a model error, so they are stripped here
 * — the constraint is still enforced, because `validateToolInput` re-checks every
 * argument against the original zod schema before anything executes.
 */
const GEMINI_UNSUPPORTED = new Set([
  '$schema', 'additionalProperties', 'exclusiveMinimum', 'exclusiveMaximum',
  'const', 'default', 'examples', 'oneOf', 'not', 'if', 'then', 'else',
]);

export function sanitizeForGemini(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(sanitizeForGemini);
  if (schema === null || typeof schema !== 'object') return schema;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (GEMINI_UNSUPPORTED.has(key)) continue;
    out[key] = sanitizeForGemini(value);
  }
  return out;
}

function geminiStyle(tools: AITool[]): GeminiToolset[] {
  if (tools.length === 0) return [];
  return [{
    functionDeclarations: tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: sanitizeForGemini(t.parameters) as Record<string, unknown>,
    })),
  }];
}

export function toolsForProvider(provider: ProviderName, tools: AITool[]): unknown[] {
  if (tools.length === 0) return [];
  switch (provider) {
    case 'gemini':
      return geminiStyle(tools);
    case 'openai':
    case 'groq':
    case 'mistral':
      return openAIStyle(tools);
  }
}

/**
 * Bridges the existing Anthropic-shaped tool list into the neutral form, so the tool
 * catalogue keeps one definition during the migration instead of being forked.
 */
export function fromAnthropicTools(
  anthropic: { name: string; description: string; input_schema: Record<string, unknown> }[],
): AITool[] {
  return anthropic.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  }));
}
