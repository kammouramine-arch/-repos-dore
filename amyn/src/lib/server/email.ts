import "server-only";

import { sendSmtp } from "./smtp";

/**
 * Envoi des e-mails de demande par la messagerie existante d'AMYN.
 *
 * Le domaine amyn.agency est hébergé chez OVHcloud (MX Plan / Zimbra) : MX
 * mx*.mail.ovh.net, SPF « include:mx.ovh.com », signature DKIM OVH. Le site
 * s'authentifie donc comme la boîte contact@amyn.agency sur le serveur SMTP
 * d'OVH et s'y envoie la demande. Aucun service tiers, aucune nouvelle
 * adresse, aucun changement DNS. Le Reply-To porte l'adresse du demandeur :
 * « Répondre » lui écrit directement.
 *
 * Seul secret : SMTP_PASSWORD (mot de passe de la boîte), lu uniquement ici,
 * côté serveur, depuis les variables d'environnement Vercel. Sans lui, en
 * développement la demande est écrite dans la console ; ailleurs, l'envoi
 * est refusé proprement (le visiteur est invité à écrire directement).
 */

const env = (key: string, fallback: string) => process.env[key]?.trim() || fallback;

export type SendResult = "sent" | "console" | "unavailable" | "failed";

export async function sendRequestEmail({
  subject,
  html,
  text,
  replyTo,
}: {
  subject: string;
  html: string;
  text: string;
  replyTo: string;
}): Promise<SendResult> {
  const pass = process.env.SMTP_PASSWORD;
  const user = env("SMTP_USER", "contact@amyn.agency");

  if (!pass) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[formulaire] ${subject} (mode développement, non envoyé)\n${text}\n`);
      return "console";
    }
    console.error("[formulaire] SMTP_PASSWORD manquante : envoi impossible.");
    return "unavailable";
  }

  try {
    await sendSmtp(
      {
        host: env("SMTP_HOST", "ssl0.ovh.net"),
        port: Number(env("SMTP_PORT", "465")),
        secure: env("SMTP_SECURE", "true") !== "false",
        user,
        pass,
      },
      {
        /* L'expéditeur est la boîte authentifiée elle-même : SPF et DKIM
           restent alignés sur amyn.agency. */
        from: { name: "Site AMYN", address: user },
        to: env("CONTACT_TO_EMAIL", "contact@amyn.agency"),
        replyTo,
        subject,
        text,
        html,
      },
    );
    return "sent";
  } catch (error) {
    console.error("[formulaire] Envoi impossible :", error instanceof Error ? error.message : error);
    return "failed";
  }
}

const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Mise en page de l'e-mail reçu par AMYN : claire, sur fond clair, lisible
 * dans toutes les messageries. Toute valeur saisie est échappée.
 */
export function renderRequestEmail({
  title,
  rows,
  message,
  messageLabel = "Message",
  footer,
}: {
  title: string;
  rows: [string, string][];
  message?: string;
  messageLabel?: string;
  footer: string;
}) {
  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;padding:32px 16px;background:#f2eee6;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#141414">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2ddd2">
    <tr><td style="padding:28px 32px;border-bottom:1px solid #e2ddd2">
      <div style="font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:#7d6230;font-weight:600">AMYN</div>
      <div style="margin-top:10px;font-size:19px;font-weight:600">${escape(title)}</div>
    </td></tr>
    <tr><td style="padding:8px 32px 24px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${rows
          .map(
            ([label, value]) => `<tr>
          <td style="padding:13px 0;border-bottom:1px solid #f0ece3;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#6b665e;width:150px;vertical-align:top">${escape(label)}</td>
          <td style="padding:13px 0;border-bottom:1px solid #f0ece3;font-size:15px;line-height:1.5">${escape(value)}</td>
        </tr>`,
          )
          .join("")}
      </table>
      ${
        message
          ? `<div style="margin-top:26px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#6b665e">${escape(messageLabel)}</div>
      <div style="margin-top:10px;font-size:15px;line-height:1.65;white-space:pre-wrap">${escape(message)}</div>`
          : ""
      }
    </td></tr>
    <tr><td style="padding:18px 32px;background:#faf8f4;border-top:1px solid #e2ddd2;font-size:12px;color:#6b665e">
      ${escape(footer)}
    </td></tr>
  </table>
</body></html>`;

  const text = [
    title,
    "",
    ...rows.map(([label, value]) => `${label} : ${value}`),
    ...(message ? ["", `${messageLabel} :`, message] : []),
    "",
    footer,
  ].join("\n");

  return { html, text };
}

export const receivedAt = () =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date());
