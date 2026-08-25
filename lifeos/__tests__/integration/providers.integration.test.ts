/**
 * Real provider calls. Opt-in, never part of normal CI.
 *
 * These run only when the corresponding key is present in the environment, and they are
 * the ONLY tests in this repository that prove a provider actually works. A mocked test
 * proves our translation is right; it proves nothing about the provider being reachable,
 * the model id being current, or the price being what the registry claims.
 *
 *   GOOGLE_GEMINI_API_KEY=... npx jest integration
 *
 * Skipped tests report as skipped. They are never counted as passes.
 */

import { runAI } from '@shared/ai/index';
import { DEFAULT_REGISTRY, mergeRegistry, type ProviderName } from '@shared/ai/registry';
import { fromAnthropicTools } from '@shared/ai/toolTranslate';
import type { AIRequest } from '@shared/ai/types';
import { anthropicTools } from '@shared/tools';
import { transcribeOpenAIStyle } from '@shared/ai/adapters/audio';

const TIMEOUT = 60_000;

/** Only these three are launch providers. OpenAI is never required. */
const PROVIDERS: ProviderName[] = ['gemini', 'groq', 'mistral'];

function keyFor(provider: ProviderName): string | undefined {
  return process.env[DEFAULT_REGISTRY.providers[provider].apiKeyEnvVar];
}

/** Isolates one provider so the router cannot answer with a different one. */
function onlyProvider(provider: ProviderName) {
  const patch: any = { providers: {} };
  for (const p of Object.keys(DEFAULT_REGISTRY.providers) as ProviderName[]) {
    patch.providers[p] = { enabled: p === provider };
  }
  return mergeRegistry(DEFAULT_REGISTRY, patch);
}

function baseRequest(over: Partial<AIRequest> = {}): AIRequest {
  return {
    requestId: `it-${Date.now()}`,
    userId: 'integration',
    tier: 'ultra',
    taskType: 'casual_chat',
    // Deliberately trivial: no user context ever reaches a provider from a test.
    system: 'You are a terse assistant. Answer in under 10 words.',
    messages: [{ role: 'user', content: 'Say the word ready and nothing else.' }],
    requiredCapabilities: [],
    qualityRequirement: 'basic',
    latencyRequirement: 'normal',
    privacyRequirement: 'normal',
    maxCost: 0.05,
    maxOutputTokens: 64,
    budgetRemaining: 0.05,
    metadata: { estimatedInputTokens: 40 },
    ...over,
  };
}

for (const provider of PROVIDERS) {
  const key = keyFor(provider);
  const envVar = DEFAULT_REGISTRY.providers[provider].apiKeyEnvVar;
  const describeOrSkip = key ? describe : describe.skip;

  describeOrSkip(`${provider} (real API — set ${envVar} to run)`, () => {
    const options = {
      registry: onlyProvider(provider),
      health: {},
      readKey: (name: string) => process.env[name],
      // Pricing verification is bypassed here on purpose: the point of these tests is to
      // gather the facts that verification needs, so requiring it first is circular.
      requireVerifiedPricing: false,
      allowPrepaidProviders: provider === 'openai',
      maxAttempts: 1,
    };

    it('returns a normalized response', async () => {
      const res = await runAI(baseRequest(), options as any);
      expect(res.provider).toBe(provider);
      expect(typeof res.text).toBe('string');
      expect(res.text.length).toBeGreaterThan(0);
      expect(res.finishReason).toBeDefined();
      console.log(`[${provider}] model=${res.model} text="${res.text.slice(0, 40)}"`);
    }, TIMEOUT);

    it('reports token usage, so cost can be metered rather than estimated', async () => {
      const res = await runAI(baseRequest(), options as any);
      expect(res.usage.inputTokens).toBeGreaterThan(0);
      expect(res.usage.outputTokens).toBeGreaterThan(0);
      expect(res.accountingMethod).toBe('metered');
      expect(res.actualCost).toBeGreaterThan(0);
      console.log(
        `[${provider}] in=${res.usage.inputTokens} out=${res.usage.outputTokens} cost=$${res.actualCost.toFixed(6)}`,
      );
    }, TIMEOUT);

    it('calls a tool when the task needs one', async () => {
      const tools = fromAnthropicTools(anthropicTools()).filter((t) => t.name === 'create_task');
      const res = await runAI(
        baseRequest({
          messages: [{ role: 'user', content: 'Create a task called "Buy milk" for today. Use the tool.' }],
          tools,
          requiredCapabilities: ['tools'],
          maxOutputTokens: 256,
        }),
        options as any,
      );
      expect(res.toolCalls.length).toBeGreaterThan(0);
      expect(res.toolCalls[0].name).toBe('create_task');
      expect(typeof res.toolCalls[0].input).toBe('object');
      console.log(`[${provider}] tool=${res.toolCalls[0].name} input=${JSON.stringify(res.toolCalls[0].input)}`);
    }, TIMEOUT);

    it('normalizes an authentication failure rather than leaking the provider error', async () => {
      await expect(
        runAI(baseRequest(), { ...options, readKey: () => 'obviously-invalid-key' } as any),
      ).rejects.toMatchObject({ code: expect.stringMatching(/PROVIDER_AUTH_ERROR|PROVIDER_CONFIGURATION_ERROR/) });
    }, TIMEOUT);
  });
}

