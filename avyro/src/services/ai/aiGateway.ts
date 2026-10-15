import { AI } from '@/config';
import { drivingSafetyReply } from '@/core/conversation/drivingSafety';
import { frenchReply } from '@/core/conversation/frenchReply';
import type {
  ConversationReply,
  ConversationRequest,
} from '@/core/domain/entities/conversation';
import type { AiProvider } from '@/core/domain/ports/aiProvider';
import type {
  ConversationProvider,
  IntentResolver,
} from '@/core/domain/ports/conversationProvider';
import type { CrashReporter } from '@/core/domain/ports/crashReporter';
import type { Logger } from '@/core/domain/ports/logger';

export interface AiGatewayOptions {
  /** The deterministic resolver. Always present, always tried first. */
  local: ConversationProvider & IntentResolver;
  /** The model. May be unconfigured, unreachable, or simply wrong. */
  provider: AiProvider;
  logger: Logger;
  crashReporter: CrashReporter;
}

/**
 * The AI Gateway.
 *
 * The conversation engine depends on this and on nothing else — it sees a
 * `ConversationProvider`, exactly as it did before there was a model. Which
 * backend answers, whether one answers at all, and what happens when one fails
 * are decisions that live here:
 *
 * ```
 * Conversation Engine → AI Gateway → AiProvider → OpenAI today
 *                            └─────→ deterministic resolver (always)
 * ```
 *
 * Three rules, in order of how much they matter:
 *
 * 1. **Deterministic first.** Anything the parser recognises is answered
 *    locally. A model never decides what "cancel navigation" does, never waits
 *    on a network to say how far is left, and never gets a turn at the
 *    controls of a moving car.
 * 2. **The model classifies, it does not act.** For an utterance the parser
 *    cannot place, the model returns an intent from Avyro's own vocabulary,
 *    and that intent is executed through the same deterministic path a spoken
 *    command takes.
 * 3. **Failure is a normal path, not an exception.** No provider, a timeout, a
 *    malformed answer, an outage — every one of them lands on the local reply.
 *    Navigation is never waiting on any of this.
 */
export const createAiGateway = ({
  local,
  provider,
  logger,
  crashReporter,
}: AiGatewayOptions): ConversationProvider => {
  const scoped = logger.scoped('ai.gateway');
  // Ephemeral structured context only: no transcript, coordinates or persistence.
  let memory: { at: number; kind: string; category?: 'coffee' | 'fuel' | 'restaurants' | 'parking' }[] = [];

  /**
   * Asks the model, under a deadline it cannot exceed.
   *
   * The deadline is the point. A driver asked a question; an answer that
   * arrives after they have driven through the junction is not an answer, and
   * a request that never settles would strand the conversation engine in
   * `thinking` forever.
   */
  const askProvider = async (
    request: ConversationRequest,
  ): Promise<ConversationReply | null> => {
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), AI.requestTimeoutMs);
    const startedAt = Date.now();

    // The caller's own cancellation still applies: a driver who says something
    // else has changed the subject.
    const onCallerAbort = () => deadline.abort();
    request.signal?.addEventListener('abort', onCallerAbort);

    try {
      const completion = await provider.complete({
        transcript: request.transcript,
        context: request.context,
        signal: deadline.signal,
      });

      scoped.debug('provider answered', {
        provider: provider.id,
        durationMs: Date.now() - startedAt,
        intent: completion.intent?.kind ?? 'none',
      });

      if (completion.intent && completion.intent.kind !== 'unknown') {
        // Executed locally, so a model can pick a capability but never define
        // one. Its own prose is discarded in favour of the deterministic
        // reply, which is the one that matches what actually happened.
        return local.resolve(completion.intent, request);
      }

      // Ungrounded provider prose can sound like an observation about the road.
      // Only locally resolved, supported intents are allowed into driver speech.
      return null;
    } catch (error) {
      const timedOut = deadline.signal.aborted && !request.signal?.aborted;
      scoped.warn('provider unavailable, answering locally', {
        provider: provider.id,
        timedOut,
        durationMs: Date.now() - startedAt,
        reason: String(error),
      });
      crashReporter.addBreadcrumb('ai provider fell back', { provider: provider.id });
      return null;
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener('abort', onCallerAbort);
    }
  };

  return {
    name: `gateway(${provider.id})`,

    async respond(request: ConversationRequest): Promise<ConversationReply> {
      memory = memory.filter(turn => Date.now() - turn.at < 300000).slice(-4);
      request = { ...request, context: { ...request.context, recentIntents: memory.map(({ kind, category }) => ({ kind, category })) } };
      const remember = (reply: ConversationReply) => {
        if (!request.signal?.aborted && reply.intent.kind !== 'unknown') memory.push({ at: Date.now(), kind: reply.intent.kind, ...(reply.intent.kind === 'find-nearby' ? { category: reply.intent.category } : {}) });
        return reply;
      };
      const safety = drivingSafetyReply(request.transcript);
      if (safety) return { speech: safety, intent: { kind: 'unknown' }, action: { type: 'none' }, referent: null };
      const localReply = await local.respond(request);

      // The parser understood it. Nothing a model could add is worth the
      // latency, and plenty could be worth the risk.
      if (localReply.intent.kind !== 'unknown') return remember(frenchReply(localReply, request));

      if (!provider.isConfigured()) {
        scoped.debug('no provider configured, staying local');
        return remember(frenchReply(localReply, request));
      }

      return remember(frenchReply((await askProvider(request)) ?? localReply, request));
    },
  };
};
