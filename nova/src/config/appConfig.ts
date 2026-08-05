/**
 * Application-wide tuning constants.
 *
 * Values that a product or engineering decision can change live here rather
 * than being scattered as magic numbers across the feature code.
 */

export const APP_INFO = {
  name: 'Nova',
  tagline: 'Your AI driving companion',
  version: '1.0.0',
} as const;

export const NETWORK = {
  /** Hard ceiling for any single HTTP request. */
  timeoutMs: 12_000,
  /** Public OSM services are rate limited to ~1 request per second. */
  searchDebounceMs: 350,
  minSearchQueryLength: 2,
  maxSearchResults: 8,
} as const;

export const MAP_DEFAULTS = {
  /** Roughly a city block — used when we first lock onto the driver. */
  zoomedInDelta: 0.008,
  /** Fallback camera when no location fix is available yet (Paris). */
  fallbackRegion: {
    latitude: 48.8566,
    longitude: 2.3522,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25,
  },
  /** Padding applied when fitting a whole route on screen. */
  routeFitPadding: { top: 140, right: 64, bottom: 320, left: 64 },
  /** Camera used while actively guiding the driver. */
  navigationCamera: { pitch: 55, zoom: 17.5, altitude: 320 },
} as const;

export const NAVIGATION = {
  /** Distance from the polyline beyond which we treat the driver as off-route. */
  offRouteThresholdMeters: 55,
  /** Consecutive off-route fixes required before we act — GPS noise is real. */
  offRouteConfirmations: 3,
  /** Distance to the destination that counts as an arrival. */
  arrivalThresholdMeters: 35,
  /** Location updates: every 2 s or every 5 m, whichever comes first. */
  locationIntervalMs: 2_000,
  locationDistanceMeters: 5,
  /** Spoken guidance is triggered as the driver crosses these distances. */
  announcementDistancesMeters: [1_500, 500, 180, 45],
} as const;

export const STORAGE_KEYS = {
  accounts: 'nova.auth.accounts',
  session: 'nova.auth.session',
  preferences: 'nova.preferences',
  onboarding: 'nova.onboarding.completed',
  recentDestinations: 'nova.destinations.recent',
} as const;
