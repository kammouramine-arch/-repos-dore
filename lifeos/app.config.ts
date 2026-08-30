import type { ExpoConfig } from 'expo/config';
import brand from './src/config/brand.json';

/**
 * Expo config is generated from the brand file, so renaming the product is a one-file change.
 * Public env vars are surfaced through `extra` and read by src/config/env.ts.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/*
  A production build without a backend is worse than a failed one.

  It compiles, uploads, passes review queueing, installs from TestFlight, and only then
  tells the person holding the phone that the backend is not configured — by which point
  a build number has been burned and the loop is hours long. Failing here costs seconds.

  Only the production environment is guarded: `npx expo config`, the test suite and a
  local dev server all evaluate this file with no APP_ENV set and must keep working.
*/
if (process.env.APP_ENV === 'production' && !(supabaseUrl && supabaseAnonKey)) {
  const missing = [
    supabaseUrl ? null : 'EXPO_PUBLIC_SUPABASE_URL',
    supabaseAnonKey ? null : 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean);
  throw new Error(
    `Refusing to configure a production build without ${missing.join(' and ')}. ` +
      'These are set in the production profile of eas.json; a build without them ships ' +
      'an app that cannot reach its backend.',
  );
}

const config: ExpoConfig = {
  name: brand.name,
  slug: brand.slug,
  // The Expo account that owns the EAS project. Required for a team-owned project:
  // without it the CLI resolves the slug against the personal account and cannot
  // find it.
  owner: 'aminekms-team',
  scheme: brand.scheme,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: brand.bundleIdentifier,
    infoPlist: {
      NSMicrophoneUsageDescription:
        'Used only when you hold the microphone button to speak to your planner.',
      // No background modes are declared: notifications are scheduled locally, and
      // nothing sends silent pushes. Declaring one we do not use invites a review
      // question we cannot answer honestly.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: brand.androidPackage,
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#0E1014',
    },
    permissions: [
      'RECORD_AUDIO',
      'POST_NOTIFICATIONS',
      'SCHEDULE_EXACT_ALARM',
      'com.android.vending.BILLING',
    ],
  },
  web: { favicon: './assets/favicon.png', bundler: 'metro' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-audio',
      { microphonePermission: 'Allow $(PRODUCT_NAME) to record your voice notes.' },
    ],
    [
      'expo-notifications',
      { color: '#5B63E8', defaultChannel: 'default' },
    ],
    // StoreKit 2 and Play Billing. Native, so purchases need a development or store
    // build — in Expo Go the app says so rather than pretending.
    'expo-iap',
    [
      'expo-splash-screen',
      { image: './assets/splash-icon.png', resizeMode: 'contain', backgroundColor: '#0E1014' },
    ],
  ],
  experiments: { typedRoutes: false },
  extra: {
    supabaseUrl,
    supabaseAnonKey,
    analyticsEnabled: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED !== 'false',
    /*
      The EAS project this app builds under. `eas init` writes this into a static
      app.json, but cannot edit a dynamic config, so it is set here. The environment
      override is kept so a fork or a second project can point elsewhere without a
      code change.
    */
    eas: { projectId: process.env.EAS_PROJECT_ID ?? 'c382faf5-b61d-48b1-bdd7-bef97a841af2' },
  },
};

export default config;
