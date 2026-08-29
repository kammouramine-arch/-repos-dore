import Constants from 'expo-constants';

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  analyticsEnabled?: boolean;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/**
 * Public runtime configuration, read from two independent sources.
 *
 * `babel-preset-expo` replaces any literal `process.env.EXPO_PUBLIC_*` reference in app
 * code with its value while bundling, so the first branch below is baked into the
 * JavaScript itself. The second branch reads the same value out of the app manifest,
 * where `app.config.ts` put it.
 *
 * Both paths start from the same variable in `eas.json`, but they survive different
 * failures: the inlined constant does not depend on the manifest being present or
 * readable at runtime, and the manifest still works if the bundle was built without the
 * variable in scope. A TestFlight build shipped with an empty configuration because the
 * manifest was the only source; one source is not enough for a value the whole app
 * needs to start.
 *
 * These must be written as literal member expressions. `process.env[name]` is not
 * replaced by the bundler, so a dynamic lookup would silently read nothing in a release
 * build — which is the failure this redundancy exists to prevent.
 *
 * Only publishable values live here. The anon key is safe on the client because every
 * table is protected by row level security. Secrets — AI provider keys, the service role
 * key — exist only as Supabase Edge Function secrets and are never bundled into the app.
 */
const inlined = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  analyticsEnabled: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED,
};

/** An empty string is as useless as an absent one, so both fall through. */
function firstUsable(...values: (string | undefined)[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return '';
}

export const env = {
  supabaseUrl: firstUsable(inlined.supabaseUrl, extra.supabaseUrl),
  supabaseAnonKey: firstUsable(inlined.supabaseAnonKey, extra.supabaseAnonKey),
  analyticsEnabled:
    inlined.analyticsEnabled !== undefined
      ? inlined.analyticsEnabled !== 'false'
      : (extra.analyticsEnabled ?? true),
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

/** Which source answered. Reported by the diagnostics screen, never the values. */
export const configSource: 'inlined' | 'manifest' | 'none' = firstUsable(inlined.supabaseUrl)
  ? 'inlined'
  : firstUsable(extra.supabaseUrl)
    ? 'manifest'
    : 'none';

/** Human readable explanation shown in the UI when configuration is missing. */
export const missingConfigMessage =
  'Backend is not configured. Copy .env.example to .env and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart the dev server.';
