import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { SessionDTO } from '@devisia/shared';
import { decodeDashboardSnapshot } from './dashboard-snapshot';
import type { LocaleChoice } from './locale-resolution';

/**
 * Stockage du jeton de session.
 *
 * Sur appareil, le trousseau iOS / Keystore Android via expo-secure-store.
 * Sur le web de développement, le stockage local du navigateur.
 */
const KEY = 'devisia.session.token';
const SNAPSHOT_KEY = 'devisia.session.snapshot';
const DASHBOARD_KEY = 'devisia.dashboard.snapshot';
/**
 * Choix de langue explicite, et lui seul. L'ancienne clé `devisera.locale`
 * recevait la langue déduite du compte à chaque session : un « en » accidentel
 * y survivait et imposait l'anglais à un iPhone français. Elle est effacée et
 * n'est jamais relue.
 */
const LEGACY_LOCALE_KEY = 'devisera.locale';
const LOCALE_CHOICE_KEY = 'devisera.locale.choice';

export async function readLocaleChoice(): Promise<LocaleChoice | null> {
  try {
    const raw = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(LOCALE_CHOICE_KEY)
      : await SecureStore.getItemAsync(LOCALE_CHOICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocaleChoice>;
    if ((parsed.locale === 'fr' || parsed.locale === 'en') && typeof parsed.at === 'string') return { locale: parsed.locale, at: parsed.at };
    return null;
  } catch {
    return null;
  }
}

export async function persistLocaleChoice(choice: LocaleChoice | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (choice) globalThis.localStorage?.setItem(LOCALE_CHOICE_KEY, JSON.stringify(choice));
      else globalThis.localStorage?.removeItem(LOCALE_CHOICE_KEY);
      return;
    }
    if (choice) await SecureStore.setItemAsync(LOCALE_CHOICE_KEY, JSON.stringify(choice), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    else await SecureStore.deleteItemAsync(LOCALE_CHOICE_KEY);
  } catch {
    // Locale persistence is best effort and must never block authentication.
  }
}

/** Efface la valeur déduite héritée des versions précédentes. */
export async function forgetLegacyLocale(): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(LEGACY_LOCALE_KEY);
    else await SecureStore.deleteItemAsync(LEGACY_LOCALE_KEY);
  } catch {
    // Rien à faire : la clé n'est plus lue.
  }
}

/** Encrypted display-only data, bound to the exact login token. */
export async function readDashboardSnapshot<T>(token: string): Promise<T | null> {
  try {
    const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(DASHBOARD_KEY) : await SecureStore.getItemAsync(DASHBOARD_KEY);
    return decodeDashboardSnapshot<T>(raw, token);
  } catch { return null; }
}

export async function writeDashboardSnapshot<T>(token: string, data: T): Promise<void> {
  try {
    // A late response from a signed-out account must not become its successor's cache.
    if (await readToken() !== token) return;
    const raw = JSON.stringify({ token, data, at: Date.now() });
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(DASHBOARD_KEY, raw);
    else await SecureStore.setItemAsync(DASHBOARD_KEY, raw, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  } catch { /* A display cache must never fail an otherwise successful request. */ }
}

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
      globalThis.localStorage?.removeItem(DASHBOARD_KEY);
    } catch {
      // Rien à nettoyer.
    }
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
  await SecureStore.deleteItemAsync(SNAPSHOT_KEY);
  await SecureStore.deleteItemAsync(DASHBOARD_KEY);
}
