/**
 * OpenAI, Groq and Mistral all expose an OpenAI-compatible chat completions endpoint,
 * so one adapter serves three providers. Their differences are the base URL, the model
 * ids and which optional fields they honour — all of which live in the registry.
 */

import type { AIMessage, AIRequest, AIResponse } from '../types.ts';
import type { ModelConfig, ProviderConfig } from '../registry.ts';
import { toolsForProvider } from '../toolTranslate.ts';
import { fetchJson, syntheticToolId } from './shared.ts';

function toMessages(system: string, messages: AIMessage[]): any[] {
  const out: any[] = [{ role: 'system', content: system }];
  for (const m of messages) {
    if (typeof m.content === 'string') {
      out.push({ role: m.role, content: m.content });
      continue;
    }
    // Structured blocks: an assistant turn carries tool calls, a user turn carries
    // their results. OpenAI-style APIs model results as separate `tool` messages.
    const text = m.content.filter((b) => b.type === 'text').map((b: any) => b.text).join('\n');
    const calls = m.content.filter((b) => b.type === 'tool_call') as any[];
    const results = m.content.filter((b) => b.type === 'tool_result') as any[];

    if (m.role === 'assistant' && calls.length) {
      out.push({
        role: 'assistant',
        content: text || null,
        tool_calls: calls.map((c) => ({
          id: c.id, type: 'function',
          function: { name: c.name, arguments: JSON.stringify(c.input) },
        })),
      });
    } else if (text) {
      out.push({ role: m.role, content: text });
    }

    for (const r of results) {
      out.push({ role: 'tool', tool_call_id: r.id, content: r.result });
    }
  }
  return out;
}

export async function generateOpenAIStyle(
  request: AIRequest,
  model: ModelConfig,
  provider: ProviderConfig,
  apiKey: string,
  timeoutMs: number,
): Promise<Omit<AIResponse, 'estimatedCost' | 'actualCost' | 'accountingMethod' | 'fallbackUsed' | 'fallbackReason'>> {
  const started = Date.now();
  const tools = toolsForProvider(provider.provider, request.tools ?? []);

  const body: Record<string, unknown> = {
    model: model.modelId,
    messages: toMessages(request.system, request.messages),
    max_completion_tokens: Math.min(request.maxOutputTokens, model.maxOutput || request.maxOutputTokens),
  };
  if (tools.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const { json, requestId } = await fetchJson(
    `${provider.baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    },
    timeoutMs,
    provider.label,
  );

  const choice = json?.choices?.[0];
  const message = choice?.message ?? {};
  const toolCalls = (message.tool_calls ?? []).map((c: any) => {
    let input: Record<string, unknown> = {};
    // Arguments arrive as a JSON string; a model can emit malformed JSON, and that must
    // surface as a failed tool call rather than crashing the whole turn.
    try { input = JSON.parse(c.function?.arguments ?? '{}'); } catch { input = {}; }
    return { id: c.id ?? syntheticToolId(c.function?.name ?? 'tool'), name: c.function?.name ?? '', input };
  });

  const finish = choice?.finish_reason;
  return {
    text: typeof message.content === 'string' ? message.content : '',
    toolCalls,
    structuredOutput: null,
    provider: provider.provider,
    model: model.modelId,
    usage: {
      inputTokens: json?.usage?.prompt_tokens ?? 0,
      outputTokens: json?.usage?.completion_tokens ?? 0,
      cachedTokens: json?.usage?.prompt_tokens_details?.cached_tokens ?? 0,
    },
    latencyMs: Date.now() - started,
    requestId: request.requestId,
    providerRequestId: json?.id ?? requestId ?? null,
    finishReason:
      finish === 'tool_calls' ? 'tool_use'
        : finish === 'length' ? 'length'
          : finish === 'content_filter' ? 'filtered'
            : 'stop',
  };
}
