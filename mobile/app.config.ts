import type { ExpoConfig } from 'expo/config';

/**
 * Configuration DEVISIA mobile.
 *
 * L'URL de l'API est injectée à la construction : une même base de code sert
 * le développement local, les builds de préversion et la production.
 */
// Version affichée aux utilisateurs. Les numéros de build (`buildNumber` iOS,
// `versionCode` Android) ne sont volontairement pas déclarés ici : `eas.json`
// fixe `appVersionSource: "remote"`, EAS les incrémente lui-même, et les
// valeurs locales seraient ignorées tout en laissant croire le contraire.
const VERSION = '1.0.0';

/**
 * Projet EAS. L'identifiant n'est pas un secret : il est de toute façon
 * embarqué dans le binaire, et le figer ici rend les builds reproductibles
 * sans dépendre d'une variable d'environnement. `EAS_PROJECT_ID` reste un
 * forçage possible, utile pour construire vers un autre projet.
 */
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? '3664953c-f93a-4ae5-8196-b54c49f0490b';
const EAS_ACCOUNT = 'aminekms-team';

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

  if (distributable) {
    if (/localhost|127\.0\.0\.1|^http:\/\//.test(provided)) {
      throw new Error(
        `EXPO_PUBLIC_API_URL vaut « ${provided} ». Un build distribuable exige une URL HTTPS publique.`,
      );
    }

    // Vercel attribue à chaque déploiement une URL contenant son empreinte
    // (`projet-a1b2c3d4e-portee.vercel.app`). Elle cesse de désigner la
    // production au déploiement suivant. Un binaire publié sur les stores est
    // figé : il faut l'alias stable du projet, sinon l'application cesse de
    // fonctionner sans qu'aucune mise à jour puisse la rattraper.
    if (/^https:\/\/[a-z0-9-]+-[a-z0-9]{8,}-[a-z0-9-]+\.vercel\.app/i.test(provided)) {
      throw new Error(
        `EXPO_PUBLIC_API_URL vaut « ${provided} », qui est l'URL d'un déploiement ` +
          "précis et changera au prochain déploiement. Utilisez l'alias stable du " +
          'projet (Vercel → Project → Domains), par exemple https://<projet>-<portée>.vercel.app.',
      );
    }
  }

  return provided;
}

const API_URL = resolveApiUrl();

const config: ExpoConfig = {
  name: 'DEVISIA',
  slug: 'devisia',
  // Compte propriétaire du projet EAS : sans lui, un build lancé depuis un
  // autre compte Expo créerait un projet homonyme au lieu d'alimenter celui-ci.
  owner: EAS_ACCOUNT,
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
      projectId: EAS_PROJECT_ID,
    },
  },
};

export default config;
