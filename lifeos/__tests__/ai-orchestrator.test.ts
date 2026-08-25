import { runAI, describeRegistry, type AttemptRecord } from '@shared/ai/index';
import { DEFAULT_REGISTRY, mergeRegistry } from '@shared/ai/registry';
import { AIError } from '@shared/ai/types';
import type { AIRequest } from '@shared/ai/types';
import type { HealthRecord } from '@shared/ai/health';

const request: AIRequest = {
  requestId: 'req-1', userId: 'u1', tier: 'pro', taskType: 'casual_chat',
  system: 'sys', messages: [{ role: 'user', content: 'hi' }],
  requiredCapabilities: [], qualityRequirement: 'basic', latencyRequirement: 'normal',
  privacyRequirement: 'normal', maxCost: 1, maxOutputTokens: 500, budgetRemaining: 5,
  metadata: { estimatedInputTokens: 1000 },
};

function ok(body: unknown) {
  return { ok: true, status: 200, text: async () => JSON.stringify(body), headers: { get: () => null } };
}
function err(status: number) {
  return { ok: false, status, text: async () => '{"error":"x"}', headers: { get: () => null } };
}

/*
  One body carrying both wire formats. These are orchestrator tests, not routing tests:
  which provider the router picks is covered in ai-router.test.ts, and pinning a shape
  here would make every test break whenever routing policy changes.
*/
const anyProviderOk = ok({
  candidates: [{ content: { parts: [{ text: 'answer' }] }, finishReason: 'STOP' }],
  usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 100, cachedContentTokenCount: 0 },
  choices: [{ message: { content: 'answer' }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 1000, completion_tokens: 100 },
});
const geminiOk = anyProviderOk;
const openaiStyleOk = anyProviderOk;

function opts(over: Partial<Parameters<typeof runAI>[1]> = {}) {
  const health: Record<string, HealthRecord> = {};
  return {
    registry: DEFAULT_REGISTRY,
    health,
    readKey: () => 'test-key',
    now: () => 1_000_000,
    // Orchestration is tested against the whole registry; the production pricing gate
    // has its own tests in ai-router.test.ts.
    requireVerifiedPricing: false,
    ...over,
  };
}

afterEach(() => { jest.restoreAllMocks(); });

describe('runAI', () => {
  it('returns a normalized response that never names a provider SDK', async () => {
    global.fetch = jest.fn().mockResolvedValue(geminiOk) as any;
    const res = await runAI(request, opts());
    expect(res.text).toBe('answer');
    expect(res.provider).toBeDefined();
    expect(res.accountingMethod).toBe('metered');
    expect(res.actualCost).toBeGreaterThan(0);
    expect(res.fallbackUsed).toBe(false);
  });

  it('records every attempt for accounting', async () => {
    global.fetch = jest.fn().mockResolvedValue(geminiOk) as any;
    const records: AttemptRecord[] = [];
    await runAI(request, opts({ onAttempt: (r) => { records.push(r); } }));
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      requestId: 'req-1', userId: 'u1', tier: 'pro', taskType: 'casual_chat', success: true,
    });
    expect(records[0].actualCost).toBeGreaterThan(0);
    expect(records[0].inputTokens).toBe(1000);
  });

  it('falls back to the next candidate when the first is rate limited', async () => {
    let call = 0;
    global.fetch = jest.fn().mockImplementation(async () => {
      call += 1;
      return call === 1 ? err(429) : geminiOk;
    }) as any;

    const records: AttemptRecord[] = [];
    const res = await runAI(request, opts({ onAttempt: (r) => { records.push(r); } }));
    expect(res.fallbackUsed).toBe(true);
    expect(res.fallbackReason).toBe('PROVIDER_RATE_LIMIT');
    expect(records).toHaveLength(2);
    expect(records[0].success).toBe(false);
    expect(records[1].success).toBe(true);
  });

  it('charges nothing for a failed attempt', async () => {
    let call = 0;
    global.fetch = jest.fn().mockImplementation(async () => {
      call += 1;
      return call === 1 ? err(503) : geminiOk;
    }) as any;
    const records: AttemptRecord[] = [];
    await runAI(request, opts({ onAttempt: (r) => { records.push(r); } }));
    expect(records[0].success).toBe(false);
    expect(records[0].actualCost).toBe(0);
  });

  it('does not try another model after a non-retryable error', async () => {
    const f = jest.fn().mockResolvedValue(err(400));
    global.fetch = f as any;
    await expect(runAI(request, opts())).rejects.toMatchObject({
      code: 'PROVIDER_CONFIGURATION_ERROR',
    });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('stops after an auth failure rather than burning every provider', async () => {
    const f = jest.fn().mockResolvedValue(err(401));
    global.fetch = f as any;
    await expect(runAI(request, opts())).rejects.toMatchObject({ code: 'PROVIDER_AUTH_ERROR' });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('records failures against provider health', async () => {
    global.fetch = jest.fn().mockResolvedValue(err(503)) as any;
    const options = opts({ maxAttempts: 2 });
    await expect(runAI(request, options)).rejects.toThrow();
    const failed = Object.values(options.health).filter((h) => h.failures > 0);
    expect(failed.length).toBeGreaterThan(0);
  });

  it('clears consecutive failures after a success', async () => {
    let call = 0;
    global.fetch = jest.fn().mockImplementation(async () => {
      call += 1;
      return call === 1 ? err(503) : geminiOk;
    }) as any;
    const options = opts();
    await runAI(request, options);
    const healthy = Object.values(options.health).filter((h) => h.successes > 0);
    expect(healthy[0].consecutiveFailures).toBe(0);
    expect(healthy[0].state).toBe('closed');
  });

  it('refuses when no provider key is configured, without calling out', async () => {
    const f = jest.fn();
    global.fetch = f as any;
    await expect(runAI(request, opts({ readKey: () => undefined }))).rejects.toMatchObject({
      code: 'PROVIDER_CONFIGURATION_ERROR',
    });
    expect(f).not.toHaveBeenCalled();
  });

  it('surfaces a routing refusal as a product error, not a provider error', async () => {
    global.fetch = jest.fn() as any;
    await expect(runAI({ ...request, budgetRemaining: 0 }, opts())).rejects.toMatchObject({
      code: 'BUDGET_EXCEEDED',
    });
  });

  it('honours maxAttempts of 1 by disabling fallback', async () => {
    const f = jest.fn().mockResolvedValue(err(429));
    global.fetch = f as any;
    await expect(runAI(request, opts({ maxAttempts: 1 }))).rejects.toMatchObject({
      code: 'PROVIDER_RATE_LIMIT',
    });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('routes an OpenAI-style provider through the same entry point', async () => {
    global.fetch = jest.fn().mockResolvedValue(openaiStyleOk) as any;
    const registry = mergeRegistry(DEFAULT_REGISTRY, {
      providers: { gemini: { enabled: false }, mistral: { enabled: false } } as any,
    });
    const res = await runAI(request, opts({ registry }));
    expect(res.provider).toBe('groq');
    expect(res.text).toBe('answer');
  });
});

describe('registry diagnostics', () => {
  it('reports what is on, what is off and what is unverified', () => {
    const d = describeRegistry(DEFAULT_REGISTRY);
    expect(d.providersEnabled).toEqual(expect.arrayContaining(['gemini', 'groq', 'mistral']));
    expect(d.providersDisabled).toContain('openai');
    // Every active model is now priced from official documentation. If this ever goes
    // above zero, a model was enabled without its price being confirmed.
    expect(d.unverifiedPricing).toEqual([]);
    expect(JSON.stringify(d)).not.toMatch(/key|secret|token/i);
  });
});
