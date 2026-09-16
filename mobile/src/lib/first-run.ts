import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { SessionDTO } from '@devisia/shared';
import { authDestination, type AuthDestination } from './auth-navigation';

/**
 * L'écran « Votre atelier est prêt », une fois et une seule.
 *
 * Il salue la fin de la configuration : c'est le moment où l'artisan a un
 * compte, une entreprise nommée, et rien à l'écran. Le montrer à quelqu'un
 * qui se reconnecte six mois plus tard n'aurait aucun sens — et le montrer
 * aux comptes déjà en production serait une régression. Le marqueur est donc
 * **posé explicitement** au moment de la configuration, jamais déduit de
 * l'ancienneté du compte.
 *
 * Il est mémorisé par utilisateur : sur un iPhone partagé, le second compte
 * a droit au sien.
 */
const KEY = 'devisera.atelier.pret';

/** Miroir en mémoire : la décision de navigation est synchrone. */
let pending: string | null = null;

function key(userId: string) {
  return `${KEY}.${userId}`;
}

async function write(userId: string, value: string | null) {
  try {
    if (Platform.OS === 'web') {
      if (value === null) globalThis.localStorage?.removeItem(key(userId));
      else globalThis.localStorage?.setItem(key(userId), value);
      return;
    }
    if (value === null) await SecureStore.deleteItemAsync(key(userId));
    else await SecureStore.setItemAsync(key(userId), value);
  } catch {
    // Stockage indisponible : le miroir en mémoire suffit pour cette session.
  }
}

/** La configuration vient d'être terminée : l'écran de bienvenue est dû. */
export function markWorkshopReady(userId: string): void {
  pending = userId;
  void write(userId, '1');
}

/** L'écran a été montré (ou sauté) : il ne reviendra pas. */
export function clearWorkshopReady(userId: string): void {
  if (pending === userId) pending = null;
  void write(userId, null);
}

/** Restaure le marqueur au démarrage, si l'application a été tuée entre-temps. */
export async function restoreWorkshopReady(userId: string): Promise<void> {
  try {
    const raw = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(key(userId)) ?? null
      : await SecureStore.getItemAsync(key(userId));
    if (raw === '1') pending = userId;
  } catch {
    // Rien à restaurer.
  }
}

export function isWorkshopReadyPending(userId: string | null | undefined): boolean {
  return Boolean(userId) && pending === userId;
}

/**
 * Où entrer dans l'application.
 *
 * `authDestination` reste l'autorité : vérification, onboarding et paywall
 * passent avant tout. L'écran de bienvenue ne s'intercale qu'au tout dernier
 * pas, celui qui menait droit à l'accueil.
 */
export function appEntry(session: SessionDTO): AuthDestination | '/pret' {
  const destination = authDestination(session);
  if (destination !== '/(app)') return destination;
  return isWorkshopReadyPending(session.user.id) ? '/pret' : '/(app)';
}
