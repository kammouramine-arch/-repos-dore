// ---------------------------------------------------------------------------
// TRANSPORT SMTP — implementation reelle (nodemailer)
//
// Compatible OVHcloud / Zimbra et tout autre SMTP.
// Les identifiants viennent EXCLUSIVEMENT de l'environnement. Aucun mot de
// passe n'est ecrit dans le code ni journalise.
//
// Configuration OVHcloud typique :
//   SMTP_HOST=ssl0.ovh.net
//   SMTP_PORT=465
//   SMTP_SECURE=true
//   SMTP_USER=contact@amyn.agency
//   SMTP_PASSWORD=...        <- dans .env uniquement, jamais dans Git
// ---------------------------------------------------------------------------

import nodemailer, { type Transporter } from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer";
import { config } from "@/lib/config";
import type { Mailer, OutboundEmail, SendResult } from "./types";

/**
 * Fabrique un Message-ID stable, avant l'envoi.
 *
 * Le domaine d'expedition sert de suffixe, comme le veut la convention.
 */
function nouveauMessageId(): string {
  const domaine = config.from.email.split("@")[1] ?? "amyn.agency";
  const alea = Math.random().toString(36).slice(2, 12);
  return `<${Date.now()}.${alea}@${domaine}>`;
}

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
};

export function readSmtpConfig(): { config?: SmtpConfig; missing: string[] } {
  const missing: string[] = [];
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT ?? 465);

  if (!host) missing.push("SMTP_HOST");
  if (!user) missing.push("SMTP_USER");
  if (!password) missing.push("SMTP_PASSWORD");
  if (missing.length > 0) return { missing };

  return {
    missing: [],
    config: {
      host: host!,
      port,
      secure: (process.env.SMTP_SECURE ?? "true").toLowerCase() !== "false",
      user: user!,
      password: password!,
    },
  };
}

/**
 * Compose le message MIME complet, une fois pour toutes.
 *
 * Exporte, et ce n'est pas un detail : c'est ce qui permet de verifier en
 * test que le Message-ID est bien fixe AVANT l'envoi, sans avoir besoin de
 * creer un transport — la creation d'un transport hors de ce module est
 * interdite, et le rester est plus important que la commodite d'un test.
 */
export async function composerMessage(
  email: OutboundEmail,
  options: { messageId: string; from?: string; date?: Date },
): Promise<Buffer> {
  return new MailComposer({
    from: options.from ?? `${config.from.name} <${config.from.email}>`,
    to: email.to,
    replyTo: email.replyTo ?? config.from.replyTo,
    subject: email.subject,
    text: email.text,
    messageId: options.messageId,
    date: options.date ?? new Date(),
    headers: {
      // En-tete standard permettant une opposition en un clic cote client mail.
      "List-Unsubscribe": `<mailto:${config.from.replyTo}?subject=STOP>`,
      ...email.headers,
    },
  })
    .compile()
    .build();
}

export class SmtpMailer implements Mailer {
  readonly name = "smtp";
  private transporter: Transporter | null = null;

  get canDeliver(): boolean {
    return readSmtpConfig().missing.length === 0;
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    const { config: smtp, missing } = readSmtpConfig();
    if (!smtp) {
      throw new Error(
        `Configuration SMTP incomplète. Variables manquantes dans .env : ${missing.join(", ")}`,
      );
    }
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.password },
    });
    return this.transporter;
  }

  async verify(): Promise<void> {
    await this.getTransporter().verify();
  }

  /**
   * Envoie, et RENVOIE LES OCTETS ENVOYES.
   *
   * Le message est compose une fois, puis transmis tel quel via l'option
   * `raw`. Deux raisons de faire ainsi plutot que de laisser nodemailer
   * composer lui-meme :
   *
   *   • le Message-ID et la date sont fixes AVANT l'envoi, donc connus ;
   *   • les octets transmis sont exactement ceux que l'on pourra deposer
   *     dans « Envoyes ». Recomposer le message apres coup produirait des
   *     frontieres MIME et une date differentes : une copie ressemblante,
   *     pas la copie.
   */
  async send(email: OutboundEmail): Promise<SendResult> {
    const messageId = email.headers?.["Message-ID"] ?? nouveauMessageId();
    const from = `${config.from.name} <${config.from.email}>`;

    try {
      const composed = await composerMessage(email, { messageId, from });

      const info = await this.getTransporter().sendMail({
        envelope: { from: config.from.email, to: [email.to] },
        raw: composed,
      });

      return {
        delivered: true,
        status: "SENT",
        transport: this.name,
        dryRun: false,
        // Quand on transmet un message deja compose, nodemailer n'ouvre pas
        // le message : il INVENTE cet identifiant. Il est conserve tel quel,
        // mais c'est `messageId` — notre en-tete reel — qui permet de
        // retrouver le message dans la boite.
        providerMessageId: info.messageId,
        providerResponse: info.response,
        messageId,
        raw: composed,
      };
    } catch (err) {
      return {
        delivered: false,
        status: "FAILED",
        transport: this.name,
        dryRun: false,
        messageId,
        error: (err as Error).message,
      };
    }
  }
}
