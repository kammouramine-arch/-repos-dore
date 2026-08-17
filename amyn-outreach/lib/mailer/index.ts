import { config } from "@/lib/config";
import { DryRunMailer } from "./dry-run-mailer";
import { SmtpMailer, readSmtpConfig } from "./smtp-mailer";
import type { Mailer } from "./types";

export type { Mailer, OutboundEmail, SendResult } from "./types";
export { readSmtpConfig };

/**
 * En mode DRY_RUN (defaut), le transport de simulation est force quel que soit
 * MAIL_TRANSPORT. Impossible d'envoyer par accident.
 */
export function getMailer(): Mailer {
  if (config.dryRun) return new DryRunMailer();

  switch (config.mailTransport) {
    case "smtp":
      return new SmtpMailer();
    case "dry-run":
      return new DryRunMailer();
    default:
      throw new Error(
        `MAIL_TRANSPORT inconnu : "${config.mailTransport}". Valeurs acceptées : "dry-run", "smtp".`,
      );
  }
}

export function mailerStatus() {
  const mailer = getMailer();
  const smtp = readSmtpConfig();
  return {
    transport: mailer.name,
    canDeliver: mailer.canDeliver,
    dryRun: config.dryRun,
    from: `${config.from.name} <${config.from.email}>`,
    dailyLimit: config.limits.dailySend,
    minDelaySeconds: config.limits.minDelaySeconds,
    smtpConfigured: smtp.missing.length === 0,
    smtpMissing: smtp.missing,
    smtpHost: process.env.SMTP_HOST ?? null,
  };
}
