import type { NearbyCategory, RouteContext, SavedPlaceSlot } from '@/core/domain/entities/conversation';
import type { Place } from '@/core/domain/entities/place';
import { formatDistance, formatDuration, formatTimeOfDay } from '@/utils/format';

/**
 * Everything Avyro says in reply to a command.
 *
 * Pure, so the wording is testable and lives in one place — which is also what
 * makes it translatable later. Kept plain on purpose: this release ships an
 * interaction model, not a personality.
 */

const CATEGORY_NOUNS: Record<NearbyCategory, string> = {
  restaurants: 'restaurant',
  coffee: 'coffee',
  fuel: 'fuel',
  parking: 'parking',
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

  nearbyFound: (
    category: NearbyCategory,
    place: Place,
    distanceMeters: number | null,
    context: RouteContext,
  ): string => {
    const noun = CATEGORY_NOUNS[category];
    const proximity =
      distanceMeters === null
        ? ''
        : `, about ${formatDistance(distanceMeters, context.distanceUnit)} away`;

    return `The nearest ${noun} is ${place.name}${proximity}. Starting navigation.`;
  },

  nearbyNotFound: (category: NearbyCategory) =>
    `I could not find ${CATEGORY_NOUNS[category]} nearby.`,

  needLocation: () => 'I need your location before I can search nearby.',

  searchFailed: () => 'I could not search just now. Try again in a moment.',
} as const;
