/**
 * The subscription catalogue: tiers, entitlements, metered allowances, weighted
 * operation costs and AI model routing.
 *
 * This file is the single source of truth, imported by the app (to render plans and
 * gate UI) and by the edge functions (which are the only place anything is actually
 * enforced). Nothing here is hardcoded anywhere else — and every value can be
 * overridden at runtime from the `app_config` table without shipping a new build,
 * via `mergeCatalogue()` below.
 */

// ─────────────────────────────────────────────────────────────── identities ──

export type Tier = 'free' | 'plus' | 'pro' | 'ultra';

/** Lifecycle of a subscription, mirroring what the stores report. */
export type SubscriptionStatus =
  | 'free'
  | 'trialing'
  | 'active'
  | 'grace_period'
  | 'canceled'
  | 'expired';

/**
 * Capabilities, not plan names. Screens and tools ask for an entitlement; which plan
 * grants it is a configuration decision that can change without touching any feature
 * code.
 */
export type EntitlementKey =
  | 'AI_BASIC'
  | 'AI_PLUS'
  | 'AI_PRO'
  | 'VOICE_BASIC'
  | 'VOICE_PLUS'
  | 'VOICE_PRO'
  | 'MEMORY_BASIC'
  | 'MEMORY_ADVANCED'
  | 'LIFE_RESET_BASIC'
  | 'LIFE_RESET_ADVANCED'
  | 'PLANNING_BASIC'
  | 'PLANNING_ADVANCED'
  | 'PLANNING_PRO'
  | 'ADVANCED_REASONING'
  | 'PROACTIVE_AI'
  | 'AI_AGENTS'
  | 'ADVANCED_INTEGRATIONS'
  | 'ADVANCED_INSIGHTS'
  | 'PRIORITY_PROCESSING'
  | 'EARLY_ACCESS';

/** Metered resources. Everything the AI does draws on one or more of these. */
export type Meter =
  | 'ai_requests'
  | 'advanced_requests'
  | 'voice_seconds'
  | 'life_resets'
  | 'planning_requests'
  | 'memory_items'
  | 'agent_runs';

/** A named thing the user can do that costs something. */
export type Operation =
  | 'chat'
  | 'onboarding'
  | 'plan_day'
  | 'plan_week'
  | 'daily_reset'
  | 'life_reset'
  | 'ninety_day'
  | 'morning_brief'
  | 'deep_analysis'
  | 'voice_transcription'
  | 'agent_run';

export const METERS: Meter[] = [
  'ai_requests',
  'advanced_requests',
  'voice_seconds',
  'life_resets',
  'planning_requests',
  'memory_items',
  'agent_runs',
];

export const METER_LABELS: Record<Meter, { label: string; unit: string; short: string }> = {
  ai_requests: { label: 'AI conversations', unit: 'requests', short: 'AI' },
  advanced_requests: { label: 'Advanced AI', unit: 'requests', short: 'Advanced' },
  voice_seconds: { label: 'Voice', unit: 'seconds', short: 'Voice' },
  life_resets: { label: 'Life Resets', unit: 'resets', short: 'Resets' },
  planning_requests: { label: 'AI planning', unit: 'plans', short: 'Planning' },
  memory_items: { label: 'AI memory', unit: 'memories', short: 'Memory' },
  agent_runs: { label: 'AI agents', unit: 'runs', short: 'Agents' },
};

// ───────────────────────────────────────────────────────── operation costing ──

export type OperationSpec = {
  label: string;
  /** What one run of this operation draws from each meter. */
  costs: Partial<Record<Meter, number>>;
  /** Capability required to run it at all. */
  requires?: EntitlementKey;
  /** Runs on the tier's "advanced" model when the plan has the entitlement. */
  advanced?: boolean;
};

/**
 * Weighted usage. A quick question is not the same as rebuilding someone's life, and
 * the allowance reflects that. Costs are configuration, not constants in the code.
 */
