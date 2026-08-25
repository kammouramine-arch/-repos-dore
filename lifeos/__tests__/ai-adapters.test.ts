import { generateGemini } from '@shared/ai/adapters/gemini';
import { generateOpenAIStyle } from '@shared/ai/adapters/openaiStyle';
import { codeForStatus, providerError } from '@shared/ai/adapters/shared';
import { requireKey, ADAPTERS } from '@shared/ai/adapters/index';
import { toolsForProvider, sanitizeForGemini, fromAnthropicTools } from '@shared/ai/toolTranslate';
import { DEFAULT_REGISTRY, PROVIDER_NAMES } from '@shared/ai/registry';
import { AIError } from '@shared/ai/types';
import type { AIRequest } from '@shared/ai/types';
import { anthropicTools } from '@shared/tools';

const gemini = DEFAULT_REGISTRY.providers.gemini;
const groq = DEFAULT_REGISTRY.providers.groq;
const flash = DEFAULT_REGISTRY.models.find((m) => m.modelId === 'gemini-2.5-flash')!;
const oss = DEFAULT_REGISTRY.models.find((m) => m.modelId === 'openai/gpt-oss-120b')!;

const baseRequest: AIRequest = {
  requestId: 'req-1', userId: 'u1', tier: 'pro', taskType: 'casual_chat',
  system: 'You are LifeOS.', messages: [{ role: 'user', content: 'Hello' }],
  requiredCapabilities: [], qualityRequirement: 'basic', latencyRequirement: 'normal',
  privacyRequirement: 'normal', maxCost: 1, maxOutputTokens: 500, budgetRemaining: 5,
};

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    headers: { get: (k: string) => headers[k] ?? null },
  });
}

afterEach(() => { jest.restoreAllMocks(); });

describe('tool translation', () => {
  const tools = fromAnthropicTools(anthropicTools());

  it('reuses the existing zod-generated schemas rather than redefining tools', () => {
    expect(tools.length).toBeGreaterThan(10);
    for (const t of tools) {
      expect(typeof t.name).toBe('string');
      expect((t.parameters as any).type).toBe('object');
    }
  });

  it('emits the OpenAI function shape for OpenAI, Groq and Mistral', () => {
    for (const p of ['openai', 'groq', 'mistral'] as const) {
      const out = toolsForProvider(p, tools) as any[];
      expect(out).toHaveLength(tools.length);
      expect(out[0].type).toBe('function');
      expect(out[0].function.name).toBe(tools[0].name);
      expect(out[0].function.parameters).toBeDefined();
    }
  });

  it('emits a single functionDeclarations set for Gemini', () => {
    const out = toolsForProvider('gemini', tools) as any[];
    expect(out).toHaveLength(1);
    expect(out[0].functionDeclarations).toHaveLength(tools.length);
  });

  it('strips schema keywords Gemini rejects, without losing the shape', () => {
    const dirty = {
      type: 'object',
      additionalProperties: false,
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      properties: { a: { type: 'string', const: 'x', default: 'y' } },
      required: ['a'],
    };
    const clean = sanitizeForGemini(dirty) as any;
    expect(clean.additionalProperties).toBeUndefined();
    expect(clean.$schema).toBeUndefined();
    expect(clean.properties.a.const).toBeUndefined();
    expect(clean.properties.a.default).toBeUndefined();
    expect(clean.type).toBe('object');
    expect(clean.required).toEqual(['a']);
    expect(clean.properties.a.type).toBe('string');
  });

  it('returns nothing when there are no tools', () => {
    for (const p of PROVIDER_NAMES) expect(toolsForProvider(p, [])).toEqual([]);
  });
});

