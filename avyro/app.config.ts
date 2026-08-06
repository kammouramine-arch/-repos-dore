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

const MICROPHONE_REASON =
  'Avyro listens for “Hey Avyro” so you can ask for directions without taking your hands off the wheel.';

const SPEECH_REASON =
  'Avyro turns what you say into commands like “take me home” and “how far is it”.';

const LOCATION_REASON =
  'Avyro uses your location to show where you are, plan routes and guide you turn by turn while you drive.';

const config: ExpoConfig = {
  name: 'Avyro',
  slug: 'avyro',
  version: '1.0.0',
  scheme: 'avyro',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  backgroundColor: BACKGROUND,
  icon: './assets/icon.png',
  assetBundlePatterns: ['**/*'],

  ios: {
    bundleIdentifier: 'app.avyro.companion',
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: LOCATION_REASON,
      NSMicrophoneUsageDescription: MICROPHONE_REASON,
      NSSpeechRecognitionUsageDescription: SPEECH_REASON,
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: 'app.avyro.companion',
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'RECORD_AUDIO'],
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
      'expo-speech-recognition',
      {
        microphonePermission: MICROPHONE_REASON,
        speechRecognitionPermission: SPEECH_REASON,
      },
    ],
    [
      'react-native-maps',
      { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY },
    ],
    'expo-secure-store',
  ],
};

export default config;