export const OPERATIONS: Record<Operation, OperationSpec> = {
  chat: { label: 'Conversation', costs: { ai_requests: 1 } },
  onboarding: { label: 'Life interview', costs: { ai_requests: 2, planning_requests: 1 } },
  plan_day: {
    label: 'Plan my day',
    costs: { ai_requests: 2, planning_requests: 1 },
    requires: 'PLANNING_BASIC',
  },
  plan_week: {
    label: 'Plan my week',
    costs: { ai_requests: 3, planning_requests: 2 },
    requires: 'PLANNING_BASIC',
  },
  daily_reset: { label: 'Daily Reset', costs: { ai_requests: 2 } },
  life_reset: {
    label: 'Life Reset',
    costs: { ai_requests: 4, life_resets: 1, planning_requests: 2 },
    requires: 'LIFE_RESET_BASIC',
  },
  ninety_day: {
    label: '90-day plan',
    costs: { ai_requests: 8, advanced_requests: 1, planning_requests: 4 },
    requires: 'PLANNING_ADVANCED',
    advanced: true,
  },
  morning_brief: { label: 'Morning briefing', costs: { ai_requests: 1 } },
  deep_analysis: {
    label: 'Deep life analysis',
    costs: { ai_requests: 6, advanced_requests: 2 },
    requires: 'ADVANCED_REASONING',
    advanced: true,
  },
  voice_transcription: {
    label: 'Voice',
    costs: { voice_seconds: 1 },
    requires: 'VOICE_BASIC',
  },
  agent_run: {
    label: 'AI agent',
    costs: { ai_requests: 4, agent_runs: 1 },
    requires: 'AI_AGENTS',
  },
};

// ───────────────────────────────────────────────────────────── model routing ──

export type ModelRoute = {
  /** Provider model id. Never referenced directly outside this catalogue. */
  model: string;
  /** Reasoning effort for ordinary work. */
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** Model and effort used for operations marked `advanced`. */
  advancedModel?: string;
  advancedEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** Ask the provider for reduced latency where the plan and model support it. */
  priority?: boolean;
};

// ─────────────────────────────────────────────────────────────────── pricing ──

export type Price = {
  /** Minor units, so no floating point money. */
  amount: number;
  currency: string;
  productId: string;
};

export type PlanPricing = {
  monthly: Price | null;
  yearly: Price | null;
};

export type Plan = {
  tier: Tier;
  name: string;
  /** One line of positioning — capability, never "30 messages". */
  tagline: string;
  summary: string;
  /** Bullet points shown on the paywall. */
  highlights: string[];
  entitlements: EntitlementKey[];
  /** Allowance per billing period. 0 means the capability is not included. */
  quotas: Record<Meter, number>;
  /**
   * How many of each thing the plan can hold. 0 means no cap — these are rows, not
   * compute, so a paid plan does not ration them.
   */
  objectLimits: { goals: number; habits: number; projects: number };
  /**
   * Meters whose allowance is high enough to describe as "high limits, fair use"
   * rather than a countdown. We never say "unlimited" for something with a cap.
   */
  fairUse: Meter[];
  pricing: PlanPricing;
  /** Free trial length in days; 0 disables it. */
  trialDays: number;
  models: ModelRoute;
  /** Hidden plans exist in the system but are not offered yet. */
  available: boolean;
  /** Highlighted in the paywall. */
  recommended?: boolean;
};

export type Catalogue = {
  version: number;
  currency: string;
  plans: Record<Tier, Plan>;
  order: Tier[];
};

const MODEL_STANDARD = 'claude-sonnet-5';
const MODEL_CAPABLE = 'claude-opus-5';

/**
 * Default catalogue. Prices are the launch placeholders and are expected to change —
 * they can be overridden per environment from `app_config`, so pricing experiments
 * never require an app release.
 */
