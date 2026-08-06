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
    'AvyroDrivingCompanion/1.0 (contact@avyro.app)',
  ),
  /**
   * Where AI requests go.
   *
   * This should be **your own gateway**, not `api.openai.com`. An API key
   * shipped inside a mobile binary is a key you have published: it can be
   * extracted from the bundle in minutes and billed to you indefinitely. The
   * proxy holds the credential, applies your rate limits, and is the only
   * place a provider can be swapped without shipping an app update.
   *
   * Empty by default, which is why a stock build answers deterministically.
   */
  aiGatewayUrl: readString(process.env.EXPO_PUBLIC_AI_GATEWAY_URL, ''),

  /**
   * Direct provider key, for local development only.
   *
   * Set this and the app talks to the provider directly, bypassing your proxy.
   * Never set it in a build you distribute — see above.
   */
  aiApiKey: readString(process.env.EXPO_PUBLIC_AI_API_KEY, ''),

  aiModel: readString(process.env.EXPO_PUBLIC_AI_MODEL, ''),
} as const;
