import { estimateCost, estimateRequestTokens, estimateTokens, priceFor, reconcile } from '@shared/ai/cost';
import { DEFAULT_REGISTRY } from '@shared/ai/registry';

const flash = DEFAULT_REGISTRY.models.find((m) => m.modelId === 'gemini-2.5-flash')!;
const lite = DEFAULT_REGISTRY.models.find((m) => m.modelId === 'gemini-2.5-flash-lite')!;
const llama = DEFAULT_REGISTRY.models.find((m) => m.modelId === 'llama-3.3-70b-versatile')!;

describe('cost engine', () => {
  it('prices a typical turn from the registry', () => {
    // 3,000 in at $0.30/M + 600 out at $2.50/M
    const cost = priceFor(flash, { inputTokens: 3000, outputTokens: 600, cachedTokens: 0 });
    expect(cost).toBeCloseTo(0.0009 + 0.0015, 8);
  });

  it('charges cached input at the cached rate', () => {
    const uncached = priceFor(flash, { inputTokens: 10_000, outputTokens: 0, cachedTokens: 0 });
    const cached = priceFor(flash, { inputTokens: 10_000, outputTokens: 0, cachedTokens: 9_000 });
    expect(cached).toBeLessThan(uncached);
    // 1,000 fresh at $0.30/M + 9,000 cached at $0.03/M
    expect(cached).toBeCloseTo(0.0003 + 0.00027, 8);
  });

  it('never treats cached input as free when a provider publishes no cached rate', () => {
    expect(llama.cachedInputPrice).toBeNull();
    const cached = priceFor(llama, { inputTokens: 1000, outputTokens: 0, cachedTokens: 1000 });
    const fresh = priceFor(llama, { inputTokens: 1000, outputTokens: 0, cachedTokens: 0 });
    expect(cached).toBeCloseTo(fresh, 10);
    expect(cached).toBeGreaterThan(0);
  });

  it('estimates pessimistically, assuming the full output allowance', () => {
    const estimate = estimateCost(flash, 3000, 1000);
    const actual = priceFor(flash, { inputTokens: 3000, outputTokens: 400, cachedTokens: 0 });
    expect(estimate).toBeGreaterThan(actual);
  });

  it('caps the estimate at the model output limit', () => {
    const estimate = estimateCost(lite, 1000, 1_000_000);
    const capped = priceFor(lite, { inputTokens: 1000, outputTokens: lite.maxOutput, cachedTokens: 0 });
    expect(estimate).toBeCloseTo(capped, 10);
  });

  it('counts tokens from text length', () => {
    expect(estimateTokens('a'.repeat(400))).toBe(100);
    expect(estimateRequestTokens('sys', [{ content: 'hello' }])).toBeGreaterThan(0);
  });

  it('marks a reconciled cost as metered when the provider reported usage', () => {
    const r = reconcile(flash, 0.01, { inputTokens: 3000, outputTokens: 600, cachedTokens: 0 });
    expect(r.accountingMethod).toBe('metered');
    expect(r.actual).toBeCloseTo(0.0024, 6);
    expect(r.estimated).toBe(0.01);
  });

  it('falls back to the estimate and says so when no usage is reported', () => {
    const r = reconcile(flash, 0.01, null);
    expect(r.accountingMethod).toBe('estimated');
    expect(r.actual).toBe(0.01);
  });

  it('does not claim a zero-usage response was metered', () => {
    const r = reconcile(flash, 0.01, { inputTokens: 0, outputTokens: 0, cachedTokens: 0 });
    expect(r.accountingMethod).toBe('estimated');
  });
});

describe('economics of the approved tiers', () => {
  // The numbers behind the approved ceilings, kept honest by a test rather than a memo.
  it('keeps a heavy Ultra user far under the $16.00 ceiling', () => {
    const perTurn = priceFor(flash, { inputTokens: 3000, outputTokens: 600, cachedTokens: 0 });
    const heavyMonth = 600 * perTurn;
    expect(heavyMonth).toBeLessThan(16.0);
    expect(heavyMonth).toBeLessThan(2.0);
  });

  it('keeps a maximum-allowance Free user under $0.15', () => {
    const perTurn = priceFor(lite, { inputTokens: 3000, outputTokens: 600, cachedTokens: 0 });
    expect(150 * perTurn).toBeLessThan(0.15);
  });
});
