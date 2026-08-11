import type { Coordinates } from './geo';
import type { Place } from './place';
import type { DistanceUnit } from './preferences';
import type { NavigationStatus } from './navigation';
import type { Route } from './route';

/**
 * The seven states a conversation can be in.
 *
 * `navigation-interrupt` and `resuming` exist because guidance always wins:
 * a maneuver announcement cuts across whatever Avyro was doing, and the
 * conversation picks up where it left off afterwards.
 */
export type ConversationStatus =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'navigation-interrupt'
  | 'resuming'
  | 'cancelled';

/** The activities a navigation interrupt can suspend and later restore. */
export type ResumableActivity = 'listening' | 'thinking' | 'speaking';

/** A saved location the driver can reach by name. */
export type SavedPlaceSlot = 'home' | 'work';

/**
 * What the driver asked for, once the transcript has been understood.
 *
 * Parsing happens on-device and deterministically: "cancel navigation" must
 * never depend on a network round trip, and a driver at 110 km/h should not
 * wait on a model to be told how far is left.
 */
export type VoiceIntent =
  | { kind: 'navigate-saved'; slot: SavedPlaceSlot }
  /**
   * "Take me to Lille" — a destination named in words, not from a slot.
   *
   * The intent carries only what the driver said. Turning that string into a
   * place on the map is the app's job, never the voice layer's: the same
   * geocoder and the same routing pipeline the search screen uses.
   */
  | { kind: 'navigate-to-place'; query: string }
  | { kind: 'find-nearby'; category: NearbyCategory }
  | { kind: 'ask-eta' }
  | { kind: 'ask-remaining-distance' }
  | { kind: 'ask-fastest-route' }
  | { kind: 'ask-traffic' }
  | { kind: 'cancel-navigation' }
  | { kind: 'reroute' }
  /** "Take me there" — the place Avyro last named. */
  | { kind: 'navigate-referent' }
  /** "Go back to my original destination." */
  | { kind: 'restore-destination' }
  | { kind: 'unknown' };

/** Every intent kind, for provider schemas and exhaustive checks. */
export const VOICE_INTENT_KINDS = [
  'navigate-saved',
  'navigate-to-place',
  'find-nearby',
  'ask-eta',
  'ask-remaining-distance',
  'ask-fastest-route',
  'ask-traffic',
  'cancel-navigation',
  'reroute',
  'navigate-referent',
  'restore-destination',
  'unknown',
] as const;

export type NearbyCategory = 'restaurants' | 'coffee' | 'fuel' | 'parking';

/** What the app should do once the reply has been spoken. */
export type ConversationAction =
  | { type: 'none' }
  | { type: 'navigate-to'; place: Place }
  | { type: 'cancel-navigation' }
  | { type: 'reroute' }
  /** Swap the active route for a faster one already computed. */
  | { type: 'switch-route'; route: Route };

/** One answer from a conversation provider: something to say, something to do. */
export interface ConversationReply {
  speech: string;
  action: ConversationAction;
  /** What the provider understood, for logging and future analytics. */
  intent: VoiceIntent;
  /**
   * The place this reply named, if any.
   *
   * What "take me there" resolves against. Held for the next turn only — it is
   * anaphora, not memory: nothing about the driver is retained, nothing is
   * persisted, and it is cleared as soon as a destination is chosen.
   */
  referent: Place | null;
}

/**
 * Everything Avyro knows about the drive in progress.
 *
 * Assembled fresh for every request so a provider — local today, a model
 * tomorrow — can answer without reaching into application state itself.
 */
export interface RouteContext {
  navigationState: NavigationStatus;
  destination: Place | null;
  /** The destination this trip replaced, restorable by voice. */
  previousDestination: Place | null;
  route: Route | null;
  /** Where the driver is right now. */
  location: Coordinates | null;
  /** Course over ground in degrees from true north, when it is known. */
  headingDegrees: number | null;
  /** The place Avyro last recommended, which "take me there" refers to. */
  referent: Place | null;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  /** Estimated arrival, as epoch milliseconds. */
  arrivalAt: number | null;
  distanceUnit: DistanceUnit;
  /** True when a trip is actually running, as opposed to merely planned. */
  isNavigating: boolean;
}

/**
 * A candidate stop, measured against the drive rather than against the driver.
 *
 * "Two kilometres away" is the wrong number when it is two kilometres
 * backwards. What matters is what stopping there costs.
 */
export interface StopSuggestion {
  place: Place;
  /** Extra driving time the detour adds, in seconds. */
  detourSeconds: number;
  /** Extra driving distance the detour adds, in metres. */
  detourMeters: number;
  /** True when the stop lies further along the route than the driver is. */
  isAhead: boolean;
  /** Straight-line distance from the driver, for the "nothing planned" case. */
  directDistanceMeters: number;
}

export interface ConversationRequest {
  transcript: string;
  context: RouteContext;
  /** Where the driver is, for anything that means "near me". */
  origin: Coordinates | null;
  signal?: AbortSignal;
}
