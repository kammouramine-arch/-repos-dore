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
  | { kind: 'find-nearby'; category: NearbyCategory }
  | { kind: 'ask-eta' }
  | { kind: 'ask-remaining-distance' }
  | { kind: 'cancel-navigation' }
  | { kind: 'reroute' }
  | { kind: 'unknown' };

export type NearbyCategory = 'restaurants' | 'coffee' | 'fuel' | 'parking';

/** What the app should do once the reply has been spoken. */
export type ConversationAction =
  | { type: 'none' }
  | { type: 'navigate-to'; place: Place }
  | { type: 'cancel-navigation' }
  | { type: 'reroute' };

/** One answer from a conversation provider: something to say, something to do. */
export interface ConversationReply {
  speech: string;
  action: ConversationAction;
  /** What the provider understood, for logging and future analytics. */
  intent: VoiceIntent;
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
  route: Route | null;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  /** Estimated arrival, as epoch milliseconds. */
  arrivalAt: number | null;
  distanceUnit: DistanceUnit;
  /** True when a trip is actually running, as opposed to merely planned. */
  isNavigating: boolean;
}

export interface ConversationRequest {
  transcript: string;
  context: RouteContext;
  /** Where the driver is, for anything that means "near me". */
  origin: Coordinates | null;
  signal?: AbortSignal;
}
