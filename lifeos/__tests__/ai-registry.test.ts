import {
  DEFAULT_REGISTRY, PROVIDER_NAMES, activeModels, mergeRegistry, FREE_TIER_POLICY,
} from '@shared/ai/registry';

describe('provider registry', () => {
  it('defines every approved provider', () => {
    for (const name of PROVIDER_NAMES) {
      expect(DEFAULT_REGISTRY.providers[name]).toBeDefined();
      expect(DEFAULT_REGISTRY.providers[name].provider).toBe(name);
    }
  });

  it('launches with Gemini, Groq and Mistral enabled', () => {
    expect(DEFAULT_REGISTRY.providers.gemini.enabled).toBe(true);
    expect(DEFAULT_REGISTRY.providers.groq.enabled).toBe(true);
    expect(DEFAULT_REGISTRY.providers.mistral.enabled).toBe(true);
  });

  it('keeps OpenAI built but disabled, because it bills from prepaid credit', () => {
    const openai = DEFAULT_REGISTRY.providers.openai;
    expect(openai.enabled).toBe(false);
    expect(openai.billingMode).toBe('prepaid');
    expect(activeModels(DEFAULT_REGISTRY).some((m) => m.provider === 'openai')).toBe(false);
  });

  it('never marks a free tier usable for production', () => {
    for (const name of PROVIDER_NAMES) {
      expect(DEFAULT_REGISTRY.providers[name].freeTierUsableForProduction).toBe(false);
    }
    expect(FREE_TIER_POLICY.length).toBeGreaterThan(0);
  });

  it('permits highly sensitive data only where a provider is cleared for it', () => {
    expect(DEFAULT_REGISTRY.providers.mistral.maxPrivacyClass).toBe('highly_sensitive');
    expect(DEFAULT_REGISTRY.providers.gemini.maxPrivacyClass).toBe('sensitive');
    expect(DEFAULT_REGISTRY.providers.groq.maxPrivacyClass).toBe('normal');
  });

  it('prices every active model with a source and an effective date', () => {
    for (const model of activeModels(DEFAULT_REGISTRY)) {
      if (model.capabilities.includes('audio')) continue; // priced per minute, not per token
      expect(model.inputPrice).toBeGreaterThan(0);
      expect(model.outputPrice).toBeGreaterThan(0);
      expect(model.pricingSource).toMatch(/^https?:\/\//);
      expect(model.pricingEffective).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('records how well each price is known, so unverified terms stay visible', () => {
    const levels = new Set(DEFAULT_REGISTRY.models.map((m) => m.pricingVerification));
    for (const level of levels) expect(['official', 'secondary', 'unverified']).toContain(level);
    // Mistral ids could not be confirmed from official docs and must not read as verified.
    const mistral = DEFAULT_REGISTRY.models.filter((m) => m.provider === 'mistral');
    for (const m of mistral) expect(m.pricingVerification).not.toBe('official');
  });

  it('restricts the transcription model to transcription', () => {
    const whisper = DEFAULT_REGISTRY.models.find((m) => m.modelId === 'whisper-large-v3-turbo');
    expect(whisper?.supportedTasks).toEqual(['transcription']);
    expect(whisper?.capabilities).toContain('audio');
  });

  it('applies a runtime override without restating the whole model', () => {
    const merged = mergeRegistry(DEFAULT_REGISTRY, {
      models: [{ provider: 'gemini', modelId: 'gemini-2.5-flash', inputPrice: 9.99 }] as any,
    });
    const model = merged.models.find((m) => m.modelId === 'gemini-2.5-flash');
    expect(model?.inputPrice).toBe(9.99);
    expect(model?.outputPrice).toBe(2.50);
    expect(DEFAULT_REGISTRY.models.find((m) => m.modelId === 'gemini-2.5-flash')?.inputPrice).toBe(0.30);
  });

  it('can disable a provider from configuration alone', () => {
    const merged = mergeRegistry(DEFAULT_REGISTRY, { providers: { gemini: { enabled: false } } as any });
    expect(activeModels(merged).some((m) => m.provider === 'gemini')).toBe(false);
  });

  it('can enable OpenAI from configuration alone', () => {
    const merged = mergeRegistry(DEFAULT_REGISTRY, { providers: { openai: { enabled: true } } as any });
    expect(activeModels(merged).some((m) => m.provider === 'openai')).toBe(true);
  });
});
