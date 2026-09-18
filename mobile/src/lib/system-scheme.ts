import { Appearance, AppState, Platform } from 'react-native';
import type { ColorScheme } from '@/theme/palette';

/**
 * L'apparence réelle de l'iPhone — et rien d'autre.
 *
 * ## Le défaut que ce fichier existe pour supprimer
 *
 * `Appearance.setColorScheme()` ne demande rien à iOS : il pose une
 * **surcharge** au niveau de l'application. Et `Appearance.getColorScheme()`,
 * comme `useColorScheme()`, renvoie ensuite cette surcharge — plus celle du
 * système.
 *
 * L'application s'en servait pourtant comme source du « thème du système ».
 * Elle lisait donc sa propre écriture. Le scénario qui le montre, avec un
 * iPhone en **sombre** :
 *
 * 1. préférence « automatique » : aucune surcharge, la lecture dit « sombre ».
 * 2. l'utilisateur choisit **Clair** : on pose la surcharge « clair ». La
 *    lecture dit maintenant « clair ». La valeur mémorisée du « système » est
 *    empoisonnée.
 * 3. l'utilisateur choisit **Automatique** : on efface la surcharge, mais le
 *    rendu qui suit immédiatement lit encore « clair ». L'application reste
 *    claire alors que le téléphone est sombre — et elle n'en sortira que si
 *    iOS envoie un évènement de changement, ce qui n'arrive pas toujours.
 *
 * Vu de l'utilisateur, « Automatique » avait l'air de basculer sur le
 * contraire du mode précédent. Ce n'était pas une bascule : c'était la lecture
 * d'un capteur sur lequel on venait d'écrire.
 *
 * ## La règle
 *
 * La surcharge est une **sortie**, jamais une entrée. Ce module tient la seule
 * valeur d'entrée qui vaille : l'apparence du système, conservée à l'abri de
 * ce que l'application impose.
 *
 * Trois moyens de la garder juste :
 *
 * - **la graine** est lue à l'initialisation du module, avant qu'aucune
 *   surcharge n'ait pu exister : elle est donc nécessairement vraie ;
 * - **les évènements** d'iOS sont acceptés, sauf ceux que nous provoquons
 *   nous-mêmes en posant ou en levant la surcharge ;
 * - **au réveil**, et à la levée d'une surcharge, on relit — iOS peut avoir
 *   changé d'apparence pendant que l'application dormait, et il ne prévient
 *   pas toujours une application qui s'était imposé un thème.
 */

function read(): ColorScheme {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

/** La vérité système, jamais dérivée du thème de l'application. */
let osScheme: ColorScheme = read();

/**
 * Vrai pendant que nous posons ou levons la surcharge.
 *
 * iOS notifie un changement d'apparence de la même façon, qu'il vienne de
 * l'utilisateur ou de nous. Sans ce drapeau, notre propre choix « Clair »
 * reviendrait par la porte de service comme si le téléphone était passé en
 * clair, et empoisonnerait la valeur qu'on protège.
 */
let applying = false;

/** Vrai tant qu'un choix explicite impose un thème à iOS. */
let overridden = false;

const listeners = new Set<() => void>();
let version = 0;

function set(next: ColorScheme): void {
  if (next === osScheme) return;
  osScheme = next;
  version += 1;
  for (const listener of listeners) listener();
}

Appearance.addChangeListener(({ colorScheme }) => {
  if (applying) return;
  set(colorScheme === 'dark' ? 'dark' : 'light');
});

AppState.addEventListener('change', (next) => {
  // Relire n'a de sens que sans surcharge : avec, la lecture nous renverrait
  // notre propre choix.
  if (next === 'active' && !overridden) set(read());
});

/**
 * Applique le choix à iOS — verre, claviers, alertes, feuilles de partage.
 *
 * `null` efface la surcharge et rend la main au système. C'est une sortie :
 * rien de ce qui est écrit ici ne revient alimenter le thème.
 */
export function applySystemOverride(choice: 'system' | 'light' | 'dark'): void {
  if (Platform.OS === 'web') return;
  applying = true;
  overridden = choice !== 'system';
  // Les typages d'Expo n'admettent pas encore `null`, que l'API accepte
  // pourtant — c'est précisément ce qui rend la main au système.
  Appearance.setColorScheme((choice === 'system' ? null : choice) as 'light' | 'dark');
  /*
   * La surcharge vient d'être levée : la lecture redevient fiable à la boucle
   * suivante, pas dans celle-ci. On en profite pour rattraper un changement
   * d'apparence survenu pendant qu'on imposait un thème — iOS ne prévient pas
   * toujours une application qui s'était surchargée.
   */
  setTimeout(() => {
    applying = false;
    if (!overridden) set(read());
  }, 0);
}

export function systemScheme(): ColorScheme {
  return osScheme;
}

export function systemSchemeVersion(): number {
  return version;
}

export function subscribeToSystemScheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/*
 * La résolution vit dans un fichier sans React Native : elle se teste ainsi
 * sans simulateur, ce qui est tout l'intérêt d'une règle aussi simple.
 */
export { resolveScheme, type ThemePreference } from './scheme-resolver';
