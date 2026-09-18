import * as React from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { applyScheme, publishScheme } from '@/theme';
import type { ColorScheme } from '@/theme/palette';
import { applySystemOverride, launchScheme, migratePreference, type ThemePreference } from './system-scheme';

/**
 * Apparence de DEVISERA : clair ou sombre.
 *
 * ## Deux valeurs, et rien d'autre
 *
 * La préférence enregistrée **est** le thème affiché. Il n'y a plus rien à
 * résoudre, plus de troisième valeur, plus d'écart entre ce qui est choisi et
 * ce qui s'affiche.
 *
 * ## Pourquoi « Automatique » est parti
 *
 * Il portait à lui seul toute la complexité du système. Pour le servir,
 * l'application devait lire l'apparence de l'iPhone en continu — alors même
 * qu'elle lui imposait un thème par `Appearance.setColorScheme()`, dont la
 * surcharge est précisément ce que les lectures renvoient ensuite. Elle lisait
 * donc sa propre écriture, et « Automatique » finissait par rendre le
 * contraire du mode précédent.
 *
 * On avait d'abord corrigé cela en protégeant la valeur système derrière un
 * magasin : évènements filtrés, drapeau pour écarter nos propres écritures,
 * relecture au réveil. Cela marchait, et cela restait une machinerie
 * considérable au service d'un réglage dont personne n'avait besoin. Le
 * retirer supprime le problème au lieu de le contenir.
 *
 * ## L'iPhone sert encore une fois, une seule
 *
 * Au premier lancement — et en migrant un ancien « Automatique » — l'apparence
 * du téléphone donne la valeur de départ, puis elle est enregistrée. Quelqu'un
 * qui vit en sombre ne reçoit donc pas une application blanche, et personne ne
 * voit ensuite son thème changer tout seul.
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
 * ## Le premier rendu
 *
 * La préférence est sur le disque et se lit de façon asynchrone. Rendre
 * l'application en clair puis la faire basculer donnerait un éclair blanc à
 * chaque lancement pour qui a choisi le sombre. Rien n'est donc rendu tant
 * que la préférence n'est pas connue — quelques millisecondes, derrière
 * l'écran de lancement natif qui est déjà affiché.
 */

export type AppearanceChoice = ThemePreference;

const KEY = 'devisera.appearance';

/**
 * La préférence enregistrée, migrée si nécessaire.
 *
 * `migratePreference` est totale : une valeur héritée (`system`,
 * `automatic`…), une valeur absente ou n'importe quoi d'inattendu se résout
 * une fois contre l'apparence du téléphone au lancement. L'utilisateur garde
 * le thème qu'il avait sous les yeux ; il devient simplement explicite.
 */
async function readChoice(): Promise<AppearanceChoice> {
  try {
    const raw = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(KEY)
      : await SecureStore.getItemAsync(KEY);
    return migratePreference(raw, launchScheme);
  } catch {
    return launchScheme;
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
  /** Ce que l'utilisateur a choisi : `light` ou `dark`. C'est aussi le thème. */
  choice: AppearanceChoice;
  /** Le thème appliqué. Identique au choix ; nommé pour la lisibilité. */
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
  const [choice, setStored] = React.useState<AppearanceChoice | null>(null);

  React.useEffect(() => {
    let disposed = false;
    void readChoice().then((stored) => {
      if (disposed) return;
      applySystemOverride(stored);
      setStored(stored);
      /*
       * La valeur migrée est regravée : un ancien « automatique » ne doit être
       * résolu qu'une fois. Sans cela, il serait relu et re-résolu à chaque
       * lancement, et le thème suivrait encore le téléphone — exactement ce
       * qu'on vient de retirer.
       */
      void writeChoice(stored);
    });
    return () => { disposed = true; };
  }, []);

  // La préférence *est* le thème : plus rien à résoudre.
  const scheme: ColorScheme = choice ?? launchScheme;

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
  }, [scheme]);

  const setChoice = React.useCallback((next: AppearanceChoice) => {
    // On informe iOS de ce qu'il doit dessiner ; le thème de l'application,
    // lui, découle directement de la préférence au rendu suivant.
    applySystemOverride(next);
    setStored(next);
    void writeChoice(next);
  }, []);

  const value = React.useMemo<AppearanceValue>(
    () => ({ choice: choice ?? launchScheme, scheme, setChoice }),
    [choice, scheme, setChoice],
  );

  // Tant que la préférence n'est pas lue, rien ne s'affiche : l'écran de
  // lancement natif couvre déjà ces quelques millisecondes.
  if (choice == null) return null;

  // Aucune clé, aucun remontage : les enfants gardent leur identité, donc le
  // routeur garde son historique et les écrans leur position de défilement.
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}
