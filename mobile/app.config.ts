import type { ExpoConfig } from 'expo/config';

/**
 * Configuration DEVISIA mobile.
 *
 * L'URL de l'API est injectée à la construction : une même base de code sert
 * le développement local, les builds de préversion et la production.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const VERSION = '1.0.0';

const config: ExpoConfig = {
  name: 'DEVISIA',
  slug: 'devisia',
  version: VERSION,
  orientation: 'portrait',
  scheme: 'devisia',
  userInterfaceStyle: 'light',
  primaryColor: '#2547E0',
  icon: './assets/icon.png',
  assetBundlePatterns: ['**/*'],

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'fr.devisia.app',
    buildNumber: VERSION,
    associatedDomains: ['applinks:devisia.fr'],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSMicrophoneUsageDescription:
        'DEVISIA utilise le micro pour que vous puissiez dicter la description de votre chantier.',
      NSCameraUsageDescription:
        'DEVISIA utilise l’appareil photo pour joindre des photos de chantier à vos devis.',
      NSPhotoLibraryUsageDescription:
        'DEVISIA accède à vos photos pour joindre des images de chantier à vos devis.',
    },
  },

  android: {
    package: 'fr.devisia.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#2547E0',
    },
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.POST_NOTIFICATIONS',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: 'devisia.fr', pathPrefix: '/devis' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },

  web: {
    bundler: 'metro',
    output: 'single',
  },

  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
      },
    ],
    'expo-status-bar',
    'expo-secure-store',
    'expo-sharing',
    'expo-web-browser',
    [
      'expo-image-picker',
      {
        photosPermission:
          'DEVISIA accède à vos photos pour joindre des images de chantier à vos devis.',
        cameraPermission:
          'DEVISIA utilise l’appareil photo pour joindre des photos de chantier à vos devis.',
      },
    ],
    [
      'expo-audio',
      {
        microphonePermission:
          'DEVISIA utilise le micro pour que vous puissiez dicter la description de votre chantier.',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#2547E0',
        defaultChannel: 'default',
      },
    ],
  ],

  experiments: { typedRoutes: true },

  extra: {
    apiUrl: API_URL,
    eas: {
      // Renseigné automatiquement par `eas init`.
      projectId: process.env.EAS_PROJECT_ID ?? undefined,
    },
  },
};

export default config;