export const DEFAULT_CATALOGUE: Catalogue = {
  version: 1,
  currency: 'EUR',
  order: ['free', 'plus', 'pro', 'ultra'],
  plans: {
    free: {
      tier: 'free',
      name: 'Free',
      tagline: 'Meet your AI.',
      summary:
        'A real planner with a real assistant. Enough to build your life plan and live with it for a while.',
      highlights: [
        'Your life plan, built from a conversation',
        'Daily and weekly planning',
        'Life Map, goals, habits and a project',
        'Daily Reset every day',
        'A taste of Life Reset and voice',
      ],
      entitlements: ['AI_BASIC', 'PLANNING_BASIC', 'MEMORY_BASIC', 'LIFE_RESET_BASIC', 'VOICE_BASIC'],
      quotas: {
        ai_requests: 120,
        advanced_requests: 0,
        voice_seconds: 600,
        life_resets: 1,
        planning_requests: 30,
        memory_items: 40,
        agent_runs: 0,
      },
      objectLimits: { goals: 3, habits: 3, projects: 1 },
      fairUse: [],
      pricing: { monthly: null, yearly: null },
      trialDays: 0,
      models: { model: MODEL_STANDARD, effort: 'medium' },
      available: true,
    },

    plus: {
      tier: 'plus',
      name: 'Plus',
      tagline: 'Build your life with your AI.',
      summary:
        'For living inside the plan: a more capable model, planning that looks weeks ahead, and an assistant that remembers.',
      highlights: [
        'Much higher AI limits',
        'A more capable AI model',
        'Goals, habits and projects without caps',
        'Advanced weekly reviews and 90-day planning',
        'Voice conversations',
        'Intelligent replanning when the day changes',
        'Advanced memory and proactive nudges',
      ],
      entitlements: [
        'AI_BASIC',
        'AI_PLUS',
        'PLANNING_BASIC',
        'PLANNING_ADVANCED',
        'MEMORY_BASIC',
        'MEMORY_ADVANCED',
        'LIFE_RESET_BASIC',
        'VOICE_BASIC',
        'VOICE_PLUS',
        'PROACTIVE_AI',
        'ADVANCED_INTEGRATIONS',
      ],
      quotas: {
        ai_requests: 1500,
        advanced_requests: 150,
        voice_seconds: 10800,
        life_resets: 12,
        planning_requests: 400,
        memory_items: 400,
        agent_runs: 0,
      },
      objectLimits: { goals: 0, habits: 0, projects: 0 },
      fairUse: ['ai_requests', 'planning_requests', 'voice_seconds', 'life_resets'],
      pricing: {
        monthly: { amount: 999, currency: 'EUR', productId: 'meridian.plus.monthly' },
        yearly: { amount: 7999, currency: 'EUR', productId: 'meridian.plus.yearly' },
      },
      trialDays: 7,
      models: {
        model: MODEL_CAPABLE,
        effort: 'medium',
        advancedModel: MODEL_CAPABLE,
        advancedEffort: 'high',
      },
      available: true,
      recommended: true,
    },

    pro: {
      tier: 'pro',
      name: 'Pro',
      tagline: "Unlock your AI's full potential.",
      summary:
        'For running your life through the assistant: the most capable model available, deeper reasoning, and planning that holds many moving parts at once.',
      highlights: [
        'The highest standard AI limits',
        'The most capable model we offer',
        'Advanced reasoning and deep life analysis',
        'Long-term memory with more capacity',
        'Complex multi-step planning and goal strategy',
        'Higher voice limits',
        'Advanced progress insights',
        'Priority processing where available',
        'Early access to new capabilities',
      ],
      entitlements: [
        'AI_BASIC',
        'AI_PLUS',
        'AI_PRO',
        'PLANNING_BASIC',
        'PLANNING_ADVANCED',
        'PLANNING_PRO',
        'MEMORY_BASIC',
        'MEMORY_ADVANCED',
        'LIFE_RESET_BASIC',
        'LIFE_RESET_ADVANCED',
        'VOICE_BASIC',
        'VOICE_PLUS',
        'VOICE_PRO',
        'ADVANCED_REASONING',
        'PROACTIVE_AI',
        'ADVANCED_INTEGRATIONS',
        'ADVANCED_INSIGHTS',
        'PRIORITY_PROCESSING',
        'EARLY_ACCESS',
      ],
      quotas: {
        ai_requests: 5000,
        advanced_requests: 800,
        voice_seconds: 36000,
        life_resets: 40,
        planning_requests: 1500,
        memory_items: 1500,
        agent_runs: 0,
      },
      objectLimits: { goals: 0, habits: 0, projects: 0 },
      fairUse: ['ai_requests', 'advanced_requests', 'planning_requests', 'voice_seconds', 'life_resets'],
      pricing: {
        monthly: { amount: 1999, currency: 'EUR', productId: 'meridian.pro.monthly' },
        yearly: { amount: 15999, currency: 'EUR', productId: 'meridian.pro.yearly' },
      },
      trialDays: 7,
      models: {
        model: MODEL_CAPABLE,
        effort: 'high',
        advancedModel: MODEL_CAPABLE,
        advancedEffort: 'xhigh',
        priority: true,
      },
      available: true,
    },

    /**
     * Ultra is defined so the system can carry it, but it is not offered: its extra
     * entitlements gate capabilities that do not exist yet (agents, execution). It
     * becomes real by flipping `available` once those ship — no pricing page fiction
     * in the meantime.
     */
    ultra: {
      tier: 'ultra',
      name: 'Ultra',
      tagline: 'Let your AI do more.',
      summary: 'For delegating the work itself: multiple specialised agents and automation.',
      highlights: [
        'Extremely high AI limits',
        'Maximum available models',
        'Multiple specialised AI agents',
        'Multi-step automation',
        'Priority compute',
        'Highest voice limits',
      ],
      entitlements: [
        'AI_BASIC',
        'AI_PLUS',
        'AI_PRO',
        'PLANNING_BASIC',
        'PLANNING_ADVANCED',
        'PLANNING_PRO',
        'MEMORY_BASIC',
        'MEMORY_ADVANCED',
        'LIFE_RESET_BASIC',
        'LIFE_RESET_ADVANCED',
        'VOICE_BASIC',
        'VOICE_PLUS',
        'VOICE_PRO',
        'ADVANCED_REASONING',
        'PROACTIVE_AI',
        'AI_AGENTS',
        'ADVANCED_INTEGRATIONS',
        'ADVANCED_INSIGHTS',
        'PRIORITY_PROCESSING',
        'EARLY_ACCESS',
      ],
      quotas: {
        ai_requests: 20000,
        advanced_requests: 4000,
        voice_seconds: 108000,
        life_resets: 100,
        planning_requests: 6000,
        memory_items: 5000,
        agent_runs: 500,
      },
      objectLimits: { goals: 0, habits: 0, projects: 0 },
      fairUse: ['ai_requests', 'advanced_requests', 'planning_requests', 'voice_seconds', 'life_resets', 'agent_runs'],
      pricing: {
        monthly: { amount: 4999, currency: 'EUR', productId: 'meridian.ultra.monthly' },
        yearly: { amount: 39999, currency: 'EUR', productId: 'meridian.ultra.yearly' },
      },
      trialDays: 0,
      models: {
        model: MODEL_CAPABLE,
        effort: 'xhigh',
        advancedModel: MODEL_CAPABLE,
        advancedEffort: 'max',
        priority: true,
      },
      available: false,
    },
  },
};

