import type { ExpoConfig } from 'expo/config';

/**
 * Expo configuration.
 *
 * This is a `.ts` config rather than `app.json` because the Google Maps key is
 * read from the build environment — keys must never be committed. Everything
 * else is static.
 *
 * Required for Android builds: `GOOGLE_MAPS_ANDROID_API_KEY`.
 * iOS uses Apple Maps and needs no key.
 */

const BACKGROUND = '#050609';

const LOCATION_REASON =
  'Nova uses your location to show where you are, plan routes and guide you turn by turn while you drive.';

const config: ExpoConfig = {
  name: 'Nova',
  slug: 'nova',
  version: '1.0.0',
  scheme: 'nova',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  backgroundColor: BACKGROUND,
  icon: './assets/icon.png',
  assetBundlePatterns: ['**/*'],

  ios: {
    bundleIdentifier: 'app.novadrive.companion',
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: LOCATION_REASON,
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: 'app.novadrive.companion',
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: BACKGROUND,
    },
  },

  web: {
    favicon: './assets/favicon.png',
  },

  plugins: [
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 180,
        resizeMode: 'contain',
        backgroundColor: BACKGROUND,
      },
    ],
    ['expo-location', { locationWhenInUsePermission: LOCATION_REASON }],
    [
      'react-native-maps',
      { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY },
    ],
    'expo-secure-store',
  ],
};

export default config;
