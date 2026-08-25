import { route, type RouteContext } from '@shared/ai/router';
import { DEFAULT_REGISTRY, mergeRegistry } from '@shared/ai/registry';
import { emptyHealth, recordFailure } from '@shared/ai/health';
import type { AIRequest, Capability, PrivacyClass, QualityClass, TaskType } from '@shared/ai/types';
import { TASK_PRIVACY } from '@shared/ai/types';

function request(over: Partial<AIRequest> = {}): AIRequest {
  return {
    requestId: 'req-1', userId: 'u1', tier: 'pro', taskType: 'casual_chat',
    system: 'sys', messages: [{ role: 'user', content: 'hello' }],
    requiredCapabilities: [], qualityRequirement: 'basic', latencyRequirement: 'normal',
    privacyRequirement: 'normal', maxCost: 1, maxOutputTokens: 1000,
    budgetRemaining: 10, metadata: { estimatedInputTokens: 3000 },
    ...over,
  };
}

/*
  Routing-logic tests exercise the whole registry, so they opt out of the pricing
  verification gate. That gate is production policy, not routing behaviour, and it has
  its own tests below — mixing the two would mean every routing test silently became a
  test of which prices happen to be verified today.
*/
function ctx(over: Partial<RouteContext> = {}): RouteContext {
  return {
    registry: DEFAULT_REGISTRY, health: {}, now: 1_000_000,
    requireVerifiedPricing: false,
    ...over,
  };
}

describe('router — eligibility', () => {
  it('returns candidates ordered best first', () => {
    const d = route(request(), ctx());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.candidates.length).toBeGreaterThan(1);
    for (let i = 1; i < d.candidates.length; i++) {
      expect(d.candidates[i - 1].score).toBeGreaterThanOrEqual(d.candidates[i].score);
    }
  });

  it('is deterministic — the same inputs always give the same choice', () => {
    const a = route(request(), ctx());
    const b = route(request(), ctx());
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.candidates.map((c) => c.model.modelId)).toEqual(b.candidates.map((c) => c.model.modelId));
  });

  it('never selects a prepaid provider unless prepaid is explicitly enabled', () => {
    const registry = mergeRegistry(DEFAULT_REGISTRY, { providers: { openai: { enabled: true } } as any });
    const off = route(request(), ctx({ registry }));
    expect(off.ok).toBe(true);
    if (off.ok) expect(off.candidates.some((c) => c.model.provider === 'openai')).toBe(false);

    const on = route(request(), ctx({ registry, allowPrepaidProviders: true }));
    expect(on.ok).toBe(true);
    if (on.ok) expect(on.candidates.some((c) => c.model.provider === 'openai')).toBe(true);
  });

  it('excludes models that cannot call tools when tools are required', () => {
    const d = route(request({ requiredCapabilities: ['tools' as Capability] }), ctx());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    for (const c of d.candidates) expect(c.model.capabilities).toContain('tools');
  });

  it('refuses to route a multimodal request to a text-only model', () => {
    const d = route(request({ requiredCapabilities: ['vision' as Capability] }), ctx());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    for (const c of d.candidates) expect(c.model.capabilities).toContain('vision');
    expect(d.candidates.some((c) => c.model.provider === 'groq')).toBe(false);
  });

  it('sends highly sensitive work only to a provider cleared for it', () => {
    const d = route(request({ privacyRequirement: 'highly_sensitive' as PrivacyClass }), ctx());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    for (const c of d.candidates) expect(c.model.provider).toBe('mistral');
  });

  it('keeps sensitive work away from a provider held to normal data', () => {
    const d = route(request({ privacyRequirement: 'sensitive' as PrivacyClass }), ctx());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.candidates.some((c) => c.model.provider === 'groq')).toBe(false);
  });

  it('reports a privacy refusal as such when nothing is cleared', () => {
    const registry = mergeRegistry(DEFAULT_REGISTRY, {
      providers: { mistral: { enabled: false } } as any,
    });
    const d = route(request({ privacyRequirement: 'highly_sensitive' as PrivacyClass }), ctx({ registry }));
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.code).toBe('PRIVACY_NOT_PERMITTED');
  });

  it('honours a minimum quality bar', () => {
    const d = route(request({ qualityRequirement: 'advanced' as QualityClass }), ctx());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    for (const c of d.candidates) expect(['advanced', 'frontier']).toContain(c.model.qualityClass);
  });

  it('keeps the transcription model out of text routing', () => {
    const d = route(request({ taskType: 'casual_chat' as TaskType }), ctx());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.candidates.some((c) => c.model.modelId === 'whisper-large-v3-turbo')).toBe(false);
  });

  it('routes transcription to the audio model', () => {
    const d = route(request({
      taskType: 'transcription' as TaskType,
      requiredCapabilities: ['audio' as Capability],
      privacyRequirement: 'normal' as PrivacyClass,
    }), ctx());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.candidates[0].model.modelId).toBe('whisper-large-v3-turbo');
  });

  it('drops a model whose context is too small', () => {
    const d = route(request({ metadata: { estimatedInputTokens: 900_000 } }), ctx());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    for (const c of d.candidates) expect(c.model.maxContext).toBeGreaterThanOrEqual(900_000);
  });

  it('excludes a disabled model', () => {
    const registry = mergeRegistry(DEFAULT_REGISTRY, {
      models: [{ provider: 'gemini', modelId: 'gemini-2.5-flash', enabled: false }] as any,
    });
    const d = route(request(), ctx({ registry }));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.candidates.some((c) => c.model.modelId === 'gemini-2.5-flash')).toBe(false);
  });
});

