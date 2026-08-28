import type { ExpoConfig } from 'expo/config';

/**
 * Configuration DEVISIA mobile.
 *
 * L'URL de l'API est injectée à la construction : une même base de code sert
 * le développement local, les builds de préversion et la production.
 */
const VERSION = '1.0.0';

/**
 * URL de l'API, injectée à la construction.
 *
 * En développement, l'API locale sert de valeur par défaut. Pour un build
 * distribuable, l'URL doit être fournie explicitement : un binaire pointant vers
 * `localhost` s'installerait sans erreur et serait inutilisable sur le terrain,
 * la construction échoue donc plutôt que de livrer une application muette.
 */
function resolveApiUrl(): string {
  const provided = process.env.EXPO_PUBLIC_API_URL?.trim();
  const distributable = process.env.EAS_BUILD === 'true';

  if (!provided) {
    if (distributable) {
      throw new Error(
        'EXPO_PUBLIC_API_URL est absente. Définissez-la avant de construire :\n' +
          '  eas env:create --name EXPO_PUBLIC_API_URL --value https://<votre-projet>.vercel.app ' +
          '--environment production --visibility plaintext',
      );
    }
    return 'http://localhost:3000';
  }

  if (distributable && /localhost|127\.0\.0\.1|^http:\/\//.test(provided)) {
    throw new Error(
      `EXPO_PUBLIC_API_URL vaut « ${provided} ». Un build distribuable exige une URL HTTPS publique.`,
    );
  }

  return provided;
}

const API_URL = resolveApiUrl();

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
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSMicrophoneUsageDescription:
        'DEVISIA utilise le micro pour que vous puissiez dicter la description de votre chantier.',
      NSCameraUsageDescription:
        'DEVISIA utilise l’appareil photo pour joindre des photos de chantier à vos devis.',
      NSPhotoLibraryUsageDescription:
        'DEVISIA accède à vos photos pour joindre des images de chantier à vos devis.',
      NSFaceIDUsageDescription:
        'DEVISIA protège votre session par Face ID pour que vos devis et vos clients restent privés.',
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
    // Ajoutées automatiquement par React Native et certaines dépendances, mais
    // inutiles à DEVISIA : elles déclencheraient des questions de conformité
    // lors de la revue Google Play.
    blockedPermissions: [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },

  web: {
    bundler: 'metro',
    output: 'single',
  },

  plugins: [
    'expo-router',
    // Applique `userInterfaceStyle` sur Android : l'interface DEVISIA est
    // dessinée en clair, elle ne doit pas suivre le thème sombre du système.
    'expo-system-ui',
    'expo-font',
    'expo-asset',
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
      },
    ],
    'expo-status-bar',
    [
      'expo-secure-store',
      {
        faceIDPermission:
          'DEVISIA protège votre session par Face ID pour que vos devis et vos clients restent privés.',
      },
    ],
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
        icon: './assets/notification-icon.png',
        color: '#2547E0',
        defaultChannel: 'default',
      },
    ],
  ],

  // Les liens universels (associatedDomains iOS / intentFilters Android) sont
  // volontairement absents : ils exigent un domaine dont le projet est
  // propriétaire, pour y publier les fichiers de vérification. Le schéma
  // `devisia://` reste actif et suffit à la navigation interne.

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