// ──────────────────────────────────────────────────────── runtime overrides ──

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Applies a stored override on top of the defaults. Arrays replace wholesale (so a
 * plan's entitlement list can be redefined), objects merge key by key (so a single
 * price or quota can be changed without restating the plan).
 */
export function mergeCatalogue(base: Catalogue, override?: DeepPartial<Catalogue> | null): Catalogue {
  if (!override) return base;

  const merge = <T>(target: T, patch: unknown): T => {
    if (!isPlainObject(patch)) return (patch === undefined ? target : (patch as T));
    if (!isPlainObject(target)) return patch as T;
    const result: Record<string, unknown> = { ...target };
    for (const [key, value] of Object.entries(patch)) {
      result[key] = merge((target as Record<string, unknown>)[key], value);
    }
    return result as T;
  };

  return merge(base, override);
}

// ────────────────────────────────────────────────────── entitlement resolution ──

export type SubscriptionRecord = {
  tier: Tier;
  status: SubscriptionStatus;
  current_period_start?: string | null;
  current_period_end?: string | null;
  trial_ends_at?: string | null;
  grace_until?: string | null;
  will_renew?: boolean | null;
};

export type Entitlement = {
  /** The tier whose capabilities actually apply right now. */
  tier: Tier;
  plan: Plan;
  status: SubscriptionStatus;
  /** True while a paid plan is in effect for any reason (trial, grace, paid). */
  isPaid: boolean;
  isTrial: boolean;
  /** When the current access ends, if it is time-limited. */
  accessUntil: string | null;
  entitlements: Set<EntitlementKey>;
  quotas: Record<Meter, number>;
};

const FALLBACK: SubscriptionRecord = { tier: 'free', status: 'free' };

