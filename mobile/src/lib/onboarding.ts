import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Mémoire de la découverte.
 *
 * Réafficher la présentation à chaque ouverture est le meilleur moyen de
 * transformer un argumentaire en irritant. Le marqueur survit à une
 * déconnexion : quelqu'un qui a compris le produit et se déconnecte n'a pas
 * besoin qu'on le lui réexplique.
 */
const KEY = 'devisia.onboarding.vu';

async function read(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(KEY);
}

export async function hasSeenOnboarding(): Promise<boolean> {
  return (await read()) === '1';
}

export async function markOnboardingSeen(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(KEY, '1');
    } catch {
      // Stockage indisponible : la présentation réapparaîtra, sans conséquence.
    }
    return;
  }
  await SecureStore.setItemAsync(KEY, '1');
}
