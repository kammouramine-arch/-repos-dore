/**
 * Rythme du lancement, sans dépendance à React Native pour rester testable.
 *
 * Le lancement précédent disparaissait dès que la session était décidée —
 * en pratique quelques dizaines de millisecondes après le premier rendu, car
 * le trousseau et l'instantané de session répondent tout de suite. L'écran
 * natif laissait donc place à une animation déjà terminée. Ici, l'affichage
 * dure au moins le temps d'être perçu, et jamais plus longtemps que le
 * démarrage réel n'en a besoin une fois ce minimum passé.
 */
export const LAUNCH = {
  /** Premier lancement d'une session d'application : la marque prend le temps de se poser. */
  holdColdMs: 1_000,
  /** Lancements suivants (processus relancé) : même séquence, un peu plus vive. */
  holdRepeatMs: 760,
  /** « Réduire les animations » : rien ne bouge, mais la marque reste lisible un instant. */
  holdReducedMs: 560,
  /** Durée de la révélation (la surface bleue se referme sur le logo). */
  revealMs: 620,
  revealReducedMs: 320,
  /** Au-delà, on dit à l'artisan qu'on charge encore, plutôt que de le laisser deviner. */
  waitingHintMs: 2_800,
} as const;

export interface LaunchContext {
  repeat: boolean;
  reducedMotion: boolean;
}

export function holdFor({ repeat, reducedMotion }: LaunchContext): number {
  if (reducedMotion) return LAUNCH.holdReducedMs;
  return repeat ? LAUNCH.holdRepeatMs : LAUNCH.holdColdMs;
}

export function revealDurationFor({ reducedMotion }: Pick<LaunchContext, 'reducedMotion'>): number {
  return reducedMotion ? LAUNCH.revealReducedMs : LAUNCH.revealMs;
}

/**
 * Instant où la révélation peut commencer : jamais avant le minimum perçu,
 * jamais après que le démarrage soit réellement prêt.
 */
export function revealAt(input: { startedAt: number; readyAt: number | null } & LaunchContext): number | null {
  if (input.readyAt === null) return null;
  return Math.max(input.startedAt + holdFor(input), input.readyAt);
}

export function shouldShowWaitingHint(now: number, startedAt: number, readyAt: number | null): boolean {
  return readyAt === null && now - startedAt >= LAUNCH.waitingHintMs;
}

let claimed = false;

/**
 * Une seule séquence par processus.
 *
 * Revenir d'une autre application ne relance pas le processus : l'écran
 * racine reste monté et la séquence ne rejoue pas. Un vrai redémarrage la
 * rejoue, plus vite.
 */
export function claimLaunch(): boolean {
  if (claimed) return false;
  claimed = true;
  return true;
}

/** Tests uniquement. */
export function resetLaunchClaim() {
  claimed = false;
}
