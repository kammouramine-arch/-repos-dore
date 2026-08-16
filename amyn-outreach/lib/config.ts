// ---------------------------------------------------------------------------
// Configuration centralisee, lue une seule fois depuis l'environnement.
//
// REGLE DE SECURITE : DRY_RUN vaut `true` par defaut. Il faut ecrire
// explicitement DRY_RUN=false pour autoriser un envoi reel — et meme dans ce
// cas, aucun transport reel n'existe avant le lot 5.
// ---------------------------------------------------------------------------

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return value.trim().toLowerCase() === "true";
}

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  /** Mode simulation. Par defaut : true. */
  dryRun: bool(process.env.DRY_RUN, true),

  /** Transport email selectionne. Par defaut : dry-run. */
  mailTransport: (process.env.MAIL_TRANSPORT ?? "dry-run").trim(),

  from: {
    name: process.env.MAIL_FROM_NAME ?? "AMYN",
    email: process.env.MAIL_FROM_EMAIL ?? "contact@amyn.agency",
    replyTo: process.env.MAIL_REPLY_TO ?? process.env.MAIL_FROM_EMAIL ?? "contact@amyn.agency",
  },

  limits: {
    dailySend: int(process.env.DAILY_SEND_LIMIT, 15),
    minDelaySeconds: int(process.env.MIN_DELAY_BETWEEN_SENDS_SECONDS, 180),
  },

  /** Lot en cours de developpement — pilote l'affichage de la feuille de route. */
  currentLot: 1,
} as const;

/**
 * Verrou global. Tout code d'envoi DOIT appeler cette fonction avant d'agir.
 * Au lot 1, elle refuse systematiquement : aucun transport reel n'existe.
 */
export function assertSendingAllowed(): void {
  if (config.dryRun) {
    throw new Error(
      "[AMYN] Envoi bloque : DRY_RUN=true. Aucun email ne peut partir en mode simulation.",
    );
  }
  throw new Error(
    "[AMYN] Envoi bloque : aucun transport reel n'est implemente (prevu au lot 5). " +
      "Passer DRY_RUN=false ne suffit pas — c'est volontaire.",
  );
}
