import * as React from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { applyScheme, publishScheme } from '@/theme';
import type { ColorScheme } from '@/theme/palette';
import {
  applySystemOverride,
  resolveScheme,
  subscribeToSystemScheme,
  systemScheme,
  systemSchemeVersion,
} from './system-scheme';

/**
 * Apparence de DEVISERA : automatique, clair ou sombre.
 *
 * ## Deux concepts, à ne jamais confondre
 *
 * La **préférence** est ce que l'utilisateur a choisi : `system`, `light` ou
 * `dark`. C'est elle, et elle seule, qui est enregistrée.
 *
 * Le **thème effectif** est ce qui s'affiche. Il se calcule, à chaque instant,
 * par `resolveScheme(préférence, apparenceDuSystème)`.
 *
 * « Automatique » n'est donc pas un thème : c'est l'absence de choix. Il suit
 * l'iPhone en direct, y compris quand celui-ci bascule tout seul au coucher du
 * soleil. « Clair » et « Sombre » sont des décisions, et elles tiennent — y
 * compris contre le système.
 *
 * ## Le défaut corrigé ici
 *
 * La version précédente résolvait « automatique » avec `useColorScheme()`.
 * Or `Appearance.setColorScheme()` — qu'on appelle pour qu'iOS accorde son
 * verre, ses claviers et ses alertes au thème choisi — pose une **surcharge**
 * que `useColorScheme()` renvoie ensuite à la place du système.
 *
 * Choisir « Clair » sur un iPhone en sombre posait donc la surcharge, puis
 * repasser en « Automatique » résolvait contre cette surcharge : l'application
 * restait claire alors que le téléphone était sombre. Vu de l'utilisateur,
 * « Automatique » semblait basculer vers le contraire du mode précédent. Ce
 * n'était pas une bascule : c'était la lecture d'un capteur sur lequel on
 * venait d'écrire.
 *
 * L'apparence du système vit maintenant dans `system-scheme.ts`, à l'abri de
 * ce que nous imposons. La surcharge est devenue une **sortie** : une
 * conséquence du thème retenu, jamais une entrée du calcul.
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

export type AppearanceChoice = 'system' | 'light' | 'dark';

const KEY = 'devisera.appearance';

/**
 * Seules trois valeurs sont acceptées.
 *
 * C'est aussi la migration : une préférence héritée qui aurait enregistré un
 * thème résolu plutôt qu'un choix, ou n'importe quelle valeur devenue
 * invalide, retombe sur « automatique » plutôt que de figer l'application
 * dans un état que l'utilisateur n'a jamais demandé.
 */
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
  /** Ce que l'utilisateur a choisi : `system`, `light` ou `dark`. Jamais résolu. */
  choice: AppearanceChoice;
  /** L'apparence réelle de l'iPhone, indépendamment du choix. */
  system: ColorScheme;
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
  const [choice, setStored] = React.useState<AppearanceChoice | null>(null);

  /*
   * L'apparence du système, lue dans le magasin qui la protège.
   *
   * Ce n'est volontairement pas `useColorScheme()` : celui-ci renvoie la
   * surcharge que nous posons dès qu'un thème explicite est choisi, et
   * « automatique » se résoudrait alors contre notre propre imposition.
   */
  React.useSyncExternalStore(subscribeToSystemScheme, systemSchemeVersion, systemSchemeVersion);
  const system = systemScheme();

  React.useEffect(() => {
    let disposed = false;
    void readChoice().then((stored) => {
      if (disposed) return;
      applySystemOverride(stored);
      setStored(stored);
    });
    return () => { disposed = true; };
  }, []);

  /*
   * Le thème effectif : une fonction pure de la préférence et du système.
   *
   * Aucun état antérieur n'entre dans ce calcul. Choisir « Automatique »
   * donne le même résultat, que le réglage précédent ait été clair, sombre
   * ou déjà automatique.
   */
  const scheme: ColorScheme = resolveScheme(choice ?? 'system', system);

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
    /*
     * On enregistre le **choix**, jamais le thème résolu, et l'on informe iOS
     * de ce qu'il doit dessiner. Les deux gestes sont indépendants : le thème
     * de l'application, lui, se recalcule tout seul au rendu suivant.
     */
    applySystemOverride(next);
    setStored(next);
    void writeChoice(next);
  }, []);

  const value = React.useMemo<AppearanceValue>(
    () => ({ choice: choice ?? 'system', system, scheme, setChoice }),
    [choice, system, scheme, setChoice],
  );

  // Tant que la préférence n'est pas lue, rien ne s'affiche : l'écran de
  // lancement natif couvre déjà ces quelques millisecondes.
  if (choice == null) return null;

  // Aucune clé, aucun remontage : les enfants gardent leur identité, donc le
  // routeur garde son historique et les écrans leur position de défilement.
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}
