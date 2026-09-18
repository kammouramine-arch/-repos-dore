import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Mémoire du premier lancement.
 *
 * La séquence de lancement est un peu plus longue la toute première fois —
 * c'est là qu'elle présente la marque — et plus vive ensuite. Le marqueur
 * n'a rien de secret ; il partage simplement le stockage déjà utilisé par la
 * découverte, sans nouvelle dépendance.
 */
const KEY = 'devisera.lancement.vu';

export async function hasLaunchedBefore(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) === '1';
    return (await SecureStore.getItemAsync(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markLaunched(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(KEY, '1');
      return;
    }
    await SecureStore.setItemAsync(KEY, '1');
  } catch {
    // Sans mémoire, la séquence complète rejouera : sans conséquence.
  }
}
