import { CONVERSATION } from '@/config';
import { parseCommand } from '@/core/conversation/commandParser';
import { REPLIES } from '@/core/conversation/replyText';
import type {
  ConversationReply,
  ConversationRequest,
  NearbyCategory,
  VoiceIntent,
} from '@/core/domain/entities/conversation';
import type { Coordinates } from '@/core/domain/entities/geo';
import type { Place } from '@/core/domain/entities/place';
import type { ConversationProvider } from '@/core/domain/ports/conversationProvider';
import type { Logger } from '@/core/domain/ports/logger';
import type { PlacesProvider } from '@/core/domain/ports/placesProvider';
import type { SavedPlacesRepository } from '@/core/domain/ports/savedPlacesRepository';
import { distanceBetween } from '@/utils/geo';

/** What each category is actually searched for. */
const SEARCH_TERMS: Record<NearbyCategory, string> = {
  restaurants: 'restaurant',
  coffee: 'cafe',
  fuel: 'fuel station',
  parking: 'parking',
};

export interface LocalConversationProviderOptions {
  placesProvider: PlacesProvider;
  savedPlaces: SavedPlacesRepository;
  logger: Logger;
}

const nearest = (places: Place[], origin: Coordinates): Place | null =>
  places.reduce<Place | null>(
    (closest, place) =>
      !closest ||
      distanceBetween(origin, place.coordinates) <
        distanceBetween(origin, closest.coordinates)
        ? place
        : closest,
    null,
  );

/**
 * The provider that ships with Release 0.2.
 *
 * It understands Avyro's command vocabulary and answers from the route context
 * — no model, no network, no latency, and the same answer every time. That is
 * the right default for a driving app: the commands that matter most are the
 * ones you cannot afford to get wrong or to wait for.
 *
 * A hosted model is another implementation of `ConversationProvider`. When one
 * arrives it should sit *behind* this one, not replace it: control commands
 * stay local, and everything this provider returns as `unknown` becomes the
 * model's territory.
 */
export const createLocalConversationProvider = ({
  placesProvider,
  savedPlaces,
  logger,
}: LocalConversationProviderOptions): ConversationProvider => {
  const scoped = logger.scoped('ai.local');

  const reply = (
    intent: VoiceIntent,
    speech: string,
    action: ConversationReply['action'] = { type: 'none' },
  ): ConversationReply => ({ intent, speech, action });

  const findNearby = async (
    intent: Extract<VoiceIntent, { kind: 'find-nearby' }>,
    { origin, context, signal }: ConversationRequest,
  ): Promise<ConversationReply> => {
    if (!origin) return reply(intent, REPLIES.needLocation());

    try {
      const results = await placesProvider.search(SEARCH_TERMS[intent.category], {
        near: origin,
        limit: CONVERSATION.nearbyResultLimit,
        signal,
      });

      const closest = nearest(results, origin);
      if (!closest) return reply(intent, REPLIES.nearbyNotFound(intent.category));

      return reply(
        intent,
        REPLIES.nearbyFound(
          intent.category,
          closest,
          distanceBetween(origin, closest.coordinates),
          context,
        ),
        { type: 'navigate-to', place: closest },
      );
    } catch (error) {
      scoped.warn('nearby search failed', {
        category: intent.category,
        reason: String(error),
      });
      return reply(intent, REPLIES.searchFailed());
    }
  };

  const forSavedPlace = async (
    intent: Extract<VoiceIntent, { kind: 'navigate-saved' }>,
  ): Promise<ConversationReply> => {
    const place = await savedPlaces.get(intent.slot);

    return place
      ? reply(intent, REPLIES.headingToSaved(intent.slot), {
          type: 'navigate-to',
          place,
        })
      : reply(intent, REPLIES.savedPlaceMissing(intent.slot));
  };

  return {
    name: 'local-commands',

    async respond(request: ConversationRequest): Promise<ConversationReply> {
      const intent = parseCommand(request.transcript);
      const { context } = request;
      scoped.debug('understood', { kind: intent.kind });

      switch (intent.kind) {
        case 'navigate-saved':
          return forSavedPlace(intent);

        case 'find-nearby':
          return findNearby(intent, request);

        case 'ask-eta':
          return reply(intent, REPLIES.eta(context));

        case 'ask-remaining-distance':
          return reply(intent, REPLIES.remainingDistance(context));

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
    },
  };
};