describe('gemini adapter', () => {
  it('translates a text response and reports usage', async () => {
    global.fetch = mockFetch(200, {
      candidates: [{ content: { parts: [{ text: 'Hi there' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 8, cachedContentTokenCount: 40 },
      responseId: 'gem-1',
    }) as any;

    const res = await generateGemini(baseRequest, flash, gemini, 'key', 5000);
    expect(res.text).toBe('Hi there');
    expect(res.provider).toBe('gemini');
    expect(res.usage).toEqual({ inputTokens: 120, outputTokens: 8, cachedTokens: 40 });
    expect(res.finishReason).toBe('stop');
    expect(res.providerRequestId).toBe('gem-1');
  });

  it('sends the key as a header, never in the URL', async () => {
    const f = mockFetch(200, { candidates: [{ content: { parts: [] } }] });
    global.fetch = f as any;
    await generateGemini(baseRequest, flash, gemini, 'secret-key', 5000);
    const [url, init] = f.mock.calls[0];
    expect(String(url)).not.toContain('secret-key');
    expect((init as any).headers['x-goog-api-key']).toBe('secret-key');
  });

  it('extracts a tool call', async () => {
    global.fetch = mockFetch(200, {
      candidates: [{
        content: { parts: [{ functionCall: { name: 'create_task', args: { title: 'Buy milk' } } }] },
      }],
    }) as any;
    const res = await generateGemini(baseRequest, flash, gemini, 'key', 5000);
    expect(res.toolCalls).toHaveLength(1);
    expect(res.toolCalls[0].name).toBe('create_task');
    expect(res.toolCalls[0].input).toEqual({ title: 'Buy milk' });
    expect(res.finishReason).toBe('tool_use');
  });

  it('reports a safety stop as filtered rather than a normal finish', async () => {
    global.fetch = mockFetch(200, {
      candidates: [{ content: { parts: [] }, finishReason: 'SAFETY' }],
    }) as any;
    const res = await generateGemini(baseRequest, flash, gemini, 'key', 5000);
    expect(res.finishReason).toBe('filtered');
  });

  it('normalizes a 429 into a retryable rate-limit error', async () => {
    global.fetch = mockFetch(429, { error: { message: 'quota' } }) as any;
    await expect(generateGemini(baseRequest, flash, gemini, 'key', 5000)).rejects.toMatchObject({
      code: 'PROVIDER_RATE_LIMIT', retryable: true,
    });
  });
});

describe('openai-style adapter (Groq, Mistral, OpenAI)', () => {
  it('translates a text response and reports usage', async () => {
    global.fetch = mockFetch(200, {
      id: 'chatcmpl-1',
      choices: [{ message: { content: 'Hello back' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 90, completion_tokens: 5, prompt_tokens_details: { cached_tokens: 30 } },
    }) as any;
    const res = await generateOpenAIStyle(baseRequest, oss, groq, 'key', 5000);
    expect(res.text).toBe('Hello back');
    expect(res.usage).toEqual({ inputTokens: 90, outputTokens: 5, cachedTokens: 30 });
    expect(res.providerRequestId).toBe('chatcmpl-1');
  });

  it('parses tool calls from JSON string arguments', async () => {
    global.fetch = mockFetch(200, {
      choices: [{
        message: { content: null, tool_calls: [{ id: 'c1', function: { name: 'create_goal', arguments: '{"title":"Run"}' } }] },
        finish_reason: 'tool_calls',
      }],
    }) as any;
    const res = await generateOpenAIStyle(baseRequest, oss, groq, 'key', 5000);
    expect(res.toolCalls[0]).toEqual({ id: 'c1', name: 'create_goal', input: { title: 'Run' } });
    expect(res.finishReason).toBe('tool_use');
  });

  it('survives malformed tool arguments instead of crashing the turn', async () => {
    global.fetch = mockFetch(200, {
      choices: [{
        message: { tool_calls: [{ id: 'c1', function: { name: 'create_goal', arguments: '{not json' } }] },
        finish_reason: 'tool_calls',
      }],
    }) as any;
    const res = await generateOpenAIStyle(baseRequest, oss, groq, 'key', 5000);
    expect(res.toolCalls[0].input).toEqual({});
  });

  it('sends the bearer token in the Authorization header', async () => {
    const f = mockFetch(200, { choices: [{ message: { content: '' } }] });
    global.fetch = f as any;
    await generateOpenAIStyle(baseRequest, oss, groq, 'tok', 5000);
    expect((f.mock.calls[0][1] as any).headers.Authorization).toBe('Bearer tok');
  });

  it('flattens a tool round-trip into assistant tool_calls plus tool messages', async () => {
    const f = mockFetch(200, { choices: [{ message: { content: 'done' } }] });
    global.fetch = f as any;
    await generateOpenAIStyle({
      ...baseRequest,
      messages: [
        { role: 'user', content: 'add a task' },
        { role: 'assistant', content: [{ type: 'tool_call', id: 'c1', name: 'create_task', input: { title: 'X' } }] },
        { role: 'user', content: [{ type: 'tool_result', id: 'c1', name: 'create_task', result: 'ok' }] },
      ],
    }, oss, groq, 'key', 5000);
    const sent = JSON.parse((f.mock.calls[0][1] as any).body);
    expect(sent.messages[0].role).toBe('system');
    expect(sent.messages[2].tool_calls[0].id).toBe('c1');
    expect(sent.messages[3]).toEqual({ role: 'tool', tool_call_id: 'c1', content: 'ok' });
  });
});

describe('error normalization', () => {
  it('maps statuses onto product error codes', () => {
    expect(codeForStatus(401)).toBe('PROVIDER_AUTH_ERROR');
    expect(codeForStatus(403)).toBe('PROVIDER_AUTH_ERROR');
    expect(codeForStatus(404)).toBe('MODEL_UNAVAILABLE');
    expect(codeForStatus(429)).toBe('PROVIDER_RATE_LIMIT');
    expect(codeForStatus(503)).toBe('PROVIDER_OVERLOAD');
    expect(codeForStatus(400)).toBe('PROVIDER_CONFIGURATION_ERROR');
    expect(codeForStatus(500)).toBe('UNKNOWN_PROVIDER_ERROR');
  });

  it('treats auth and configuration faults as not worth retrying elsewhere', () => {
    expect(providerError('X', 401, '').retryable).toBe(false);
    expect(providerError('X', 400, '').retryable).toBe(false);
    expect(providerError('X', 429, '').retryable).toBe(true);
    expect(providerError('X', 503, '').retryable).toBe(true);
  });

  it('truncates provider prose so it cannot flood a log', () => {
    const err = providerError('X', 500, 'y'.repeat(5000));
    expect(err.message.length).toBeLessThan(500);
  });
});

describe('adapter wiring', () => {
  it('has an adapter for every provider', () => {
    for (const p of PROVIDER_NAMES) expect(typeof ADAPTERS[p]).toBe('function');
  });

  it('refuses to run without a key, naming the variable to set', () => {
    expect(() => requireKey(gemini, () => undefined)).toThrow(AIError);
    try { requireKey(gemini, () => undefined); } catch (e: any) {
      expect(e.code).toBe('PROVIDER_CONFIGURATION_ERROR');
      expect(e.message).toContain('GOOGLE_GEMINI_API_KEY');
    }
  });

  it('reads each provider key from its own environment variable', () => {
    expect(gemini.apiKeyEnvVar).toBe('GOOGLE_GEMINI_API_KEY');
    expect(groq.apiKeyEnvVar).toBe('GROQ_API_KEY');
    expect(DEFAULT_REGISTRY.providers.mistral.apiKeyEnvVar).toBe('MISTRAL_API_KEY');
    expect(DEFAULT_REGISTRY.providers.openai.apiKeyEnvVar).toBe('OPENAI_API_KEY');
  });
});