/**
 * Works out what a user can do right now.
 *
 * A cancelled subscription keeps its capabilities until the period it was paid for
 * actually ends, and an expired one falls back to Free — it never removes anything
 * the user created. Losing a subscription costs AI capability, never their life data.
 */
export function resolveEntitlement(
  catalogue: Catalogue,
  subscription: SubscriptionRecord | null | undefined,
  now: Date = new Date(),
): Entitlement {
  const record = subscription ?? FALLBACK;
  const stamp = now.getTime();
  const at = (value?: string | null) => (value ? new Date(value).getTime() : null);

  const periodEnd = at(record.current_period_end);
  const trialEnd = at(record.trial_ends_at);
  const graceEnd = at(record.grace_until);

  let tier: Tier = record.tier ?? 'free';
  let status: SubscriptionStatus = record.status ?? 'free';
  let accessUntil: string | null = null;

  const stillWithin = (end: number | null) => end !== null && end > stamp;

  if (tier === 'free') {
    status = 'free';
  } else if (status === 'trialing') {
    if (stillWithin(trialEnd)) accessUntil = record.trial_ends_at ?? null;
    else {
      tier = 'free';
      status = 'expired';
    }
  } else if (status === 'grace_period') {
    if (stillWithin(graceEnd)) accessUntil = record.grace_until ?? null;
    else {
      tier = 'free';
      status = 'expired';
    }
  } else if (status === 'canceled') {
    // Paid until the end of the period they already bought.
    if (stillWithin(periodEnd)) accessUntil = record.current_period_end ?? null;
    else {
      tier = 'free';
      status = 'expired';
    }
  } else if (status === 'active') {
    if (periodEnd !== null && periodEnd <= stamp) {
      tier = 'free';
      status = 'expired';
    } else {
      accessUntil = record.current_period_end ?? null;
    }
  } else {
    tier = 'free';
  }

  const plan = catalogue.plans[tier] ?? catalogue.plans.free;

  return {
    tier,
    plan,
    status,
    isPaid: tier !== 'free',
    isTrial: status === 'trialing' && tier !== 'free',
    accessUntil,
    entitlements: new Set(plan.entitlements),
    quotas: plan.quotas,
  };
}

export function hasEntitlement(entitlement: Entitlement, key: EntitlementKey): boolean {
  return entitlement.entitlements.has(key);
}

export type ObjectKind = 'goals' | 'habits' | 'projects';

/**
 * Whether another goal, habit or project can be created. Object caps exist so the free
 * plan encourages focus — they are never a reason to hide what someone already made.
 */
export function objectAllowance(
  plan: Plan,
  kind: ObjectKind,
  current: number,
): { limit: number; capped: boolean; atLimit: boolean } {
  const limit = plan.objectLimits[kind] ?? 0;
  return { limit, capped: limit > 0, atLimit: limit > 0 && current >= limit };
}

/** The cheapest available plan that allows more of something than the current cap. */
export function planForMoreObjects(
  catalogue: Catalogue,
  kind: ObjectKind,
  currentLimit: number,
): Plan | null {
  for (const tier of catalogue.order) {
    const plan = catalogue.plans[tier];
    if (!plan?.available) continue;
    const limit = plan.objectLimits[kind] ?? 0;
    if (limit === 0 || limit > currentLimit) return plan;
  }
  return null;
}

/** The cheapest available plan that grants a capability — what an upsell should offer. */
export function planFor(catalogue: Catalogue, key: EntitlementKey): Plan | null {
  for (const tier of catalogue.order) {
    const plan = catalogue.plans[tier];
    if (plan?.available && plan.entitlements.includes(key)) return plan;
  }
  return null;
}

/** The cheapest available plan with a strictly larger allowance on a meter. */
export function planForMoreOf(catalogue: Catalogue, meter: Meter, current: number): Plan | null {
  for (const tier of catalogue.order) {
    const plan = catalogue.plans[tier];
    if (plan?.available && plan.quotas[meter] > current) return plan;
  }
  return null;
}

// ─────────────────────────────────────────────────────────── billing periods ──

/**
 * The window a user's allowance is measured over: their billing period when they have
 * one, otherwise the calendar month. Both the app and the server derive it the same
 * way, so the number on screen is the number being enforced.
 */