/**
 * Routing, fallback and cost accounting across whichever providers are configured.
 * These need at least two keys to mean anything, and say so when they cannot run.
 */
describe('router behaviour across real providers', () => {
  const configured = PROVIDERS.filter((p) => keyFor(p));
  const multi = configured.length >= 2 ? describe : describe.skip;

  multi('with two or more providers configured', () => {
    const options = {
      registry: DEFAULT_REGISTRY,
      health: {},
      readKey: (name: string) => process.env[name],
      requireVerifiedPricing: true,
      maxAttempts: 3,
    };

    it('picks a cheap model for a simple task', async () => {
      const res = await runAI(baseRequest(), options as any);
      expect(res.actualCost).toBeLessThan(0.01);
      console.log(`[routing] simple task -> ${res.provider}:${res.model} $${res.actualCost.toFixed(6)}`);
    }, TIMEOUT);

    it('picks a stronger model when the task demands quality', async () => {
      const res = await runAI(
        baseRequest({
          taskType: 'deep_analysis',
          qualityRequirement: 'advanced',
          privacyRequirement: 'highly_sensitive',
          latencyRequirement: 'batch',
        }),
        options as any,
      );
      expect(['advanced', 'frontier']).toContain(
        DEFAULT_REGISTRY.models.find((m) => m.modelId === res.model)?.qualityClass,
      );
      console.log(`[routing] deep analysis -> ${res.provider}:${res.model}`);
    }, TIMEOUT);

    it('falls back to a second provider when the first is unreachable', async () => {
      // A deliberately broken base URL for the top candidate forces a real failover.
      const broken = mergeRegistry(DEFAULT_REGISTRY, {
        providers: { gemini: { baseUrl: 'https://generativelanguage.googleapis.com/does-not-exist' } } as any,
      });
      const res = await runAI(baseRequest(), { ...options, registry: broken } as any);
      expect(res.fallbackUsed).toBe(true);
      expect(res.fallbackReason).toBeTruthy();
      console.log(`[fallback] recovered on ${res.provider}:${res.model} after ${res.fallbackReason}`);
    }, TIMEOUT);

    it('records a cost for every attempt, including the failed one', async () => {
      const broken = mergeRegistry(DEFAULT_REGISTRY, {
        providers: { gemini: { baseUrl: 'https://generativelanguage.googleapis.com/does-not-exist' } } as any,
      });
      const records: any[] = [];
      await runAI(baseRequest(), {
        ...options, registry: broken, onAttempt: (r: any) => records.push(r),
      } as any);
      expect(records.length).toBeGreaterThan(1);
      expect(records[0].success).toBe(false);
      expect(records[0].actualCost).toBe(0);
      expect(records[records.length - 1].actualCost).toBeGreaterThan(0);
    }, TIMEOUT);
  });
});

describe('transcription against a real provider', () => {
  const audioProviders: ProviderName[] = ['groq', 'mistral'];
  for (const provider of audioProviders) {
    const key = keyFor(provider);
    const run = key ? it : it.skip;
    run(`${provider} transcribes a short clip`, async () => {
      // A one-second silent WAV, generated here so no fixture and no real speech is
      // ever sent to a provider from a test.
      const sampleRate = 8000;
      const samples = sampleRate;
      const buffer = new ArrayBuffer(44 + samples * 2);
      const view = new DataView(buffer);
      const ascii = (off: number, str: string) => {
        for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
      };
      ascii(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true); ascii(8, 'WAVE');
      ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
      view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
      view.setUint16(34, 16, true); ascii(36, 'data'); view.setUint32(40, samples * 2, true);

      const file = new File([buffer], 'silence.wav', { type: 'audio/wav' });
      const model = DEFAULT_REGISTRY.models.find(
        (m) => m.provider === provider && m.capabilities.includes('audio'),
      )!;
      const result = await transcribeOpenAIStyle(
        { requestId: 'it-audio', file, durationSeconds: 1 },
        model,
        DEFAULT_REGISTRY.providers[provider],
        key!,
        TIMEOUT,
      );
      expect(typeof result.text).toBe('string');
      expect(result.durationSeconds).toBeGreaterThan(0);
      console.log(`[${provider}] transcript="${result.text.slice(0, 40)}" duration=${result.durationSeconds}s`);
    }, TIMEOUT);
  }
});

describe('integration harness', () => {
  it('never requires an OpenAI key', () => {
    expect(PROVIDERS).not.toContain('openai');
  });

  it('reports which providers were exercised', () => {
    const configured = PROVIDERS.filter((p) => keyFor(p));
    const missing = PROVIDERS.filter((p) => !keyFor(p));
    console.log(`configured: ${configured.join(', ') || 'none'}`);
    console.log(`NOT CONFIGURED: ${missing.join(', ') || 'none'}`);
    // A provider with no key is NOT CONFIGURED, which is neither a pass nor a failure.
    expect(configured.length + missing.length).toBe(PROVIDERS.length);
  });
});
