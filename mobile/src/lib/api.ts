import Constants from 'expo-constants';
import { createApiClient, type DevisiaApi } from '@devisia/shared';
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
  onUnauthenticated: () => {
    void clearToken();
    onUnauthenticated?.();
  },
});
