import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Stockage du jeton de session.
 *
 * Sur appareil, le trousseau iOS / Keystore Android via expo-secure-store.
 * Sur le web de développement, le stockage local du navigateur.
 */
const KEY = 'devisia.session.token';

export async function readToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(KEY);
}

export async function writeToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(KEY, token);
    } catch {
      // Stockage indisponible : la session ne survivra pas au rechargement.
    }
    return;
  }
  await SecureStore.setItemAsync(KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.removeItem(KEY);
    } catch {
      // Rien à nettoyer.
    }
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