describe('router — economics', () => {
  it('refuses a request whose cheapest option exceeds the per-request ceiling', () => {
    const d = route(request({ maxCost: 0.0000001 }), ctx());
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.code).toBe('BUDGET_EXCEEDED');
  });

  it('refuses when the remaining budget cannot cover any model', () => {
    const d = route(request({ budgetRemaining: 0 }), ctx());
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.code).toBe('BUDGET_EXCEEDED');
  });

  it('every candidate is affordable — so any fallback is affordable too', () => {
    const d = route(request({ maxCost: 0.005, budgetRemaining: 0.005 }), ctx());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    for (const c of d.candidates) {
      expect(c.estimatedCost).toBeLessThanOrEqual(0.005);
    }
  });

  it('prefers a cheap fast model for realtime work', () => {
    const d = route(request({ latencyRequirement: 'realtime' }), ctx());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.candidates[0].model.speedClass).toBe('fast');
  });

  it('does not overpay for a simple task just because the ceiling is generous', () => {
    /*
      Regression: cost was once scored against request.maxCost, so an Ultra ceiling of
      $0.40 made every model look equally cheap and the router answered "hello" with the
      most capable model in the registry — an 18x overspend on trivial work.
    */
    const d = route(request({ tier: 'ultra', maxCost: 0.4, budgetRemaining: 16 }), ctx());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    const cheapest = Math.min(...d.candidates.map((c) => c.estimatedCost));
    expect(d.candidates[0].estimatedCost).toBeLessThanOrEqual(cheapest * 2);
  });

  it('still buys quality when the task asks for it', () => {
    const simple = route(request({ maxCost: 0.4, budgetRemaining: 16 }), ctx());
    const hard = route(request({
      taskType: 'deep_analysis' as TaskType, qualityRequirement: 'advanced' as QualityClass,
      privacyRequirement: 'highly_sensitive' as PrivacyClass, maxCost: 0.4, budgetRemaining: 16,
    }), ctx());
    expect(simple.ok && hard.ok).toBe(true);
    if (!simple.ok || !hard.ok) return;
    expect(hard.candidates[0].estimatedCost).toBeGreaterThan(simple.candidates[0].estimatedCost);
    expect(['advanced', 'frontier']).toContain(hard.candidates[0].model.qualityClass);
  });

  it('prefers quality for a deep analysis on a generous budget', () => {
    const d = route(request({
      taskType: 'deep_analysis' as TaskType,
      qualityRequirement: 'advanced' as QualityClass,
      privacyRequirement: 'highly_sensitive' as PrivacyClass,
      latencyRequirement: 'batch', maxCost: 1, budgetRemaining: 5,
    }), ctx());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(['advanced', 'frontier']).toContain(d.candidates[0].model.qualityClass);
  });
});

