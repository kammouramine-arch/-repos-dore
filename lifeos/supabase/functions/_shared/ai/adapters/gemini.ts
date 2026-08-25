/**
 * Google Gemini. The only roster member that does not speak the OpenAI shape:
 * `contents` instead of `messages`, `parts` instead of content strings, a separate
 * `systemInstruction`, and `functionCall` / `functionResponse` parts for tools.
 */

import type { AIMessage, AIRequest, AIResponse } from '../types.ts';
import type { ModelConfig, ProviderConfig } from '../registry.ts';
import { toolsForProvider } from '../toolTranslate.ts';
import { fetchJson, syntheticToolId } from './shared.ts';

function toContents(messages: AIMessage[]): any[] {
  const out: any[] = [];
  for (const m of messages) {
    // Gemini calls the assistant "model", and tool results are a user turn.
    const role = m.role === 'assistant' ? 'model' : 'user';

    if (typeof m.content === 'string') {
      out.push({ role, parts: [{ text: m.content }] });
      continue;
    }

    const parts: any[] = [];
    for (const block of m.content) {
      if (block.type === 'text') parts.push({ text: block.text });
      else if (block.type === 'tool_call') {
        parts.push({ functionCall: { name: block.name, args: block.input } });
      } else if (block.type === 'tool_result') {
        parts.push({
          functionResponse: {
            name: block.name,
            // Gemini requires an object here; a bare string is rejected.
            response: { result: block.result, error: block.isError ?? false },
          },
        });
      }
    }
    if (parts.length) out.push({ role, parts });
  }
  return out;
}

export async function generateGemini(
  request: AIRequest,
  model: ModelConfig,
  provider: ProviderConfig,
  apiKey: string,
  timeoutMs: number,
): Promise<Omit<AIResponse, 'estimatedCost' | 'actualCost' | 'accountingMethod' | 'fallbackUsed' | 'fallbackReason'>> {
  const started = Date.now();
  const tools = toolsForProvider('gemini', request.tools ?? []);

  const body: Record<string, unknown> = {
    contents: toContents(request.messages),
    systemInstruction: { parts: [{ text: request.system }] },
    generationConfig: {
      maxOutputTokens: Math.min(request.maxOutputTokens, model.maxOutput || request.maxOutputTokens),
    },
  };
  if (tools.length) body.tools = tools;

  const { json, requestId } = await fetchJson(
    `${provider.baseUrl}/models/${encodeURIComponent(model.modelId)}:generateContent`,
    {
      method: 'POST',
      // The key goes in a header, never the query string — query strings end up in logs.
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    },
    timeoutMs,
    provider.label,
  );

  const candidate = json?.candidates?.[0];
  const parts: any[] = candidate?.content?.parts ?? [];

  const text = parts.filter((p) => typeof p?.text === 'string').map((p) => p.text).join('');
  const toolCalls = parts
    .filter((p) => p?.functionCall)
    .map((p) => ({
      id: syntheticToolId(p.functionCall.name ?? 'tool'),
      name: p.functionCall.name ?? '',
      input: (p.functionCall.args ?? {}) as Record<string, unknown>,
    }));

  const reason = candidate?.finishReason;
  return {
    text,
    toolCalls,
    structuredOutput: null,
    provider: 'gemini',
    model: model.modelId,
    usage: {
      inputTokens: json?.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: json?.usageMetadata?.candidatesTokenCount ?? 0,
      cachedTokens: json?.usageMetadata?.cachedContentTokenCount ?? 0,
    },
    latencyMs: Date.now() - started,
    requestId: request.requestId,
    providerRequestId: json?.responseId ?? requestId ?? null,
    finishReason:
      toolCalls.length > 0 ? 'tool_use'
        : reason === 'MAX_TOKENS' ? 'length'
          : reason === 'SAFETY' || reason === 'PROHIBITED_CONTENT' ? 'filtered'
            : 'stop',
  };
}
