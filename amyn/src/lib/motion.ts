import type { Transition, Variants } from "framer-motion";

/**
 * Vocabulaire d'animation d'AMYN.
 *
 * Une seule courbe, une seule échelle de durées : c'est ce qui donne
 * l'impression que tout le site bouge « de la même main ». Rapide et net,
 * jamais mou (au-delà de ~0,9 s une animation d'entrée paraît molle).
 */

export const EASE = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DURATION = {
  fast: 0.35,
  base: 0.6,
  slow: 0.9,
} as const;

export const transition = (
  duration: number = DURATION.base,
  delay = 0,
): Transition => ({ duration, delay, ease: EASE });

/** Apparition : monte de quelques pixels en se révélant. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: transition() },
};

/** Apparition simple, sans déplacement. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition(DURATION.slow) },
};

/** Rideau : le texte remonte depuis le bas de son propre masque. */
export const maskUp: Variants = {
  hidden: { y: "110%" },
  visible: { y: "0%", transition: transition(DURATION.slow) },
};

/** Filet horizontal qui se trace. */
export const drawLine: Variants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: transition(DURATION.slow) },
};

/**
 * Conteneur : déclenche ses enfants les uns après les autres.
 * `stagger` = décalage entre chaque enfant, `delay` = attente initiale.
 */
export const stagger = (staggerChildren = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren, delayChildren } },
});

/** Réglage commun des animations déclenchées au scroll. */
export const inView = {
  initial: "hidden",
  whileInView: "visible",
  viewport: { once: true, amount: 0.25 },
} as const;