describe('router — health', () => {
  it('skips a model whose breaker is open', () => {
    let health = emptyHealth('gemini:gemini-2.5-flash-lite');
    for (let i = 0; i < 5; i++) health = recordFailure(health, 1_000_000);
    expect(health.state).toBe('open');
    const d = route(request(), ctx({ health: { 'gemini:gemini-2.5-flash-lite': health }, now: 1_000_100 }));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.candidates.some((c) => c.model.modelId === 'gemini-2.5-flash-lite')).toBe(false);
  });

  it('lets a probe through once the cooldown has elapsed', () => {
    let health = emptyHealth('gemini:gemini-2.5-flash-lite');
    for (let i = 0; i < 5; i++) health = recordFailure(health, 1_000_000);
    const d = route(request(), ctx({ health: { 'gemini:gemini-2.5-flash-lite': health }, now: 1_000_000 + 61_000 }));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.candidates.some((c) => c.model.modelId === 'gemini-2.5-flash-lite')).toBe(true);
  });

  it('reports no eligible model when every provider is disabled', () => {
    const registry = mergeRegistry(DEFAULT_REGISTRY, {
      providers: {
        gemini: { enabled: false }, groq: { enabled: false }, mistral: { enabled: false },
      } as any,
    });
    const d = route(request(), ctx({ registry }));
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.code).toBe('NO_ELIGIBLE_MODEL');
  });
});

describe('privacy taxonomy', () => {
  it('classifies finance, reflection and deep analysis as highly sensitive', () => {
    expect(TASK_PRIVACY.finance_planning).toBe('highly_sensitive');
    expect(TASK_PRIVACY.reflection).toBe('highly_sensitive');
    expect(TASK_PRIVACY.deep_analysis).toBe('highly_sensitive');
    expect(TASK_PRIVACY.life_analysis).toBe('highly_sensitive');
  });

  it('classifies health, career and business as at least sensitive', () => {
    for (const t of ['fitness_planning', 'career_planning', 'business_planning'] as TaskType[]) {
      expect(['sensitive', 'highly_sensitive']).toContain(TASK_PRIVACY[t]);
    }
  });

  it('gives every task a classification', () => {
    const tasks = Object.keys(TASK_PRIVACY) as TaskType[];
    for (const t of tasks) expect(TASK_PRIVACY[t]).toBeDefined();
  });
});


describe('production pricing verification gate', () => {
  it('refuses to route to a model whose price is not from official documentation', () => {
    const d = route(request(), ctx({ requireVerifiedPricing: true }));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    for (const c of d.candidates) expect(c.model.pricingVerification).toBe('official');
  });

  it('currently leaves Gemini as the only production-eligible provider', () => {
    // Groq and Mistral pricing came from secondary sources, so the gate holds them back.
    // When either is verified against its console, this expectation should be updated
    // deliberately — it is the record of what production routing actually allows today.
    const d = route(request(), ctx({ requireVerifiedPricing: true }));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(new Set(d.candidates.map((c) => c.model.provider))).toEqual(new Set(['gemini']));
  });

  it('leaves highly sensitive work with no provider at all, and refuses rather than downgrading', () => {
    // Mistral is the only provider cleared for this class, and it is gated on pricing.
    // Refusing is correct: the alternative is sending finance and reflection data to a
    // provider that is not cleared for it.
    const d = route(
      request({ privacyRequirement: 'highly_sensitive' as PrivacyClass }),
      ctx({ requireVerifiedPricing: true }),
    );
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.code).toBe('PRIVACY_NOT_PERMITTED');
  });

  it('leaves transcription with no provider until Whisper pricing is verified', () => {
    const d = route(
      request({ taskType: 'transcription' as TaskType, requiredCapabilities: ['audio' as Capability] }),
      ctx({ requireVerifiedPricing: true }),
    );
    expect(d.ok).toBe(false);
  });

  it('restores the full roster the moment pricing is verified', () => {
    const verified = mergeRegistry(DEFAULT_REGISTRY, {
      models: DEFAULT_REGISTRY.models.map((m) => ({
        provider: m.provider, modelId: m.modelId, pricingVerification: 'official',
      })) as any,
    });
    const d = route(request(), ctx({ registry: verified, requireVerifiedPricing: true }));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(new Set(d.candidates.map((c) => c.model.provider))).toEqual(
      new Set(['gemini', 'groq', 'mistral']),
    );
  });
});
