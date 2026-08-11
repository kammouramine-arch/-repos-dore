import type {
  NearbyCategory,
  RouteContext,
  SavedPlaceSlot,
  StopSuggestion,
} from '@/core/domain/entities/conversation';
import { describeDestination } from './destinationMatch';
import type { Place } from '@/core/domain/entities/place';
import { isHighlyRated } from './rankStops';
import { formatDistance, formatDuration, formatTimeOfDay } from '@/utils/format';

/**
 * Everything Avyro says in reply to a command.
 *
 * Pure, so the wording is testable and lives in one place — which is also what
 * makes it translatable later. Kept plain on purpose: this release ships an
 * interaction model, not a personality.
 */

/**
 * Each category as a countable noun.
 *
 * These are spoken after an article — "a highly rated …" — so "fuel" and
 * "parking" have to be things you can have one of. "I found a fuel ahead" is
 * what a driver actually heard before this.
 */
const CATEGORY_NOUNS: Record<NearbyCategory, string> = {
  restaurants: 'restaurant',
  coffee: 'coffee shop',
  fuel: 'petrol station',
  parking: 'car park',
};

const SLOT_NOUNS: Record<SavedPlaceSlot, string> = {
  home: 'home',
  work: 'work',
};

export const REPLIES = {
  notUnderstood: () => 'Sorry, I cannot help with that yet.',

  noTripRunning: () => 'No trip is running right now.',

  eta: (context: RouteContext): string => {
    if (context.remainingDurationSeconds === null || context.arrivalAt === null) {
      return REPLIES.noTripRunning();
    }

    const arrival = formatTimeOfDay(new Date(context.arrivalAt));
    const remaining = formatDuration(context.remainingDurationSeconds);
    return `You should arrive at ${arrival}, about ${remaining} from now.`;
  },

  remainingDistance: (context: RouteContext): string => {
    if (context.remainingDistanceMeters === null) return REPLIES.noTripRunning();

    const distance = formatDistance(context.remainingDistanceMeters, context.distanceUnit);
    const destination = context.destination?.name;
    return destination
      ? `${distance} to ${destination}.`
      : `${distance} to go.`;
  },

  navigationCancelled: () => 'Navigation cancelled.',
  nothingToCancel: () => 'There is no trip to cancel.',

  rerouting: () => 'Looking for another route.',
  nothingToReroute: () => 'Start a trip first and I can find another route.',

  headingToSaved: (slot: SavedPlaceSlot) => `Heading ${slot === 'home' ? 'home' : 'to work'}.`,

  savedPlaceMissing: (slot: SavedPlaceSlot) =>
    `I do not know where ${SLOT_NOUNS[slot]} is yet. You can set it in Settings.`,

  /**
   * The tradeoff, said the way a passenger would say it.
   *
   * Three facts in the order a driver cares about them: whether it is any good,
   * whether it is on the way, and what it costs. The name comes last because it
   * is the least useful part until the first three have been accepted.
   */
  stopSuggestion: (
    category: NearbyCategory,
    suggestion: StopSuggestion,
    context: RouteContext,
  ): string => {
    const noun = CATEGORY_NOUNS[category];
    const quality = isHighlyRated(suggestion.place.rating) ? 'a highly rated' : 'a';

    if (!context.isNavigating) {
      const away = formatDistance(suggestion.directDistanceMeters, context.distanceUnit);
      return `I found ${quality} ${noun} ${away} away — ${suggestion.place.name}. Say “take me there” and I will start.`;
    }

    const placement = suggestion.isAhead ? 'ahead on your route' : 'nearby';
    const minutes = Math.round(suggestion.detourSeconds / 60);
    const cost =
      minutes <= 0
        ? 'without adding any time'
        : minutes === 1
          ? 'that adds about a minute'
          : `that adds only ${minutes} minutes`;

    return `I found ${quality} ${noun} ${placement} ${cost} — ${suggestion.place.name}. Say “take me there” and I will reroute.`;
  },

  takingYouThere: (place: Place) => `Rerouting to ${place.name}.`,

  noReferent: () =>
    'I have not suggested anywhere yet. Ask me to find something first.',

  destinationChanged: (place: Place) => `Changing destination to ${place.name}.`,

  destinationRestored: (place: Place) => `Going back to ${place.name}.`,

  noPreviousDestination: () => 'I do not have an earlier destination to go back to.',

  /** The honest answer, plus the check Avyro can actually run. */
  fastestRouteConfirmed: () => 'You are on the fastest route I can find.',

  fasterRouteFound: (savedSeconds: number): string =>
    `I found a route about ${formatDuration(savedSeconds)} faster. Say “reroute” and I will switch.`,

  fastestRouteUnknown: () => 'I could not check the route just now.',

  /**
   * Live traffic is not available from the current routing provider, and
   * pretending otherwise would be the worst possible thing to do here: a driver
   * who is told "traffic is clear" will believe it.
   */
  trafficUnavailable: () =>
    'I cannot see live traffic yet. I can re-check your route for a faster one — just ask.',

  nearbyNotFound: (category: NearbyCategory) =>
    `I could not find a ${CATEGORY_NOUNS[category]} nearby.`,

  needLocation: () => 'I need your location before I can search nearby.',

  /** Confident: name what was chosen, so a wrong guess is caught by ear. */
  navigatingTo: (place: Place): string =>
    `Got it. Navigating you to ${describeDestination(place)}.`,

  /** Not confident: offer the best guess rather than drive to it. */
  destinationAmbiguous: (place: Place): string =>
    `I found ${describeDestination(place)}. Say “take me there” to go.`,

  destinationNotFound: (query: string): string =>
    `I could not find ${query}. Try naming the town or the street.`,

  searchFailed: () => 'I could not search just now. Try again in a moment.',
} as const;
