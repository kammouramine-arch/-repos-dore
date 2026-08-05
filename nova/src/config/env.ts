/**
 * Public runtime configuration.
 *
 * Only `EXPO_PUBLIC_*` variables are readable from the JS bundle, and Babel
 * inlines them at build time — which is why every variable is referenced
 * statically here instead of through a dynamic lookup.
 *
 * Never put a secret in this file: everything below ships inside the app
 * binary and must be considered public.
 */

const readString = (value: string | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
};

export const env = {
  /** Geocoding / place search endpoint (Nominatim-compatible). */
  placesBaseUrl: readString(
    process.env.EXPO_PUBLIC_PLACES_BASE_URL,
    'https://nominatim.openstreetmap.org',
  ),
  /** Route planning endpoint (OSRM-compatible). */
  routingBaseUrl: readString(
    process.env.EXPO_PUBLIC_ROUTING_BASE_URL,
    'https://router.project-osrm.org',
  ),
  /**
   * Sent as `User-Agent` on every outbound request. Public OSM services
   * require a contactable identifier and will throttle anonymous traffic.
   */
  userAgent: readString(
    process.env.EXPO_PUBLIC_USER_AGENT,
    'NovaDrivingCompanion/1.0 (contact@nova.app)',
  ),
} as const;
