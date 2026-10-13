import { AI, env } from "@/config";
import {
  type RouteContext,
  type VoiceIntent,
} from "@/core/domain/entities/conversation";
import type {
  AiCompletion,
  AiProvider,
  AiRequest,
} from "@/core/domain/ports/aiProvider";
import type { Logger } from "@/core/domain/ports/logger";
import type { HttpClient } from "@/services/http/httpClient";
import { decodeChatCompletion } from "./openAiDecoder";
import { decodeIntentEnvelope } from "./intentEnvelope";
import {
  formatDistance,
  formatDuration,
  formatTimeOfDay,
} from "@/utils/format";

/** The drive, as a few lines a model can actually use. */
export const describeContext = (context: RouteContext): string => {
  if (!context.isNavigating || !context.destination) {
    return "No trip is currently running.";
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
    parts.push(
      `Arriving around ${formatTimeOfDay(new Date(context.arrivalAt))}.`,
    );
  }
  if (context.referent) {
    parts.push(`Last suggested: ${context.referent.name}.`);
  }
  if (context.previousDestination) {
    parts.push(`Earlier destination: ${context.previousDestination.name}.`);
  }

  return parts.join(" ");
};

export interface OpenAiProviderOptions {
  http: HttpClient;
  logger: Logger;
  /** Defaults to your gateway, falling back to the provider's own endpoint. */
  baseUrl?: string;
  getAccessToken?: () => Promise<string | null>;
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
  baseUrl = env.backendUrl ? `${env.backendUrl}/ai` : env.aiGatewayUrl,
  getAccessToken = async () => null,
}: OpenAiProviderOptions): AiProvider => {
  const scoped = logger.scoped("ai.openai");
  const endpoint = baseUrl.startsWith("https://") ? baseUrl : "";

  return {
    id: "openai",

    isConfigured: () => endpoint.length > 0,

    async complete({ transcript, signal }: AiRequest): Promise<AiCompletion> {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in to the Avyro gateway first.");
      const completion = await http.postJson(
        endpoint,
        { transcript },
        decodeChatCompletion,
        {
          operation: "ai.complete",
          signal,
          timeoutMs: AI.requestTimeoutMs,
          headers: { Authorization: `Bearer ${token}` },
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
    warn("provider returned content that was not JSON");
    return { intent: null, speech: null };
  }

  const envelope = decodeIntentEnvelope(parsed);
  if (!envelope) {
    warn("provider returned an intent Avyro does not implement");
    return { intent: null, speech: null };
  }

  return envelope as { intent: VoiceIntent | null; speech: string | null };
};
