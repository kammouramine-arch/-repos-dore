import { Appearance, Platform } from 'react-native';
import type { ColorScheme } from '@/theme/palette';

/**
 * L'apparence de l'iPhone, lue une fois — et ce que DEVISERA impose à iOS.
 *
 * ## Ce module a beaucoup maigri, et c'est le but
 *
 * Il tenait auparavant un magasin complet : abonnements, évènements filtrés,
 * relecture au réveil, drapeau pour écarter nos propres écritures. Tout cela
 * n'existait que pour un seul réglage — « Automatique » — qui obligeait
 * l'application à observer l'iPhone en continu tout en lui imposant un thème,
 * donc à distinguer en permanence ce qu'elle voyait de ce qu'elle avait écrit.
 * C'est de cette confusion que venait le défaut où « Automatique » rendait le
 * contraire du mode précédent.
 *
 * « Automatique » a été retiré. L'apparence du système ne sert plus qu'à une
 * chose : donner la valeur de départ, une fois, au tout premier lancement ou
 * en migrant un ancien réglage. Après quoi elle n'est plus consultée.
 *
 * ## La graine est lue à l'initialisation du module
 *
 * Donc avant qu'aucune surcharge n'ait pu être posée, et c'est ce qui la rend
 * fiable : une fois `Appearance.setColorScheme()` appelé, la lecture renverrait
 * notre propre choix.
 */

/**
 * L'apparence du téléphone au démarrage.
 *
 * Volontairement figée : la lire plus tard, après qu'un thème a été imposé,
 * renverrait ce thème et non le système.
 */
export const launchScheme: ColorScheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

/**
 * Aligne ce qu'iOS dessine lui-même — verre, claviers, alertes, feuilles de
 * partage — sur le thème de l'application.
 *
 * C'est une **sortie** : rien de ce qui est écrit ici n'est relu pour décider
 * du thème. Il n'y a plus de cas « rendre la main au système », puisqu'il n'y
 * a plus de réglage automatique.
 */
export function applySystemOverride(scheme: ColorScheme): void {
  if (Platform.OS === 'web') return;
  Appearance.setColorScheme(scheme);
}

export {
  isPreference,
  migratePreference,
  resolveScheme,
  type ThemePreference,
} from './scheme-resolver';
