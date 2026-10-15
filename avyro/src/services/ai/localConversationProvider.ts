import { distanceBetween } from '@/utils/geo';
import { normaliseUtterance } from '@/core/conversation/wakePhrase';
import { canReportIncident } from '@/core/navigation/reportEligibility';
import type { UserPosition } from '@/core/domain/entities/geo';
import type { IncidentReporter } from '@/core/domain/ports/incidentReporter';
import { parseCommand } from '@/core/conversation/commandParser';
import { isConfidentMatch, rankDestinationCandidates } from '@/core/conversation/destinationMatch';
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
import type { PlacesProvider } from '@/core/domain/ports/placesProvider';
import type { RoutingProvider } from '@/core/domain/ports/routingProvider';
import type { SavedPlacesRepository } from '@/core/domain/ports/savedPlacesRepository';
import type { StopRecommender } from '@/services/conversation/routeAwareRecommender';

/** A faster route has to save at least this much to be worth mentioning. */
const WORTHWHILE_SAVING_SECONDS = 120;

export interface LocalConversationProviderOptions {
  incidentReporter?: IncidentReporter;
  getPosition?: () => Promise<UserPosition>;
  recommender: StopRecommender;
  routingProvider: RoutingProvider;
  /** The same geocoder the search screen uses. There is only one. */
  placesProvider: PlacesProvider;
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
  incidentReporter,
  getPosition,
  recommender,
  routingProvider,
  placesProvider,
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
        waypoints: context.stops?.map(stop => stop.coordinates),
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

  /**
   * "Take me to Lille" — the voice path into the app's own geocoder.
   *
   * The voice layer asks; the routing system resolves and executes. This
   * returns a `navigate-to` action carrying a real `Place`, which is the same
   * action a tap on a search result produces and runs through the same
   * `planTrip` pipeline. There is no second navigation system here.
   */
  const goToPlace = async (
    intent: Extract<VoiceIntent, { kind: 'navigate-to-place' }>,
    { context, origin, signal }: ConversationRequest,
  ): Promise<ConversationReply> => {
    try {
      const found = await placesProvider.search(intent.query, {
        near: origin ?? context.location ?? undefined,
        limit: 25,
        signal,
      });

      const results = rankDestinationCandidates(intent.query, found, origin ?? context.location);
      const [best] = results;
      if (!best) return reply(intent, REPLIES.destinationNotFound(intent.query));

      // Not confident enough to move a car: name the guess and let the driver
      // confirm with "take me there", which is the referent path already built
      // for suggestions.
      if (!isConfidentMatch(intent.query, results)) {
        return reply(intent, REPLIES.destinationAmbiguous(best), { type: 'none' }, best);
      }

      const speech = context.isNavigating
        ? REPLIES.destinationChanged(best)
        : REPLIES.navigatingTo(best);

      return reply(intent, speech, { type: 'navigate-to', place: best });
    } catch (error) {
      scoped.warn('destination search failed', {
        query: intent.query,
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
      const text = normaliseUtterance(request.transcript);
      if (/^(?:actually )?(?:find |take me |i changed my mind )?(?:somewhere closer|something closer|a closer one|closer|plus pres|quelque chose de plus proche|trouve plus pres)$/.test(text)) {
        const category = [...(request.context.recentIntents ?? [])].reverse().find(turn => turn.kind === 'find-nearby' && turn.category)?.category;
        const previous = request.context.referent;
        const here = request.context.location;
        if (!category || !previous || !here) return reply({ kind: 'unknown' }, 'Ask me to find a place first, then ask for somewhere closer.');
        const intent: VoiceIntent = { kind: 'find-nearby', category };
        try {
          const candidates = await recommender.suggest(category, request.context, request.signal);
          const previousDistance = distanceBetween(here, previous.coordinates);
          const closer = candidates.filter(candidate => candidate.place.id !== previous.id && candidate.directDistanceMeters + 25 < previousDistance).sort((a, b) => a.directDistanceMeters - b.directDistanceMeters)[0];
          return closer ? reply(intent, REPLIES.stopSuggestion(category, closer, request.context), { type: 'none' }, closer.place) : reply(intent, 'I could not verify a closer option.');
        } catch { return reply(intent, REPLIES.searchFailed()); }
      }
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
      case 'set-route-preference':
        return reply(intent, 'I’m updating your route preferences.', { type: 'set-route-preference', preference: intent.preference, enabled: intent.enabled });
      case 'ask-next-maneuver':
        return reply(intent, context.nextInstruction ?? 'There is no current maneuver to read.');
      case 'report-incident': {
        const french = /signal/i.test(request.transcript);
        const say = (en: string, fr: string) => ({ ...reply(intent, french ? fr : en), language: french ? 'fr-FR' as const : 'en-US' as const });
        if (intent.category === 'police') return say('Enforcement reporting is unavailable until regional rules are configured.', 'Les signalements de contrôles sont indisponibles tant que les règles locales ne sont pas configurées.');
        if (!incidentReporter?.isConfigured() || !getPosition) return say('Reports are unavailable right now.', 'Les signalements sont indisponibles pour le moment.');
        try {
          const fix = await getPosition();
          if (request.signal?.aborted) throw new Error('Cancelled');
          if (!canReportIncident(fix, Date.now())) return say('I need a usable GPS location to place that report.', 'J’ai besoin d’une position GPS utilisable pour placer ce signalement.');
          await incidentReporter.submit(intent.category, fix);
          return say('Your report is now on the community map for one hour, marked unverified.', 'Votre signalement est visible pendant une heure sur la carte communautaire, sans vérification.');
        } catch { return say('The report was not sent. Please try again.', 'Le signalement n’a pas été envoyé. Réessayez.'); }
      }
      case 'navigate-saved':
        return goToSaved(intent, request);

      case 'navigate-to-place':
        return goToPlace(intent, request);

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

      case 'ask-location':
        return reply(intent, context.currentRoadName
          ? `The route map shows ${context.currentRoadName}.`
          : context.location ? 'Your GPS location is shown on the map. I do not have a verified street name right now.' : REPLIES.needLocation());

      case 'ask-speed-limit': {
        const french = /\b(quelle|vitesse|limitation|limite)\b/i.test(request.transcript);
        const limit = context.mappedSpeedLimit;
        if (limit?.unit === 'km/h' && context.probationaryMaximumKmh != null && context.probationaryMaximumKmh < limit.value) return reply(intent, french ? `La carte indique ${limit.value} kilomètres par heure. Votre maximum probatoire est de ${context.probationaryMaximumKmh}. Suivez les panneaux.` : `The map indicates ${limit.value} kilometers per hour. Your probationary maximum is ${context.probationaryMaximumKmh}. Follow posted signs.`);
        return reply(intent, limit
          ? french ? `${limit.source === 'municipal-order' ? 'L’arrêté municipal indique' : 'La carte TomTom indique'} ${limit.value} ${limit.unit}. Suivez toujours les panneaux routiers.` : `${limit.source === 'municipal-order' ? 'The municipal order indicates' : 'The TomTom map indicates'} ${limit.value} ${limit.unit}. Always follow posted road signs.`
          : french ? 'Je n’ai pas de limitation de vitesse vérifiée ici. Suivez les panneaux routiers.' : 'I do not have a verified speed limit here. Please follow posted road signs.');
      }

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
