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
  });

  it('prices every enabled model from official documentation', () => {
    // Groq and Mistral were verified against their own docs; anything still unverified
    // must be switched off rather than routed to.
    for (const model of activeModels(DEFAULT_REGISTRY)) {
      expect(`${model.provider}:${model.modelId}: ${model.pricingVerification}`)
        .toBe(`${model.provider}:${model.modelId}: official`);
    }
  });

  it('keeps a model with no published price switched off', () => {
    // Groq lists llama-3.3-70b-versatile as "Contact Sales" — no per-token price exists,
    // so billing a user against a guessed number is not an option.
    const llama = DEFAULT_REGISTRY.models.find((m) => m.modelId === 'llama-3.3-70b-versatile');
    expect(llama?.enabled).toBe(false);
    expect(llama?.pricingVerification).toBe('unverified');
  });

  it('prices speech models by the minute rather than by the token', () => {
    const audio = DEFAULT_REGISTRY.models.filter((m) => m.capabilities.includes('audio'));
    expect(audio.length).toBeGreaterThan(1);
    for (const m of audio) {
      expect(m.audioPricePerMinute).toBeGreaterThan(0);
      expect(m.supportedTasks).toEqual(['transcription']);
    }
  });

  it('offers an EU transcription route for data Groq may not receive', () => {
    const voxtral = DEFAULT_REGISTRY.models.find((m) => m.modelId === 'voxtral-mini-transcribe-26-02');
    expect(voxtral?.provider).toBe('mistral');
    expect(DEFAULT_REGISTRY.providers.mistral.maxPrivacyClass).toBe('highly_sensitive');
  });

  it('uses API model identifiers, not the display names on pricing pages', () => {
    /*
      Voice failed on device because this carried "voxtral-mini-transcribe-2" — the
      product name from the pricing table — while the API expects
      "voxtral-mini-transcribe-26-02". Mistral rejected every request and the user saw
      a microphone that did nothing. Model ids come from API references.
    */
    const voxtral = DEFAULT_REGISTRY.models.find((m) => m.provider === 'mistral' && m.capabilities.includes('audio'));
    expect(voxtral?.modelId).toBe('voxtral-mini-transcribe-26-02');
    expect(voxtral?.pricingSource).toContain('docs.mistral.ai');
  });

  it('has at least one enabled audio model for every provider clearance voice needs', () => {
    const audio = DEFAULT_REGISTRY.models.filter((m) => m.capabilities.includes('audio') && m.enabled);
    expect(audio.length).toBeGreaterThanOrEqual(2);
    // Transcription is classified sensitive, so a normal-only provider cannot serve it.
    const cleared = audio.filter((m) => {
      const c = DEFAULT_REGISTRY.providers[m.provider].maxPrivacyClass;
      return c === 'sensitive' || c === 'highly_sensitive';
    });
    expect(cleared.length).toBeGreaterThanOrEqual(1);
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
