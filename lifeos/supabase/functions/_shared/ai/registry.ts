/**
 * The provider and model registry.
 *
 * Every fact the router needs about a model lives here as data: price, capability,
 * limits, billing mode, privacy clearance, whether it is switched on. None of it is
 * hardcoded in application logic, and all of it can be overridden at runtime from the
 * private `ai_registry` row in `app_config` — so a price change, a newly released
 * model, or an emergency provider shutdown ships without a release.
 */

import type { Capability, PrivacyClass, QualityClass, SpeedClass, TaskType } from './types.ts';

export type ProviderName = 'gemini' | 'openai' | 'groq' | 'mistral';
export const PROVIDER_NAMES: ProviderName[] = ['gemini', 'openai', 'groq', 'mistral'];

/**
 * How money reaches the provider.
 *
 * `prepaid` matters commercially: LifeOS must not depend on a provider that has to be
 * funded before customers generate revenue, so the router can exclude prepaid-only
 * providers unless the business explicitly enables them.
 */
export type BillingMode = 'free' | 'prepaid' | 'postpaid' | 'payg' | 'enterprise' | 'unknown';

/**
 * How well we actually know a fact. Anything not read from official documentation is
 * marked, so an unverified commercial term can never quietly become production policy.
 */
export type Verification = 'official' | 'secondary' | 'unverified';

export type ProviderConfig = {
  provider: ProviderName;
  label: string;
  enabled: boolean;
  billingMode: BillingMode;
  /** False keeps the provider out of routing entirely, whatever its models say. */
  commercialUseAllowed: boolean;
  freeTierAvailable: boolean;
  /** Free tiers are opt-in, never assumed: see FREE_TIER_POLICY below. */
  freeTierUsableForProduction: boolean;
  region: string;
  /** The most exposed data class this provider may receive. */
  maxPrivacyClass: PrivacyClass;
  apiKeyEnvVar: string;
  baseUrl: string;
  billingVerification: Verification;
  notes: string;
};

export type ModelConfig = {
  provider: ProviderName;
  modelId: string;
  label: string;
  enabled: boolean;
  qualityClass: QualityClass;
  speedClass: SpeedClass;
  /** USD per million tokens. */
  inputPrice: number;
  outputPrice: number;
  cachedInputPrice: number | null;
  /** Speech models are billed by audio length, not tokens. USD per minute. */
  audioPricePerMinute?: number;
  currency: 'USD';
  pricingVerification: Verification;
  pricingSource: string;
  pricingEffective: string;
  /** Set where a price is promotional and will change on a known date. */
  pricingExpires?: string;
  maxContext: number;
  maxOutput: number;
  capabilities: Capability[];
  /** Empty means "any task"; otherwise the model is only considered for these. */
  supportedTasks: TaskType[];
  /** Lower runs first when several models tie. */
  fallbackPriority: number;
};

export type Registry = {
  version: number;
  providers: Record<ProviderName, ProviderConfig>;
  models: ModelConfig[];
};

/**
 * A free tier is only usable when every one of these is true. None of the four
 * providers currently satisfies all of them, so all free tiers are off.
 */
export const FREE_TIER_POLICY = [
  'commercial use verified in official terms',
  'privacy appropriate for LifeOS data',
  'quota sufficient for production load',
  'provider policy explicitly permits the intended use',
] as const;

const GOOGLE_PRICING = 'https://ai.google.dev/gemini-api/docs/pricing';
const OPENAI_PRICING = 'https://developers.openai.com/api/docs/pricing';
const GROQ_PRICING = 'https://console.groq.com/docs/models.md';
const MISTRAL_PRICING = 'https://mistral.ai/pricing/api/';

