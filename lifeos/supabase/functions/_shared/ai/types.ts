/**
 * The contract every LifeOS AI request and response passes through.
 *
 * Nothing in this file mentions a provider. That is the point: LifeOS business logic
 * describes what it needs — a task, a quality bar, a privacy class, a budget — and the
 * router decides who answers. Provider-shaped types live only in the adapters.
 */

/** What the caller is trying to do. Routing policy is keyed on this. */
export type TaskType =
  | 'casual_chat'
  | 'daily_planning'
  | 'weekly_planning'
  | 'goal_planning'
  | 'habit_planning'
  | 'life_analysis'
  | 'deep_analysis'
  | 'proactive_insights'
  | 'agent_execution'
  | 'business_planning'
  | 'career_planning'
  | 'finance_planning'
  | 'fitness_planning'
  | 'learning_planning'
  | 'structured_generation'
  | 'tool_execution'
  | 'transcription'
  | 'summarization'
  | 'reflection'
  | 'long_context_analysis'
  | 'multimodal_analysis';

export const TASK_TYPES: TaskType[] = [
  'casual_chat', 'daily_planning', 'weekly_planning', 'goal_planning', 'habit_planning',
  'life_analysis', 'deep_analysis', 'proactive_insights', 'agent_execution',
  'business_planning', 'career_planning', 'finance_planning', 'fitness_planning',
  'learning_planning', 'structured_generation', 'tool_execution', 'transcription',
  'summarization', 'reflection', 'long_context_analysis', 'multimodal_analysis',
];

/**
 * How exposed the user's data is in this request.
 *
 * Classified per task rather than per message: a router cannot read a reflection before
 * it sends it, so `finance_planning` is highly sensitive by definition regardless of
 * what the user actually typed. This errs toward caution and is testable.
 */
export type PrivacyClass = 'normal' | 'sensitive' | 'highly_sensitive';

export const PRIVACY_RANK: Record<PrivacyClass, number> = {
  normal: 0,
  sensitive: 1,
  highly_sensitive: 2,
};

/** The privacy floor for each task. A caller may raise it, never lower it. */
export const TASK_PRIVACY: Record<TaskType, PrivacyClass> = {
  casual_chat: 'normal',
  daily_planning: 'normal',
  weekly_planning: 'normal',
  goal_planning: 'normal',
  habit_planning: 'normal',
  structured_generation: 'normal',
  tool_execution: 'normal',
  summarization: 'normal',
  learning_planning: 'normal',
  proactive_insights: 'sensitive',
  long_context_analysis: 'sensitive',
  multimodal_analysis: 'sensitive',
  transcription: 'sensitive',
  career_planning: 'sensitive',
  business_planning: 'sensitive',
  fitness_planning: 'sensitive',
  agent_execution: 'sensitive',
  life_analysis: 'highly_sensitive',
  deep_analysis: 'highly_sensitive',
  reflection: 'highly_sensitive',
  finance_planning: 'highly_sensitive',
};

/** A thing a model must be able to do for a request to be routable to it. */
export type Capability =
  | 'tools'
  | 'structured_output'
  | 'reasoning'
  | 'vision'
  | 'audio';

export type QualityClass = 'basic' | 'standard' | 'advanced' | 'frontier';
export const QUALITY_RANK: Record<QualityClass, number> = {
  basic: 0, standard: 1, advanced: 2, frontier: 3,
};

export type SpeedClass = 'fast' | 'normal' | 'slow';

/** A provider-neutral message. Adapters translate this into their own shape. */
export type AIMessage = {
  role: 'user' | 'assistant';
  /** Plain text, or the structured blocks a tool round-trip needs. */
  content: string | AIContentBlock[];
};

export type AIContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; id: string; name: string; result: string; isError?: boolean };

/** A tool, described once, in JSON Schema. Adapters re-wrap it per provider. */
export type AITool = {
  name: string;
  description: string;
  /** JSON Schema for the arguments. Generated from the same zod schema that validates. */
  parameters: Record<string, unknown>;
};

export type AIRequest = {
  requestId: string;
  userId: string;
  tier: string;
  taskType: TaskType;
  system: string;
  messages: AIMessage[];
  tools?: AITool[];
  requiredCapabilities: Capability[];
  /** The lowest quality that still does the job well. The router may go higher. */
  qualityRequirement: QualityClass;
  latencyRequirement: 'realtime' | 'normal' | 'batch';
  privacyRequirement: PrivacyClass;
  /** Hard ceiling for this one request, in USD. */
  maxCost: number;
  maxOutputTokens: number;
  /** What the user has left this period, in USD. */
  budgetRemaining: number;
  metadata?: Record<string, unknown>;
};

export type AIUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
};

export type AIResponse = {
  text: string;
  toolCalls: { id: string; name: string; input: Record<string, unknown> }[];
  structuredOutput: Record<string, unknown> | null;
  provider: string;
  model: string;
  usage: AIUsage;
  estimatedCost: number;
  actualCost: number;
  /**
   * `metered` when the provider reported token counts we priced ourselves;
   * `estimated` when it did not and we fell back to our own estimate. Never claim a
   * number is exact when it is not.
   */
  accountingMethod: 'metered' | 'estimated';
  latencyMs: number;
  requestId: string;
  providerRequestId: string | null;
  finishReason: 'stop' | 'length' | 'tool_use' | 'filtered' | 'error';
  fallbackUsed: boolean;
  fallbackReason: string | null;
};

/** Product-level error codes. Raw provider errors never reach a LifeOS user. */
export type AIErrorCode =
  | 'PROVIDER_AUTH_ERROR'
  | 'PROVIDER_RATE_LIMIT'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_OVERLOAD'
  | 'MODEL_UNAVAILABLE'
  | 'MODEL_UNSUPPORTED_CAPABILITY'
  | 'BUDGET_EXCEEDED'
  | 'ENTITLEMENT_REQUIRED'
  | 'PRIVACY_NOT_PERMITTED'
  | 'PROVIDER_CONFIGURATION_ERROR'
  | 'NO_ELIGIBLE_MODEL'
  | 'UNKNOWN_PROVIDER_ERROR';

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly retryable: boolean;
  readonly status: number | null;
  constructor(code: AIErrorCode, message: string, opts?: { retryable?: boolean; status?: number | null }) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.retryable = opts?.retryable ?? false;
    this.status = opts?.status ?? null;
  }
}

/** Which error codes are worth trying a different model for. */
export const RETRYABLE_CODES: AIErrorCode[] = [
  'PROVIDER_RATE_LIMIT',
  'PROVIDER_TIMEOUT',
  'PROVIDER_OVERLOAD',
  'MODEL_UNAVAILABLE',
  'UNKNOWN_PROVIDER_ERROR',
];