export function currentPeriod(
  subscription: SubscriptionRecord | null | undefined,
  now: Date = new Date(),
): { start: string; end: string } {
  const start = subscription?.current_period_start
    ? new Date(subscription.current_period_start)
    : null;
  const end = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;

  if (start && end && start.getTime() <= now.getTime() && end.getTime() > now.getTime()) {
    return { start: isoDate(start), end: isoDate(end) };
  }

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: isoDate(monthStart), end: isoDate(monthEnd) };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ───────────────────────────────────────────────────────────────── costing ──

export type UsageState = Partial<Record<Meter, number>>;

export type QuotaCheck =
  | { allowed: true; costs: Partial<Record<Meter, number>> }
  | {
      allowed: false;
      reason: 'not_entitled' | 'quota_exceeded';
      meter?: Meter;
      required?: EntitlementKey;
      /** What the user would need to continue. */
      upgradeTo: Plan | null;
    };

/**
 * The one place that answers "can this operation run?". Both the client (to warn
 * early) and the server (to actually decide) call this with the same catalogue.
 */
export function checkOperation(
  catalogue: Catalogue,
  entitlement: Entitlement,
  operation: Operation,
  used: UsageState,
  multiplier = 1,
): QuotaCheck {
  const spec = OPERATIONS[operation];
  if (!spec) return { allowed: false, reason: 'not_entitled', upgradeTo: null };

  if (spec.requires && !entitlement.entitlements.has(spec.requires)) {
    return {
      allowed: false,
      reason: 'not_entitled',
      required: spec.requires,
      upgradeTo: planFor(catalogue, spec.requires),
    };
  }

  const costs: Partial<Record<Meter, number>> = {};
  for (const [meter, cost] of Object.entries(spec.costs) as [Meter, number][]) {
    costs[meter] = Math.max(1, Math.round(cost * multiplier));
  }

  for (const [meter, cost] of Object.entries(costs) as [Meter, number][]) {
    const limit = entitlement.quotas[meter] ?? 0;
    const consumed = used[meter] ?? 0;
    if (limit <= 0 || consumed + cost > limit) {
      return {
        allowed: false,
        reason: 'quota_exceeded',
        meter,
        upgradeTo: planForMoreOf(catalogue, meter, limit),
      };
    }
  }

  return { allowed: true, costs };
}

/** Which model and effort a request should run on. */
export function routeModel(
  entitlement: Entitlement,
  operation: Operation,
): { model: string; effort: string; priority: boolean } {
  const route = entitlement.plan.models;
  const advanced = OPERATIONS[operation]?.advanced && entitlement.entitlements.has('ADVANCED_REASONING');
  return {
    model: (advanced ? route.advancedModel : route.model) ?? route.model,
    effort: (advanced ? route.advancedEffort : route.effort) ?? route.effort,
    priority: Boolean(route.priority) && entitlement.entitlements.has('PRIORITY_PROCESSING'),
  };
}

// ──────────────────────────────────────────────────────────────── formatting ──

export function formatPrice(price: Price | null, locale = 'en-IE'): string {
  if (!price) return 'Free';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: price.currency,
    minimumFractionDigits: price.amount % 100 === 0 ? 0 : 2,
  }).format(price.amount / 100);
}

/** "Save 33%" for a yearly plan, or null when there is nothing to claim. */
export function yearlySaving(plan: Plan): number | null {
  const { monthly, yearly } = plan.pricing;
  if (!monthly || !yearly || monthly.amount <= 0) return null;
  const full = monthly.amount * 12;
  if (yearly.amount >= full) return null;
  return Math.round(((full - yearly.amount) / full) * 100);
}

/**
 * How an allowance should be described. Never "unlimited" — where a cap exists we say
 * so, and where it is deliberately generous we say that instead of a countdown.
 */
export function describeQuota(plan: Plan, meter: Meter): string {
  const limit = plan.quotas[meter] ?? 0;
  if (limit <= 0) return 'Not included';
  if (plan.fairUse.includes(meter)) return 'High limits · fair use';

  if (meter === 'voice_seconds') {
    const minutes = Math.round(limit / 60);
    return `${minutes} minutes a month`;
  }
  return `${limit.toLocaleString('en-US')} ${METER_LABELS[meter].unit} a month`;
}
