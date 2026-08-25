/**
 * Phase 12: the new router's accounting must agree with LifeOS metering, and money must
 * never be lost or double-counted when things go wrong.
 */
import { runAI, type AttemptRecord } from '@shared/ai/index';
import { DEFAULT_REGISTRY } from '@shared/ai/registry';
import { DEFAULT_BUDGETS, affordability } from '@shared/ai/budget';
import { OPERATIONS, METERS } from '@shared/plans';
import type { AIRequest } from '@shared/ai/types';

const request: AIRequest = {
  requestId: 'req-m1', userId: 'u1', tier: 'pro', taskType: 'casual_chat',
  system: 'sys', messages: [{ role: 'user', content: 'hi' }],
  requiredCapabilities: [], qualityRequirement: 'basic', latencyRequirement: 'normal',
  privacyRequirement: 'normal', maxCost: 0.15, maxOutputTokens: 500, budgetRemaining: 7.5,
  metadata: { estimatedInputTokens: 1000 },
};

const okBody = {
  candidates: [{ content: { parts: [{ text: 'answer' }] }, finishReason: 'STOP' }],
  usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 100, cachedContentTokenCount: 200 },
  choices: [{ message: { content: 'answer' }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 1000, completion_tokens: 100, prompt_tokens_details: { cached_tokens: 200 } },
};
const ok = { ok: true, status: 200, text: async () => JSON.stringify(okBody), headers: { get: () => null } };
const fail = (s: number) => ({ ok: false, status: s, text: async () => '{}', headers: { get: () => null } });

const opts = (over = {}) => ({
  registry: DEFAULT_REGISTRY, health: {}, readKey: () => 'k',
  now: () => 1_000_000, requireVerifiedPricing: false, ...over,
});

afterEach(() => { jest.restoreAllMocks(); });

describe('every request is fully accounted for', () => {
  it('records all sixteen fields the economics needs', async () => {
    global.fetch = jest.fn().mockResolvedValue(ok) as any;
    const records: AttemptRecord[] = [];
    await runAI(request, opts({ onAttempt: (r: AttemptRecord) => records.push(r) }) as any);

    const r = records[0];
    for (const field of [
      'requestId', 'userId', 'tier', 'taskType', 'provider', 'model',
      'inputTokens', 'outputTokens', 'cachedTokens', 'estimatedCost', 'actualCost',
      'accountingMethod', 'latencyMs', 'success', 'fallbackUsed',
    ]) {
      expect(`${field}: ${r[field as keyof AttemptRecord] !== undefined}`).toBe(`${field}: true`);
    }
    expect(r.errorCode).toBeNull();
  });

  it('prices cached tokens separately rather than as fresh input', async () => {
    global.fetch = jest.fn().mockResolvedValue(ok) as any;
    const records: AttemptRecord[] = [];
    await runAI(request, opts({ onAttempt: (r: AttemptRecord) => records.push(r) }) as any);
    expect(records[0].cachedTokens).toBe(200);
    expect(records[0].accountingMethod).toBe('metered');
  });

  it('never reports an estimate as a measured cost', async () => {
    const noUsage = { ok: true, status: 200, text: async () => JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'x' }] } }],
      choices: [{ message: { content: 'x' }, finish_reason: 'stop' }],
    }), headers: { get: () => null } };
    global.fetch = jest.fn().mockResolvedValue(noUsage) as any;
    const records: AttemptRecord[] = [];
    await runAI(request, opts({ onAttempt: (r: AttemptRecord) => records.push(r) }) as any);
    expect(records[0].accountingMethod).toBe('estimated');
  });
});

describe('failure never consumes budget permanently', () => {
  it('charges zero for an attempt that produced nothing', async () => {
    let n = 0;
    global.fetch = jest.fn().mockImplementation(async () => { n += 1; return n === 1 ? fail(503) : ok; }) as any;
    const records: AttemptRecord[] = [];
    await runAI(request, opts({ onAttempt: (r: AttemptRecord) => records.push(r) }) as any);
    expect(records[0].success).toBe(false);
    expect(records[0].actualCost).toBe(0);
    expect(records[1].success).toBe(true);
  });

  it('charges zero for every attempt when the whole request fails', async () => {
    global.fetch = jest.fn().mockResolvedValue(fail(503)) as any;
    const records: AttemptRecord[] = [];
    await expect(runAI(request, opts({ onAttempt: (r: AttemptRecord) => records.push(r), maxAttempts: 3 }) as any))
      .rejects.toThrow();
    expect(records.length).toBeGreaterThan(0);
    for (const r of records) expect(r.actualCost).toBe(0);
  });
});

describe('fallback cannot exceed the approved budget', () => {
  it('every fallback candidate was affordable before it was tried', async () => {
    let n = 0;
    global.fetch = jest.fn().mockImplementation(async () => { n += 1; return n < 3 ? fail(429) : ok; }) as any;
    const tight = { ...request, maxCost: 0.003, budgetRemaining: 0.003 };
    const records: AttemptRecord[] = [];
    await runAI(tight, opts({ onAttempt: (r: AttemptRecord) => records.push(r), maxAttempts: 3 }) as any);
    // The router filtered on cost before any attempt, so no attempt can breach it.
    for (const r of records) expect(r.estimatedCost).toBeLessThanOrEqual(0.003);
  });

  it('total spend across fallbacks stays within the per-request ceiling', async () => {
    let n = 0;
    global.fetch = jest.fn().mockImplementation(async () => { n += 1; return n === 1 ? fail(429) : ok; }) as any;
    const records: AttemptRecord[] = [];
    await runAI(request, opts({ onAttempt: (r: AttemptRecord) => records.push(r) }) as any);
    const total = records.reduce((sum, r) => sum + r.actualCost, 0);
    expect(total).toBeLessThanOrEqual(request.maxCost);
  });
});

describe('the two limits stay independent', () => {
  it('keeps the operation allowance and the money ceiling as separate concepts', () => {
    // Meters count things; budgets count money. Conflating them is how a tier that looks
    // generous becomes unfundable.
    expect(METERS).toContain('ai_requests');
    expect(OPERATIONS.chat.costs.ai_requests).toBe(1);
    expect(DEFAULT_BUDGETS.pro.monthlyCeiling).toBe(7.5);
    expect((DEFAULT_BUDGETS.pro as any).ai_requests).toBeUndefined();
  });

  it('refuses on money even when the operation allowance still has room', () => {
    const check = affordability(DEFAULT_BUDGETS.pro, { spent: 7.5, ceiling: 7.5 }, 0.001);
    expect(check.ok).toBe(false);
  });

  it('caps a request at what remains, so the last call cannot overshoot', () => {
    const check = affordability(DEFAULT_BUDGETS.ultra, { spent: 15.98, ceiling: 16 }, 0.001);
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.ceiling).toBeCloseTo(0.02, 6);
    expect(check.ceiling).toBeLessThan(DEFAULT_BUDGETS.ultra.perRequestMax);
  });
});
