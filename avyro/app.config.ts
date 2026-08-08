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
  /**
   * The EAS account that owns the project, making it `@aminekm/avyro`.
   *
   * Stated rather than inferred: without it the slug resolves against
   * whichever account happens to be logged in, which is how a build ends up
   * attached to the wrong project. Paired with `extra.eas.projectId` below,
   * the association is unambiguous on any machine.
   */
  owner: 'aminekm',
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
    /**
     * The build number baseline.
     *
     * `eas.json` sets `appVersionSource: "remote"`, so EAS owns this counter
     * once the project is initialised and increments it per production build —
     * which is the right model for a TypeScript config, because EAS cannot
     * write an incremented value back into one.
     *
     * This value seeds that counter. TestFlight already holds build 8 for
     * version 1.0.0, and App Store Connect rejects a build number that is not
     * higher than one it already has, so the baseline has to start there and
     * autoIncrement makes the next upload 9. Verify with
     * `eas build:version:get --platform ios` before a release build.
     */
    buildNumber: '8',
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

  /**
   * Written by hand rather than by `eas init`: the CLI cannot edit a dynamic
   * TypeScript config, so it prints the id and expects this block to exist.
   */
  extra: {
    eas: {
      projectId: '491af16e-c8b0-46e4-b5c1-433d4d3602a8',
    },
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
