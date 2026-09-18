import { cancelAnimation, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { DURATION, EASE_OUT } from '@/theme/motion';
import { travelDuration } from './tab-lens-timing';

/**
 * Le mouvement de la lentille de sélection, isolé de la barre qui la porte.
 *
 * Ces fonctions mutent des valeurs partagées Reanimated. Elles vivent au
 * niveau module plutôt que dans un `useCallback` parce que c'est leur place :
 * elles ne dépendent d'aucun état de rendu, et le compilateur React interdit à
 * juste titre de muter des valeurs capturées depuis une fonction qu'il tient
 * pour pure.
 */

/** Les valeurs partagées de la lentille, réunies pour être passées d'un bloc. */
export interface Lens {
  centre: SharedValue<number>;
  width: SharedValue<number>;
  stretchX: SharedValue<number>;
  stretchY: SharedValue<number>;
  fade: SharedValue<number>;
}

/**
 * Lancer la lentille vers sa destination.
 *
 * `cancelAnimation` d'abord : c'est ce qui fait qu'un second toucher repart de
 * la position **courante** au lieu d'attendre la fin du trajet précédent ou de
 * revenir à l'onglet d'origine.
 *
 * Seul `translateX` porte le déplacement. La largeur est posée, jamais animée :
 * animée, elle faisait s'élargir la capsule jusqu'à couvrir deux onglets, ce
 * qui se lit comme une bavure tirée d'un bout à l'autre. L'étirement se limite
 * à un `scaleX` qui monte à 1,06 et redescend avant l'arrivée.
 */
export function travelTo(lens: Lens, destination: number, tabsJumped: number, reduced: boolean): void {
  cancelAnimation(lens.centre);
  cancelAnimation(lens.stretchX);
  cancelAnimation(lens.stretchY);
  const duration = reduced ? DURATION.instant : travelDuration(tabsJumped);
  lens.centre.value = withTiming(destination, { duration, easing: EASE_OUT });
  lens.stretchX.value = reduced ? 1 : withSequence(
    withTiming(1.06, { duration: Math.round(duration * 0.38), easing: EASE_OUT }),
    withTiming(1, { duration: Math.round(duration * 0.62), easing: EASE_OUT }),
  );
  lens.stretchY.value = reduced ? 1 : withSequence(
    withTiming(0.985, { duration: Math.round(duration * 0.34), easing: EASE_OUT }),
    withTiming(1, { duration: Math.round(duration * 0.66), easing: EASE_OUT }),
  );
  lens.fade.value = withTiming(1, { duration: DURATION.instant, easing: EASE_OUT });
}

/** Poser la lentille sans mouvement : premier rendu. */
export function settleAt(lens: Lens, destination: number, visible: boolean): void {
  lens.centre.value = destination;
  lens.fade.value = visible ? 1 : 0;
}

/** Fixer la largeur de la lentille : celle d'un onglet, sans animation. */
export function setLensWidth(lens: Lens, value: number): void {
  lens.width.value = value;
}

/** Effacer la lentille : route masquée, aucune destination sélectionnée. */
export function hideLens(lens: Lens): void {
  lens.fade.value = withTiming(0, { duration: DURATION.instant, easing: EASE_OUT });
}
