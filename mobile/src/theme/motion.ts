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
  /**
   * Un objet qui **traverse** l'écran, et qu'on doit voir traverser.
   *
   * L'exception assumée à la règle des 420 ms, et elle a été mesurée plutôt
   * que devinée. La lentille des onglets utilisait `select` : amortissement
   * 0,81, pulsation 19,3 rad/s, donc un temps d'établissement de 254 ms — et
   * sur l'enregistrement d'un vrai iPhone, la traversée tenait en **six
   * images**, environ 100 ms. Elle se déplaçait réellement ; personne ne
   * pouvait le voir. À cette vitesse, l'œil ne lit pas un déplacement, il lit
   * un saut.
   *
   * La même mesure sur la référence Instagram donne 0,52 à 0,87 s, avec 32 à
   * 53 images intermédiaires. D'où ces valeurs : amortissement 0,92 —
   * toujours aucun rebond visible — et un établissement autour de 450 ms.
   *
   * La règle des 420 ms vaut pour ce qui *apparaît* ou *change d'état*. Pour
   * ce qui *voyage*, la durée n'est pas un coût : c'est le message.
   */
  travel: { damping: 17, stiffness: 86, mass: 1 },
  /** Compression sous le doigt. Répond immédiatement. */
  press: { damping: 26, stiffness: 340, mass: 0.6 },
  /** Panneau ou feuille qui se pose. Plus ample, toujours sans rebond. */
  panel: { damping: 24, stiffness: 180, mass: 0.9 },
} as const;
