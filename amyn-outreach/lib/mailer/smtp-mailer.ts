// ---------------------------------------------------------------------------
// EMPLACEMENT RESERVE — transport SMTP (OVHcloud / Zimbra)
//
// Prevu pour le LOT 5. Volontairement NON implemente.
//
// Quand viendra le moment :
//   1. npm install nodemailer @types/nodemailer
//   2. remplir SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASSWORD
//      dans .env  (ssl0.ovh.net:465 pour OVHcloud)
//   3. implementer send() et verify() ci-dessous
//   4. mettre MAIL_TRANSPORT=smtp
//
// Rien d'autre dans l'application ne changera : le reste du code ne connait
// que l'interface `Mailer`.
// ---------------------------------------------------------------------------

import type { Mailer, OutboundEmail, SendResult } from "./types";

const NOT_IMPLEMENTED =
  "[AMYN] Le transport SMTP n'est pas implémenté (prévu au lot 5). " +
  "Garder MAIL_TRANSPORT=dry-run.";

export class SmtpMailer implements Mailer {
  readonly name = "smtp";
  readonly canDeliver = false; // passera a true quand implemente

  async verify(): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async send(_email: OutboundEmail): Promise<SendResult> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
