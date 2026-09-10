import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { createApiClient, DevisiaApiError, type DevisiaApi } from '@devisia/shared';
import { clearToken, readToken } from './storage';
import { clearQueryCache, invalidateQueryCache } from './query-cache';
import { recordDiagnostic } from './diagnostics';

/** URL de l'API, injectée à la construction (voir eas.json). */
const PRODUCTION_API_URL = 'https://devisia-bice.vercel.app';
const configuredApiUrl =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl?.trim() ??
  process.env.EXPO_PUBLIC_API_URL?.trim() ??
  '';

/**
 * A standalone build must never quietly point at the developer's machine.
 * Older TestFlight binaries were able to embed localhost when an EAS variable
 * was missing, which surfaced as the vague temporary-service error. New builds
 * are still guarded by `app.config.ts`; this last-resort production fallback
 * keeps a malformed legacy binary recoverable while preserving local dev.
 */
const productionRuntime = process.env.NODE_ENV === 'production';
const pointsAtDeveloperMachine = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(configuredApiUrl);
export const API_URL = productionRuntime && (!configuredApiUrl || pointsAtDeveloperMachine)
  ? PRODUCTION_API_URL
  : configuredApiUrl || 'http://localhost:3000';

let onUnauthenticated: (() => void) | null = null;

/** Permet au contexte d'authentification de réagir à une session expirée. */
export function setUnauthenticatedHandler(handler: (() => void) | null) {
  onUnauthenticated = handler;
}

export const api: DevisiaApi = createApiClient({
  baseUrl: API_URL,
  onDiagnostic: recordDiagnostic,
  getToken: readToken,
  onMutation: invalidateQueryCache,
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
    clearQueryCache();
    void clearToken();
    onUnauthenticated?.();
  },
});
