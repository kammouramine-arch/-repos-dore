import { Easing } from 'react-native-reanimated';

/**
 * Vocabulaire de mouvement.
 *
 * Un mouvement coûteux n'est pas un mouvement remarquable : c'est un
 * mouvement qu'on ne remarque pas. Les réglages ci-dessous partent tous du
 * même principe — court, amorti sans rebond visible, interruptible — pour que
 * l'application ait une seule main plutôt qu'une animation réglée au jugé
 * dans chaque composant.
 *
 * Trois règles tenues partout :
 *
 * 1. **Rien au-delà de 420 ms.** Passé ce seuil, l'utilisateur attend
 *    l'animation au lieu de suivre l'interface.
 * 2. **Pas de rebond.** Un ressort qui dépasse puis revient dit « regardez
 *    l'animation ». Un ressort amorti dit « c'est arrivé ».
 * 3. **Ce qui se déplace utilise un ressort, ce qui apparaît utilise une
 *    courbe.** La position suit le doigt et doit pouvoir être interrompue en
 *    vol ; l'opacité n'a pas de vitesse à respecter.
 */

/** Sortie franche puis arrêt doux : la courbe d'apparition d'iOS. */
export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
/** Départ et arrêt doux, pour ce qui se referme. */
export const EASE_IN_OUT = Easing.bezier(0.4, 0, 0.2, 1);

/** Durées, en millisecondes. */
export const DURATION = {
  /** Changement d'état sous le doigt : teinte, opacité d'appui. */
  instant: 120,
  /** Apparition d'un élément déjà en place. */
  quick: 220,
  /** Entrée d'un bloc, fondu d'un écran. */
  normal: 320,
  /** Le plus long qu'on s'autorise. */
  slow: 420,
} as const;

/**
 * Ressorts.
 *
 * `damping` élevé pour tous : ils s'arrêtent sans osciller. Ce qui les
 * distingue est la vivacité, pas le rebond.
 */
export const SPRING = {
  /** Sélection qui glisse, pastille d'onglet. Vif et net. */
  select: { damping: 22, stiffness: 260, mass: 0.7 },
  /** Compression sous le doigt. Répond immédiatement. */
  press: { damping: 26, stiffness: 340, mass: 0.6 },
  /** Panneau ou feuille qui se pose. Plus ample, toujours sans rebond. */
  panel: { damping: 24, stiffness: 180, mass: 0.9 },
} as const;