export const DEFAULT_REGISTRY: Registry = {
  version: 1,
  providers: {
    gemini: {
      provider: 'gemini',
      label: 'Google Gemini',
      enabled: true,
      billingMode: 'postpaid',
      commercialUseAllowed: true,
      freeTierAvailable: true,
      /*
        Google's own pricing page states that on the free tier "your prompts and
        responses are used to improve Google products". LifeOS carries finance, health
        and personal reflection. The free tier is therefore permanently unusable here,
        at every subscription tier, and the paid tier's enterprise data privacy is the
        only reason Gemini is eligible at all.
      */
      freeTierUsableForProduction: false,
      region: 'global',
      maxPrivacyClass: 'sensitive',
      apiKeyEnvVar: 'GOOGLE_GEMINI_API_KEY',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      billingVerification: 'official',
      notes: 'Postpay bills at month end. Paid tier excludes data from product improvement.',
    },
    groq: {
      provider: 'groq',
      label: 'Groq',
      enabled: true,
      billingMode: 'postpaid',
      commercialUseAllowed: true,
      freeTierAvailable: true,
      /*
        Groq's published free-tier limits run as low as 10 requests/minute, far below
        production load, and its free-tier commercial terms are not stated in the docs
        we could read. Development convenience only.
      */
      freeTierUsableForProduction: false,
      region: 'us',
      /*
        Held to normal data until Groq's retention terms are read from source. This is
        deliberately conservative: it costs us the cheapest provider on sensitive tasks
        rather than risking data placement we cannot evidence.
      */
      maxPrivacyClass: 'normal',
      apiKeyEnvVar: 'GROQ_API_KEY',
      baseUrl: 'https://api.groq.com/openai/v1',
      billingVerification: 'official',
      notes: 'Developer tier: no immediate charge, billed at $1/$10/$100/$500/$1k then monthly.',
    },
    mistral: {
      provider: 'mistral',
      label: 'Mistral',
      enabled: true,
      billingMode: 'payg',
      commercialUseAllowed: true,
      freeTierAvailable: true,
      freeTierUsableForProduction: false,
      region: 'eu',
      /** The only provider cleared for finance and personal reflection. */
      maxPrivacyClass: 'highly_sensitive',
      apiKeyEnvVar: 'MISTRAL_API_KEY',
      baseUrl: 'https://api.mistral.ai/v1',
      billingVerification: 'secondary',
      notes: 'Pay-as-you-go, no upfront cost. EU jurisdiction. Model ids need console confirmation.',
    },
    openai: {
      provider: 'openai',
      label: 'OpenAI',
      /*
        Built, tested and ready — but off. OpenAI bills from a prepaid credit balance and
        halts at $0, which conflicts with the requirement that LifeOS never depends on
        pre-funded AI credit. Enabling this is a business decision, made by flipping this
        flag in app_config, not a code change.
      */
      enabled: false,
      billingMode: 'prepaid',
      commercialUseAllowed: true,
      freeTierAvailable: false,
      freeTierUsableForProduction: false,
      region: 'us',
      maxPrivacyClass: 'sensitive',
      apiKeyEnvVar: 'OPENAI_API_KEY',
      baseUrl: 'https://api.openai.com/v1',
      billingVerification: 'official',
      notes: 'DISABLED. Prepaid credits with auto-recharge; API usage halts at $0 balance.',
    },
  },

  models: [
    // ── Gemini ────────────────────────────────────────────────────────────────
    {
      provider: 'gemini', modelId: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite',
      enabled: true, qualityClass: 'basic', speedClass: 'fast',
      inputPrice: 0.10, outputPrice: 0.40, cachedInputPrice: 0.01, currency: 'USD',
      pricingVerification: 'official', pricingSource: GOOGLE_PRICING, pricingEffective: '2026-08-25',
      maxContext: 1_000_000, maxOutput: 8192,
      capabilities: ['tools', 'structured_output', 'vision'],
      supportedTasks: [], fallbackPriority: 10,
    },
    {
      provider: 'gemini', modelId: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash',
      enabled: true, qualityClass: 'standard', speedClass: 'fast',
      inputPrice: 0.30, outputPrice: 2.50, cachedInputPrice: 0.03, currency: 'USD',
      pricingVerification: 'official', pricingSource: GOOGLE_PRICING, pricingEffective: '2026-08-25',
      maxContext: 1_000_000, maxOutput: 65_536,
      capabilities: ['tools', 'structured_output', 'vision', 'reasoning'],
      supportedTasks: [], fallbackPriority: 20,
    },
    {
      provider: 'gemini', modelId: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro',
      enabled: true, qualityClass: 'advanced', speedClass: 'normal',
      inputPrice: 1.25, outputPrice: 10.00, cachedInputPrice: 0.125, currency: 'USD',
      pricingVerification: 'official', pricingSource: GOOGLE_PRICING, pricingEffective: '2026-08-25',
      pricingExpires: '2026-12-31',
      maxContext: 1_000_000, maxOutput: 65_536,
      capabilities: ['tools', 'structured_output', 'vision', 'reasoning'],
      supportedTasks: [], fallbackPriority: 30,
    },
    {
      /*
        Newer stable Flash, but materially dearer than 2.5 Flash and on promotional
        pricing that doubles on 1 Jan 2027. Present so it can be switched on from
        configuration after a quality comparison, rather than requiring a release.
      */
      provider: 'gemini', modelId: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash',
      enabled: false, qualityClass: 'advanced', speedClass: 'fast',
      inputPrice: 0.75, outputPrice: 3.75, cachedInputPrice: 0.075, currency: 'USD',
      pricingVerification: 'official', pricingSource: GOOGLE_PRICING, pricingEffective: '2026-08-25',
      pricingExpires: '2026-12-31',
      maxContext: 1_000_000, maxOutput: 65_536,
      capabilities: ['tools', 'structured_output', 'vision', 'reasoning'],
      supportedTasks: [], fallbackPriority: 25,
    },

    // ── Groq ──────────────────────────────────────────────────────────────────
    {
      provider: 'groq', modelId: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (Groq)',
      enabled: true, qualityClass: 'standard', speedClass: 'fast',
      inputPrice: 0.15, outputPrice: 0.60, cachedInputPrice: 0.075, currency: 'USD',
      pricingVerification: 'official', pricingSource: GROQ_PRICING,
      pricingEffective: '2026-08-25',
      maxContext: 131_072, maxOutput: 32_768,
      capabilities: ['tools', 'structured_output'],
      supportedTasks: [], fallbackPriority: 15,
    },
    {
      /*
        Groq's own model list shows this one as "Contact Sales" — it has no published
        per-token price. A secondary source quoted $0.59/$0.79, and using that would mean
        billing users against a number the provider does not publish. Off until Groq
        quotes a price in writing.
      */
      provider: 'groq', modelId: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)',
      enabled: false, qualityClass: 'standard', speedClass: 'fast',
      inputPrice: 0, outputPrice: 0, cachedInputPrice: null, currency: 'USD',
      pricingVerification: 'unverified', pricingSource: GROQ_PRICING,
      pricingEffective: '2026-08-25',
      maxContext: 131_072, maxOutput: 32_768,
      capabilities: ['tools', 'structured_output'],
      supportedTasks: [], fallbackPriority: 35,
    },
    {
      provider: 'groq', modelId: 'whisper-large-v3-turbo', label: 'Whisper Large v3 Turbo',
      enabled: true, qualityClass: 'standard', speedClass: 'fast',
      // $0.04 per hour of audio, published by Groq.
      inputPrice: 0, outputPrice: 0, cachedInputPrice: null,
      audioPricePerMinute: 0.04 / 60, currency: 'USD',
      pricingVerification: 'official', pricingSource: GROQ_PRICING,
      pricingEffective: '2026-08-25',
      maxContext: 0, maxOutput: 0,
      capabilities: ['audio'],
      /** Audio only. Never a candidate for text work. */
      supportedTasks: ['transcription'], fallbackPriority: 10,
    },

    {
      provider: 'groq', modelId: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (Groq)',
      enabled: true, qualityClass: 'basic', speedClass: 'fast',
      inputPrice: 0.075, outputPrice: 0.30, cachedInputPrice: null, currency: 'USD',
      pricingVerification: 'official', pricingSource: GROQ_PRICING,
      pricingEffective: '2026-08-25',
      maxContext: 131_072, maxOutput: 32_768,
      capabilities: ['tools', 'structured_output'],
      supportedTasks: [], fallbackPriority: 12,
    },

    // ── Mistral ───────────────────────────────────────────────────────────────
    {
      provider: 'mistral', modelId: 'mistral-small-latest', label: 'Mistral Small 4',
      enabled: true, qualityClass: 'standard', speedClass: 'fast',
      // Official pricing is $0.15/$0.60. A secondary source had quoted $0.10/$0.30,
      // which would have under-billed every Mistral request by a third.
      inputPrice: 0.15, outputPrice: 0.60, cachedInputPrice: null, currency: 'USD',
      pricingVerification: 'official', pricingSource: MISTRAL_PRICING,
      pricingEffective: '2026-08-25',
      maxContext: 128_000, maxOutput: 8192,
      capabilities: ['tools', 'structured_output'],
      supportedTasks: [], fallbackPriority: 20,
    },
    {
      provider: 'mistral', modelId: 'mistral-medium-latest', label: 'Mistral Medium 3.5',
      enabled: true, qualityClass: 'advanced', speedClass: 'normal',
      inputPrice: 1.50, outputPrice: 7.50, cachedInputPrice: null, currency: 'USD',
      pricingVerification: 'official', pricingSource: MISTRAL_PRICING,
      pricingEffective: '2026-08-25',
      maxContext: 128_000, maxOutput: 8192,
      capabilities: ['tools', 'structured_output', 'reasoning', 'vision'],
      supportedTasks: [], fallbackPriority: 30,
    },

    {
      provider: 'mistral', modelId: 'mistral-large-latest', label: 'Mistral Large 3',
      enabled: true, qualityClass: 'advanced', speedClass: 'normal',
      inputPrice: 0.50, outputPrice: 1.50, cachedInputPrice: null, currency: 'USD',
      pricingVerification: 'official', pricingSource: MISTRAL_PRICING,
      pricingEffective: '2026-08-25',
      maxContext: 128_000, maxOutput: 8192,
      capabilities: ['tools', 'structured_output', 'reasoning'],
      supportedTasks: [], fallbackPriority: 22,
    },
    {
      /*
        A second, EU-based transcription option. Matters because Groq is held to normal
        data only, so a sensitive recording has somewhere lawful to go.
      */
      provider: 'mistral', modelId: 'voxtral-mini-transcribe-2', label: 'Voxtral Mini Transcribe 2',
      enabled: true, qualityClass: 'standard', speedClass: 'normal',
      inputPrice: 0, outputPrice: 0, cachedInputPrice: null,
      audioPricePerMinute: 0.003, currency: 'USD',
      pricingVerification: 'official', pricingSource: MISTRAL_PRICING,
      pricingEffective: '2026-08-25',
      maxContext: 0, maxOutput: 0,
      capabilities: ['audio'],
      supportedTasks: ['transcription'], fallbackPriority: 20,
    },

    // ── OpenAI — present, disabled with its provider ───────────────────────────
    {
      provider: 'openai', modelId: 'gpt-5.6-luna', label: 'GPT-5.6 Luna',
      enabled: true, qualityClass: 'standard', speedClass: 'fast',
      inputPrice: 0.20, outputPrice: 1.20, cachedInputPrice: 0.02, currency: 'USD',
      pricingVerification: 'official', pricingSource: OPENAI_PRICING, pricingEffective: '2026-08-25',
      maxContext: 400_000, maxOutput: 128_000,
      capabilities: ['tools', 'structured_output', 'vision', 'reasoning'],
      supportedTasks: [], fallbackPriority: 20,
    },
    {
      provider: 'openai', modelId: 'o3', label: 'o3',
      enabled: true, qualityClass: 'advanced', speedClass: 'slow',
      inputPrice: 2.00, outputPrice: 8.00, cachedInputPrice: 0.50, currency: 'USD',
      pricingVerification: 'official', pricingSource: OPENAI_PRICING, pricingEffective: '2026-08-25',
      maxContext: 200_000, maxOutput: 100_000,
      capabilities: ['tools', 'structured_output', 'reasoning'],
      supportedTasks: [], fallbackPriority: 40,
    },
    {
      provider: 'openai', modelId: 'gpt-5.6-terra', label: 'GPT-5.6 Terra',
      enabled: true, qualityClass: 'frontier', speedClass: 'normal',
      inputPrice: 2.00, outputPrice: 12.00, cachedInputPrice: 0.20, currency: 'USD',
      pricingVerification: 'official', pricingSource: OPENAI_PRICING, pricingEffective: '2026-08-25',
      maxContext: 400_000, maxOutput: 128_000,
      capabilities: ['tools', 'structured_output', 'vision', 'reasoning'],
      supportedTasks: [], fallbackPriority: 50,
    },
  ],
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/**
 * Applies the runtime override from `app_config`. Models are matched on
 * provider + modelId so an override can adjust one price without restating the rest,
 * and unknown models in the override are appended rather than dropped.
 */
export function mergeRegistry(base: Registry, override?: DeepPartial<Registry> | null): Registry {
  if (!override) return base;

  const providers = { ...base.providers };
  for (const name of PROVIDER_NAMES) {
    const patch = override.providers?.[name];
    if (patch) providers[name] = { ...providers[name], ...patch } as ProviderConfig;
  }

  const models = base.models.map((m) => ({ ...m }));
  for (const patch of (override.models ?? []) as Partial<ModelConfig>[]) {
    if (!patch?.provider || !patch?.modelId) continue;
    const i = models.findIndex((m) => m.provider === patch.provider && m.modelId === patch.modelId);
    if (i >= 0) models[i] = { ...models[i], ...patch } as ModelConfig;
    else models.push(patch as ModelConfig);
  }

  return { version: override.version ?? base.version, providers, models };
}

/** Models that are switched on and whose provider is switched on. */
export function activeModels(registry: Registry): ModelConfig[] {
  return registry.models.filter((m) => {
    const p = registry.providers[m.provider];
    return m.enabled && p?.enabled && p.commercialUseAllowed;
  });
}
