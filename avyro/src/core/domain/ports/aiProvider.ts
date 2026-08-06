import type { RouteContext, VoiceIntent } from '../entities/conversation';

export interface AiRequest {
  /** What the driver said, verbatim. */
  transcript: string;
  /** Everything Avyro knows about the drive, assembled for this turn. */
  context: RouteContext;
  signal?: AbortSignal;
}

/**
 * What a model is allowed to return.
 *
 * An intent, optionally a sentence — and nothing else. The model classifies;
 * the app decides what that means and carries it out. A provider cannot invent
 * an action, cannot address a place Avyro has not resolved, and cannot put the
 * car anywhere: it maps words onto a vocabulary the app already implements.
 *
 * That constraint is the whole safety argument for putting a model in a car.
 */
export interface AiCompletion {
  intent: VoiceIntent | null;
  /** A reply to speak, when the intent alone does not carry the answer. */
  speech: string | null;
}

/**
 * One AI backend.
 *
 * Implementations are interchangeable and none is named anywhere above this
 * port. The gateway chooses when to call one, when to ignore it, and what to do
 * when it fails — see `services/ai/aiGateway.ts`.
 */
export interface AiProvider {
  /** Stable identifier for logs and metrics, e.g. `openai`. */
  readonly id: string;
  /**
   * False when the provider has no endpoint or credentials.
   *
   * The gateway checks this before every call so an unconfigured build simply
   * runs deterministically instead of failing a request per utterance.
   */
  isConfigured(): boolean;
  complete(request: AiRequest): Promise<AiCompletion>;
}
