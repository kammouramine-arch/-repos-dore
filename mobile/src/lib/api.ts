import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { createApiClient, DevisiaApiError, type DevisiaApi } from '@devisia/shared';
import { clearToken, readToken } from './storage';

/** URL de l'API, injectée à la construction (voir eas.json). */
export const API_URL: string =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3000';

let onUnauthenticated: (() => void) | null = null;

/** Permet au contexte d'authentification de réagir à une session expirée. */
export function setUnauthenticatedHandler(handler: (() => void) | null) {
  onUnauthenticated = handler;
}

export const api: DevisiaApi = createApiClient({
  baseUrl: API_URL,
  getToken: readToken,
  readUploadFile: async (input) => {
    if (Platform.OS === 'web') {
      const response = await fetch(input.uri);
      if (!response.ok) throw new Error('Image locale illisible.');
      return response.blob();
    }
    const file = new File(input.uri);
    if (!file.exists || file.size === 0) {
      throw new DevisiaApiError({
        code: 'VALIDATION',
        message: 'Ce fichier n’est plus disponible sur le téléphone. Sélectionnez-le à nouveau.',
      }, 0);
    }
    return file;
  },
  onUnauthenticated: () => {
    void clearToken();
    onUnauthenticated?.();
  },
});
