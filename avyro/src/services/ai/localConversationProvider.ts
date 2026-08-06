import { parseCommand } from '@/core/conversation/commandParser';
import { REPLIES } from '@/core/conversation/replyText';
import type {
  ConversationReply,
  ConversationRequest,
  VoiceIntent,
} from '@/core/domain/entities/conversation';
import type {
  ConversationProvider,
  IntentResolver,
} from '@/core/domain/ports/conversationProvider';
import type { Logger } from '@/core/domain/ports/logger';
import type { RoutingProvider } from '@/core/domain/ports/routingProvider';
import type { SavedPlacesRepository } from '@/core/domain/ports/savedPlacesRepository';
import type { StopRecommender } from '@/services/conversation/routeAwareRecommender';

/** A faster route has to save at least this much to be worth mentioning. */
const WORTHWHILE_SAVING_SECONDS = 120;

export interface LocalConversationProviderOptions {
  recommender: StopRecommender;
  routingProvider: RoutingProvider;
  savedPlaces: SavedPlacesRepository;
  logger: Logger;
}

/**
 * The deterministic resolver.
 *
 * Everything Avyro can answer without a model, answered without one: control
 * commands, trip questions, and stop suggestions. No network beyond the maps it
 * already uses, no latency budget, and the same answer every time.
 *
 * The gateway calls this first and treats `unknown` as the only thing worth
 * asking a model about. That ordering is the safety argument: nothing a model
 * says can change what "cancel navigation" does.
 */
export const createLocalConversationProvider = ({
  recommender,
  routingProvider,
  savedPlaces,
  logger,
}: LocalConversationProviderOptions): ConversationProvider & IntentResolver => {
  const scoped = logger.scoped('ai.local');

  const reply = (
    intent: VoiceIntent,
    speech: string,
    action: ConversationReply['action'] = { type: 'none' },
    referent: ConversationReply['referent'] = null,
  ): ConversationReply => ({ intent, speech, action, referent });

  /** Re-plans from here and reports whether anything better exists. */
  const checkFastestRoute = async (
    intent: VoiceIntent,
    { context, signal }: ConversationRequest,
  ): Promise<ConversationReply> => {
    if (!context.isNavigating || !context.location || !context.destination) {
      return reply(intent, REPLIES.noTripRunning());
    }

    try {
      const routes = await routingProvider.getRoutes({
        origin: context.location,
        destination: context.destination.coordinates,
        alternatives: true,
        signal,
      });

      const best = routes[0];
      const current = context.remainingDurationSeconds;
      if (!best || current === null) return reply(intent, REPLIES.fastestRouteUnknown());

      const saving = current - best.durationSeconds;
      return saving >= WORTHWHILE_SAVING_SECONDS
        ? reply(intent, REPLIES.fasterRouteFound(saving), {
            type: 'switch-route',
            route: best,
          })
        : reply(intent, REPLIES.fastestRouteConfirmed());
    } catch (error) {
      scoped.warn('fastest-route check failed', { reason: String(error) });
      return reply(intent, REPLIES.fastestRouteUnknown());
    }
  };

  const suggestStop = async (
    intent: Extract<VoiceIntent, { kind: 'find-nearby' }>,
    { context, signal }: ConversationRequest,
  ): Promise<ConversationReply> => {
    if (!context.location) return reply(intent, REPLIES.needLocation());

    try {
      const [best] = await recommender.suggest(intent.category, context, signal);
      if (!best) return reply(intent, REPLIES.nearbyNotFound(intent.category));

      // Suggest, do not commit. Rerouting a moving car on the strength of one
      // heard word is not helpfulness, it is presumption — the driver confirms
      // with "take me there", which is why the place becomes the referent.
      return reply(
        intent,
        REPLIES.stopSuggestion(intent.category, best, context),
        { type: 'none' },
        best.place,
      );
    } catch (error) {
      scoped.warn('stop suggestion failed', {
        category: intent.category,
        reason: String(error),
      });
      return reply(intent, REPLIES.searchFailed());
    }
  };

  const goToSaved = async (
    intent: Extract<VoiceIntent, { kind: 'navigate-saved' }>,
    { context }: ConversationRequest,
  ): Promise<ConversationReply> => {
    const place = await savedPlaces.get(intent.slot);
    if (!place) return reply(intent, REPLIES.savedPlaceMissing(intent.slot));

    // Mid-trip this is a change of plan, not a fresh start — say so, so the
    // driver knows the old destination was replaced and can ask for it back.
    const speech = context.isNavigating
      ? REPLIES.destinationChanged(place)
      : REPLIES.headingToSaved(intent.slot);

    return reply(intent, speech, { type: 'navigate-to', place });
  };

  return {
    name: 'local-commands',

    async respond(request: ConversationRequest): Promise<ConversationReply> {
      return resolveIntent(parseCommand(request.transcript), request);
    },

    resolve: resolveIntent,
  };

  /**
   * Shared by the parser and the gateway: a model that classifies an utterance
   * gets its intent executed through exactly this path, never its own.
   */
  async function resolveIntent(
    intent: VoiceIntent,
    request: ConversationRequest,
  ): Promise<ConversationReply> {
    const { context } = request;
    scoped.debug('resolving', { kind: intent.kind });

    switch (intent.kind) {
      case 'navigate-saved':
        return goToSaved(intent, request);

      case 'find-nearby':
        return suggestStop(intent, request);

      case 'navigate-referent':
        return context.referent
          ? reply(intent, REPLIES.takingYouThere(context.referent), {
              type: 'navigate-to',
              place: context.referent,
            })
          : reply(intent, REPLIES.noReferent());

      case 'restore-destination':
        return context.previousDestination
          ? reply(
              intent,
              REPLIES.destinationRestored(context.previousDestination),
              { type: 'navigate-to', place: context.previousDestination },
            )
          : reply(intent, REPLIES.noPreviousDestination());

      case 'ask-eta':
        return reply(intent, REPLIES.eta(context));

      case 'ask-remaining-distance':
        return reply(intent, REPLIES.remainingDistance(context));

      case 'ask-fastest-route':
        return checkFastestRoute(intent, request);

      case 'ask-traffic':
        return reply(intent, REPLIES.trafficUnavailable());

      case 'cancel-navigation':
        return context.route
          ? reply(intent, REPLIES.navigationCancelled(), { type: 'cancel-navigation' })
          : reply(intent, REPLIES.nothingToCancel());

      case 'reroute':
        return context.isNavigating
          ? reply(intent, REPLIES.rerouting(), { type: 'reroute' })
          : reply(intent, REPLIES.nothingToReroute());

      default:
        return reply(intent, REPLIES.notUnderstood());
    }
  }
};
