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
import { config } from "@/lib/config";
import type { Mailer, OutboundEmail, SendResult } from "./types";

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

  async send(email: OutboundEmail): Promise<SendResult> {
    try {
      const info = await this.getTransporter().sendMail({
        from: `${config.from.name} <${config.from.email}>`,
        to: email.to,
        replyTo: email.replyTo ?? config.from.replyTo,
        subject: email.subject,
        text: email.text,
        headers: {
          // En-tete standard permettant une opposition en un clic cote client mail.
          "List-Unsubscribe": `<mailto:${config.from.replyTo}?subject=STOP>`,
          ...email.headers,
        },
      });

      return {
        delivered: true,
        status: "SENT",
        transport: this.name,
        dryRun: false,
        providerMessageId: info.messageId,
      };
    } catch (err) {
      return {
        delivered: false,
        status: "FAILED",
        transport: this.name,
        dryRun: false,
        error: (err as Error).message,
      };
    }
  }
}
