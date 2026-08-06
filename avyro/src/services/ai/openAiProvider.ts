import { AI, env } from '@/config';
import {
  VOICE_INTENT_KINDS,
  type RouteContext,
  type VoiceIntent,
} from '@/core/domain/entities/conversation';
import type { AiCompletion, AiProvider, AiRequest } from '@/core/domain/ports/aiProvider';
import type { Logger } from '@/core/domain/ports/logger';
import type { HttpClient } from '@/services/http/httpClient';
import { decodeChatCompletion } from './openAiDecoder';
import { decodeIntentEnvelope } from './intentEnvelope';
import { formatDistance, formatDuration, formatTimeOfDay } from '@/utils/format';

const OPENAI_DIRECT_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * The instruction. Deliberately small, because its job is small.
 *
 * The model classifies one utterance into Avyro's existing vocabulary. It is
 * told what Avyro can do and what the drive currently looks like, and asked for
 * JSON. It is not asked to be charming, to remember anything, or to decide
 * anything the app has not already implemented — all three are out of scope for
 * this release and two of them are out of scope for a car.
 */
const SYSTEM_PROMPT = [
  'You route a driver\'s spoken request to one capability of a navigation app.',
  'Reply with JSON only: {"intent":{"kind":...},"speech":string|null}.',
  `Valid kinds: ${VOICE_INTENT_KINDS.join(', ')}.`,
  'For "navigate-saved" add "slot": "home" or "work".',
  'For "find-nearby" add "category": "restaurants", "coffee", "fuel" or "parking".',
  'Use "unknown" when nothing fits, and put a short honest sentence in "speech".',
  'When an intent fits, set "speech" to null — the app writes the answer itself.',
  'Never invent places, distances, times or road conditions.',
].join(' ');

/** The drive, as a few lines a model can actually use. */
export const describeContext = (context: RouteContext): string => {
  if (!context.isNavigating || !context.destination) {
    return 'No trip is currently running.';
  }

  const parts = [`Driving to ${context.destination.name}.`];

  if (context.remainingDistanceMeters !== null) {
    parts.push(
      `${formatDistance(context.remainingDistanceMeters, context.distanceUnit)} remaining.`,
    );
  }
  if (context.remainingDurationSeconds !== null) {
    parts.push(`${formatDuration(context.remainingDurationSeconds)} to go.`);
  }
  if (context.arrivalAt !== null) {
    parts.push(`Arriving around ${formatTimeOfDay(new Date(context.arrivalAt))}.`);
  }
  if (context.referent) {
    parts.push(`Last suggested: ${context.referent.name}.`);
  }
  if (context.previousDestination) {
    parts.push(`Earlier destination: ${context.previousDestination.name}.`);
  }

  return parts.join(' ');
};

export interface OpenAiProviderOptions {
  http: HttpClient;
  logger: Logger;
  /** Defaults to your gateway, falling back to the provider's own endpoint. */
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

/**
 * OpenAI-compatible chat completions.
 *
 * "OpenAI today, replaceable tomorrow" — and replaceable means two things here.
 * Another vendor is another `AiProvider`. The *same* vendor behind your own
 * proxy is just a different `baseUrl`, which is the configuration this defaults
 * to, because a key inside a shipped binary is a published key.
 */
export const createOpenAiProvider = ({
  http,
  logger,
  baseUrl = env.aiGatewayUrl,
  apiKey = env.aiApiKey,
  model = env.aiModel || AI.defaultModel,
}: OpenAiProviderOptions): AiProvider => {
  const scoped = logger.scoped('ai.openai');
  const endpoint = baseUrl || (apiKey ? OPENAI_DIRECT_URL : '');

  if (apiKey && !baseUrl) {
    scoped.warn(
      'talking to the provider directly with an embedded key — development only',
    );
  }

  return {
    id: 'openai',

    isConfigured: () => endpoint.length > 0,

    async complete({ transcript, context, signal }: AiRequest): Promise<AiCompletion> {
      const completion = await http.postJson(
        endpoint,
        {
          model,
          temperature: AI.temperature,
          max_tokens: AI.maxOutputTokens,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'system', content: describeContext(context) },
            { role: 'user', content: transcript },
          ],
        },
        decodeChatCompletion,
        {
          operation: 'ai.complete',
          signal,
          timeoutMs: AI.requestTimeoutMs,
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
        },
      );

      return toCompletion(completion.content, scoped.warn.bind(scoped));
    },
  };
};

/**
 * Reads the model's JSON, and refuses anything it does not recognise.
 *
 * A hallucinated intent kind is a malformed answer, not a new feature — it
 * degrades to `unknown`, which the gateway turns into the local reply.
 */
const toCompletion = (
  content: string,
  warn: (message: string, fields?: Record<string, unknown>) => void,
): AiCompletion => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    warn('provider returned content that was not JSON');
    return { intent: null, speech: null };
  }

  const envelope = decodeIntentEnvelope(parsed);
  if (!envelope) {
    warn('provider returned an intent Avyro does not implement');
    return { intent: null, speech: null };
  }

  return envelope as { intent: VoiceIntent | null; speech: string | null };
};
