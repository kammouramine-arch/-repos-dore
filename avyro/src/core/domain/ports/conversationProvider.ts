import type {
  ConversationReply,
  ConversationRequest,
  VoiceIntent,
} from '../entities/conversation';

/**
 * Turns what the driver said into what Avyro says and does.
 *
 * No model is named here, and none should be. Release 0.2 ships a
 * deterministic on-device provider that understands Avyro's command
 * vocabulary; a hosted model is another implementation of this one method.
 * The contract is what matters:
 *
 * - it receives the full {@link RouteContext}, so it never has to reach into
 *   application state;
 * - it returns speech *and* an action, so the caller does not have to infer
 *   intent from prose;
 * - it may be cancelled, because a driver who says something else has changed
 *   the subject.
 */
export interface ConversationProvider {
  /** A short identifier for logs, e.g. `local-commands`. */
  readonly name: string;
  respond(request: ConversationRequest): Promise<ConversationReply>;
}

/**
 * Executes an intent that something else determined.
 *
 * The gateway uses this to run a model's classification through exactly the
 * deterministic path a parsed command takes. A model can therefore choose
 * *which* of Avyro's capabilities to invoke, and never what one of them does.
 */
export interface IntentResolver {
  resolve(
    intent: VoiceIntent,
    request: ConversationRequest,
  ): Promise<ConversationReply>;
}
