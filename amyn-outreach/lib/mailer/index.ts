import { config } from "@/lib/config";
import { DryRunMailer } from "./dry-run-mailer";
import { SmtpMailer } from "./smtp-mailer";
import type { Mailer } from "./types";

export type { Mailer, OutboundEmail, SendResult } from "./types";

/**
 * Fabrique le transport email a partir de la configuration.
 *
 * En mode DRY_RUN (defaut), on force le transport de simulation quel que soit
 * MAIL_TRANSPORT. Impossible d'envoyer par accident.
 */
export function getMailer(): Mailer {
  if (config.dryRun) {
    return new DryRunMailer();
  }

  switch (config.mailTransport) {
    case "smtp":
      return new SmtpMailer();
    case "dry-run":
      return new DryRunMailer();
    default:
      throw new Error(
        `[AMYN] MAIL_TRANSPORT inconnu : "${config.mailTransport}". ` +
          `Valeurs acceptées : "dry-run", "smtp".`,
      );
  }
}

/** Etat du systeme d'envoi, affiche dans l'interface. */
export function mailerStatus() {
  const mailer = getMailer();
  return {
    transport: mailer.name,
    canDeliver: mailer.canDeliver,
    dryRun: config.dryRun,
    from: `${config.from.name} <${config.from.email}>`,
    dailyLimit: config.limits.dailySend,
    minDelaySeconds: config.limits.minDelaySeconds,
  };
}
