import * as React from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { applyScheme, publishScheme } from '@/theme';
import type { ColorScheme } from '@/theme/palette';

/**
 * Apparence de DEVISERA : automatique, clair ou sombre.
 *
 * ## Trois réglages, deux thèmes
 *
 * « Automatique » n'est pas un thème : c'est l'absence de choix, et il suit
 * l'iPhone en direct. Passer l'appareil en sombre le soir doit assombrir
 * DEVISERA sans qu'on ouvre l'application. « Clair » et « Sombre » sont des
 * décisions, et elles tiennent — y compris contre le système.
 *
 * ## Comment le thème atteint toute l'application
 *
 * La palette est un objet muté (voir `theme/index.ts`). Muter ne réveille pas
 * React : les écrans s'abonnent donc au thème par `useThemeScheme()`, et sont
 * re-rendus **sans être démontés**.
 *
 * La première version remontait l'arbre entier en changeant une clé. Cela
 * fonctionnait visuellement et détruisait le routeur au passage : choisir
 * « Clair » renvoyait l'utilisateur à l'accueil, pile de navigation perdue.
 * Un réglage ne doit jamais déplacer celui qui le règle.
 *
 * ## Le matériau natif suit aussi
 *
 * Le verre d'iOS, les claviers, les feuilles de partage et les alertes ne
 * lisent pas notre palette : ils lisent l'apparence de la fenêtre. Sans
 * `Appearance.setColorScheme`, un iPhone réglé en sombre gardait une barre
 * d'onglets noire sous une application passée en clair — deux thèmes à
 * l'écran en même temps. Ce réglage aligne ce qu'iOS dessine sur ce que
 * DEVISERA a choisi.
 *
 * ## Le premier rendu
 *
 * La préférence est sur le disque et se lit de façon asynchrone. Rendre
 * l'application en clair puis la faire basculer donnerait un éclair blanc à
 * chaque lancement pour qui a choisi le sombre. Rien n'est donc rendu tant
 * que la préférence n'est pas connue — quelques millisecondes, derrière
 * l'écran de lancement natif qui est déjà affiché.
 */

export type AppearanceChoice = 'system' | 'light' | 'dark';

const KEY = 'devisera.appearance';

function isChoice(value: unknown): value is AppearanceChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}

async function readChoice(): Promise<AppearanceChoice> {
  try {
    const raw = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(KEY)
      : await SecureStore.getItemAsync(KEY);
    return isChoice(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

async function writeChoice(choice: AppearanceChoice): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(KEY, choice);
      return;
    }
    await SecureStore.setItemAsync(KEY, choice, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  } catch {
    // Un réglage d'apparence qui ne se grave pas ne doit pas empêcher de
    // l'utiliser pendant la session.
  }
}

interface AppearanceValue {
  /** Ce que l'utilisateur a choisi : `system`, `light` ou `dark`. */
  choice: AppearanceChoice;
  /** Le thème réellement appliqué, une fois « automatique » résolu. */
  scheme: ColorScheme;
  setChoice: (choice: AppearanceChoice) => void;
}

const AppearanceContext = React.createContext<AppearanceValue | null>(null);

export function useAppearance(): AppearanceValue {
  const value = React.useContext(AppearanceContext);
  if (!value) throw new Error('useAppearance doit être utilisé sous AppearanceProvider.');
  return value;
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [choice, setStored] = React.useState<AppearanceChoice | null>(null);

  React.useEffect(() => {
    let disposed = false;
    void readChoice().then((stored) => { if (!disposed) setStored(stored); });
    return () => { disposed = true; };
  }, []);

  const scheme: ColorScheme = choice == null
    ? 'light'
    : choice === 'system'
      ? (system === 'dark' ? 'dark' : 'light')
      : choice;

  /*
   * La palette est appliquée **pendant** le rendu, pas dans un effet.
   *
   * Un effet s'exécute après que les enfants ont été rendus : ils liraient
   * l'ancienne palette une image durant, et l'on verrait clignoter chaque
   * bascule. Muter avant de rendre les enfants garantit qu'ils ne voient
   * jamais qu'un seul état.
   */
  applyScheme(scheme);

  /*
   * Prévenir les abonnés est une mise à jour d'état : cela ne peut pas se
   * faire pendant un rendu. Un effet de mise en page s'exécute après le
   * rendu mais **avant l'affichage** — les écrans se re-rendent donc dans la
   * même image, sans clignotement, et sans que rien ne soit démonté.
   */
  React.useLayoutEffect(() => {
    publishScheme();
    // Aligne ce qu'iOS dessine lui-même sur le thème de l'application.
    if (Platform.OS !== 'web') Appearance.setColorScheme(scheme);
  }, [scheme]);

  const setChoice = React.useCallback((next: AppearanceChoice) => {
    setStored(next);
    void writeChoice(next);
  }, []);

  const value = React.useMemo<AppearanceValue>(
    () => ({ choice: choice ?? 'system', scheme, setChoice }),
    [choice, scheme, setChoice],
  );

  // Tant que la préférence n'est pas lue, rien ne s'affiche : l'écran de
  // lancement natif couvre déjà ces quelques millisecondes.
  if (choice == null) return null;

  // Aucune clé, aucun remontage : les enfants gardent leur identité, donc le
  // routeur garde son historique et les écrans leur position de défilement.
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}
