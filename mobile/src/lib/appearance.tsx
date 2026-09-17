import * as React from 'react';
import { AppState, Appearance, Platform, useColorScheme } from 'react-native';
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
 * ## Le matériau natif suit aussi — et c'est un piège
 *
 * Le verre d'iOS, les claviers, les feuilles de partage et les alertes ne
 * lisent pas notre palette : ils lisent l'apparence de la fenêtre. Sans
 * `Appearance.setColorScheme`, un iPhone réglé en sombre gardait une barre
 * d'onglets noire sous une application passée en clair — deux thèmes à
 * l'écran en même temps.
 *
 * Mais cet appel pose une **surcharge** au niveau de l'application, et
 * `useColorScheme()` renvoie alors cette surcharge, plus celle du système. La
 * première version la posait dès le premier rendu, avant même d'avoir lu la
 * préférence : la surcharge valait « clair », la préférence arrivait ensuite
 * à « automatique », et « automatique » lisait… « clair ». L'iPhone avait beau
 * être en sombre, DEVISERA restait clair, définitivement. On avait crevé l'œil
 * avec lequel on regardait.
 *
 * La règle qui en découle, et qui tient tout le fichier : **la surcharge
 * n'existe que pour un choix explicite.** En « automatique », il n'y en a
 * aucune — le système est seul maître, et `useColorScheme()` dit la vérité.
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

/**
 * Aligne ce qu'iOS dessine lui-même — verre, claviers, alertes — sur le choix.
 *
 * `null` **efface** la surcharge et rend la main au système : c'est ce que
 * veut dire « automatique », et c'est aussi ce qui permet à
 * `useColorScheme()` de redevenir fiable.
 */
function applyNativeOverride(choice: AppearanceChoice): void {
  if (Platform.OS === 'web') return;
  // Les typages d'Expo n'admettent pas encore `null`, que l'API accepte
  // pourtant pour rendre la main au système — c'est tout l'intérêt ici.
  Appearance.setColorScheme((choice === 'system' ? null : choice) as 'light' | 'dark');
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
  const [choice, setStored] = React.useState<AppearanceChoice | null>(null);

  /*
   * L'apparence du système.
   *
   * `useColorScheme()` ne dit la vérité que s'il n'y a pas de surcharge — donc
   * uniquement en « automatique », le seul cas où l'on s'en sert. Le compteur
   * force une relecture au retour de veille : iOS peut changer d'apparence
   * pendant que l'application dort, et la notification se perd parfois.
   */
  const reported = useColorScheme();
  const [resumes, setResumes] = React.useState(0);
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') setResumes((count) => count + 1);
    });
    return () => subscription.remove();
  }, []);
  const system: ColorScheme = React.useMemo(() => {
    const value = Platform.OS === 'web' ? reported : (Appearance.getColorScheme() ?? reported);
    return value === 'dark' ? 'dark' : 'light';
    // `resumes` n'est pas lu : il est là pour relire au réveil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reported, resumes]);

  React.useEffect(() => {
    let disposed = false;
    void readChoice().then((stored) => {
      if (disposed) return;
      /*
       * La surcharge native est posée ici, à la lecture de la préférence, et
       * jamais avant : tant qu'on ne sait pas ce que l'utilisateur veut, on ne
       * doit rien imposer à iOS — sinon « automatique » ne verra plus que
       * notre propre imposition.
       */
      applyNativeOverride(stored);
      setStored(stored);
    });
    return () => { disposed = true; };
  }, []);

  const scheme: ColorScheme = choice == null || choice === 'system' ? system : choice;

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
     * La surcharge est levée ou posée **avant** le rendu suivant.
     *
     * Repasser en « automatique » doit d'abord effacer la surcharge, sinon le
     * rendu qui suit lirait encore l'ancien choix comme s'il venait du
     * système — et l'on retomberait exactement sur le défaut corrigé ici.
     */
    applyNativeOverride(next);
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
