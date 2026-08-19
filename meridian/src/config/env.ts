import Constants from 'expo-constants';

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  analyticsEnabled?: boolean;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/**
 * Public runtime configuration. Only publishable values live here — the anon key is
 * safe on the client because every table is protected by row level security.
 * Secrets (AI provider keys, service role key) exist only as Supabase Edge Function
 * secrets and are never bundled into the app.
 */
export const env = {
  supabaseUrl: extra.supabaseUrl ?? '',
  supabaseAnonKey: extra.supabaseAnonKey ?? '',
  analyticsEnabled: extra.analyticsEnabled ?? true,
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

/** Human readable explanation shown in the UI when configuration is missing. */
export const missingConfigMessage =
  'Backend is not configured. Copy .env.example to .env and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart the dev server.';
