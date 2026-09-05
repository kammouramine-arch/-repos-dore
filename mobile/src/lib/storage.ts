import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { SessionDTO } from '@devisia/shared';

/**
 * Stockage du jeton de session.
 *
 * Sur appareil, le trousseau iOS / Keystore Android via expo-secure-store.
 * Sur le web de développement, le stockage local du navigateur.
 */
const KEY = 'devisia.session.token';
const SNAPSHOT_KEY = 'devisia.session.snapshot';

/** Display snapshot only. Every API request still authenticates on the server. */
export async function readSessionSnapshot(token: string): Promise<SessionDTO | null> {
  try {
    const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(SNAPSHOT_KEY) : await SecureStore.getItemAsync(SNAPSHOT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (value.token !== token || Date.now() - value.at > 86_400_000 || !value.session?.user?.id || !value.session?.organization?.id) return null;
    return value.session;
  } catch { return null; }
}

export async function writeSessionSnapshot(token: string, session: SessionDTO) {
  try {
    const raw = JSON.stringify({ token, session, at: Date.now() });
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(SNAPSHOT_KEY, raw);
    else await SecureStore.setItemAsync(SNAPSHOT_KEY, raw, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  } catch { /* Cache failure must not block a valid login. */ }
}

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
      globalThis.localStorage?.removeItem(SNAPSHOT_KEY);
    } catch {
      // Rien à nettoyer.
    }
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
  await SecureStore.deleteItemAsync(SNAPSHOT_KEY);
}
