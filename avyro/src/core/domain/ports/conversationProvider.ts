import type {
  ConversationReply,
  ConversationRequest,
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
