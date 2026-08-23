import type { ExpoConfig } from 'expo/config';
import brand from './src/config/brand.json';

/**
 * Expo config is generated from the brand file, so renaming the product is a one-file change.
 * Public env vars are surfaced through `extra` and read by src/config/env.ts.
 */
const config: ExpoConfig = {
  name: brand.name,
  slug: brand.slug,
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
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    analyticsEnabled: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED !== 'false',
    eas: { projectId: process.env.EAS_PROJECT_ID ?? undefined },
  },
};

export default config;
