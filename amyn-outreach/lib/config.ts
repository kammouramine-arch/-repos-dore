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

} as const;

/**
 * Verrou global. Tout code d'envoi DOIT appeler cette fonction avant d'agir.
 * Elle leve une erreur explicite tant que les conditions ne sont pas reunies.
 */
export function assertSendingAllowed(): void {
  if (config.dryRun) {
    throw new Error(
      "[AMYN] Envoi bloqué : DRY_RUN=true. Aucun email ne peut partir en mode simulation.",
    );
  }
  if (config.mailTransport !== "smtp") {
    throw new Error(
      `[AMYN] Envoi bloqué : MAIL_TRANSPORT="${config.mailTransport}". Passer à "smtp" pour un envoi réel.`,
    );
  }
  const missing = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `[AMYN] Envoi bloqué : configuration SMTP incomplète. Manquant dans .env : ${missing.join(", ")}`,
    );
  }
}

/** Etat lisible des conditions d'envoi, pour l'interface et le CLI. */
export function sendingReadiness() {
  const missing = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"].filter((k) => !process.env[k]);
  return {
    dryRun: config.dryRun,
    transport: config.mailTransport,
    smtpConfigured: missing.length === 0,
    missing,
    canSendForReal: !config.dryRun && config.mailTransport === "smtp" && missing.length === 0,
  };
}
