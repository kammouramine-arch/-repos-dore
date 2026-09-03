// ---------------------------------------------------------------------------
// CLIENT IMAP — lecture seule de la boite contact@amyn.agency
//
// GARANTIE : la boite n'est JAMAIS modifiee.
//   • le dossier est ouvert avec readOnly: true — le serveur refuse alors
//     toute ecriture, y compris le marquage \Seen ;
//   • aucun appel de suppression, de deplacement ou de modification de drapeau
//     n'existe dans ce fichier ;
//   • vos emails restent non lus dans votre client habituel.
// ---------------------------------------------------------------------------

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { readImapConfig, type ImapConfig } from "./config";
import { extractAddress, looksAutomatic, stripQuotedReply } from "./parse";
import type { FetchOptions, InboundEmail, InboundMailSource, MailboxInfo } from "./types";

export class ImapSource implements InboundMailSource {
  readonly name = "imap";
  private readonly config: ImapConfig;

  constructor(config?: ImapConfig) {
    if (config) {
      this.config = config;
      return;
    }
    const { config: read, missing } = readImapConfig();
    if (!read) {
      throw new Error(
        `Configuration IMAP incomplète. Variables manquantes dans .env : ${missing.join(", ")}`,
      );
    }
    this.config = read;
  }

  private createClient(): ImapFlow {
    return new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: { user: this.config.user, pass: this.config.password },
      // Le journal d'imapflow reproduit les echanges IMAP, mot de passe compris.
      // Il reste desactive : aucun secret ne doit atteindre la sortie standard.
      logger: false,
    });
  }

  /** Connexion + authentification + ouverture en lecture seule. Ne lit aucun message. */
  async verify(): Promise<MailboxInfo> {
    const client = this.createClient();
    await client.connect();
    try {
      const mailbox = await client.mailboxOpen(this.config.folder, { readOnly: true });
      return {
        folder: this.config.folder,
        uidValidity: String(mailbox.uidValidity),
        totalMessages: mailbox.exists,
      };
    } finally {
      await client.logout().catch(() => client.close());
    }
  }

  async fetch(options: FetchOptions): Promise<InboundEmail[]> {
    const client = this.createClient();
    await client.connect();

    try {
      const mailbox = await client.mailboxOpen(this.config.folder, { readOnly: true });
      const emails: InboundEmail[] = [];

      // `sinceUid + 1` : on ne relit pas le dernier message deja traite.
      const range = `${options.sinceUid + 1}:*`;

      for await (const message of client.fetch(
        range,
        { uid: true, source: true, envelope: true },
        { uid: true },
      )) {
        // Une plage `n:*` renvoie toujours au moins un message, meme si son UID
        // est inferieur a n : on refiltre nous-memes.
        if (message.uid <= options.sinceUid) continue;
        if (!message.source) continue;
        if (emails.length >= options.max) break;

        const parsed = await simpleParser(message.source);
        const receivedAt = parsed.date ?? message.envelope?.date ?? new Date();
        if (options.since && receivedAt < options.since) continue;

        const fromEmail =
          parsed.from?.value?.[0]?.address?.toLowerCase() ??
          extractAddress(parsed.from?.text) ??
          null;
        if (!fromEmail) continue; // sans expediteur, rien d'exploitable

        // En-tetes retenus pour reconnaitre un courrier automatique. Les
        // trois derniers sont ceux qui distinguent de facon fiable un rapport
        // DMARC, un avis de non-remise et une liste de diffusion — un sujet
        // ne le fait pas.
        const headers: Record<string, string> = {};
        for (const key of [
          "auto-submitted", "x-autoreply", "x-autorespond", "precedence",
          "content-type", "list-id", "list-unsubscribe", "x-report-type",
        ]) {
          const value = parsed.headers.get(key);
          if (typeof value === "string") headers[key] = value;
          // `content-type` est structure : mailparser le rend en objet.
          else if (value && typeof value === "object" && "value" in value) {
            const v = value as { value?: unknown; params?: Record<string, string> };
            const params = v.params
              ? Object.entries(v.params).map(([k, p]) => `; ${k}=${p}`).join("")
              : "";
            headers[key] = `${String(v.value ?? "")}${params}`;
          }
        }

        const subject = parsed.subject ?? "(sans objet)";
        const rawText = parsed.text ?? stripHtml(parsed.html || "");

        emails.push({
          messageId: parsed.messageId ?? null,
          uid: message.uid,
          folder: this.config.folder,
          fromEmail,
          fromName: parsed.from?.value?.[0]?.name?.trim() || null,
          toEmail:
            parsed.to && "value" in parsed.to
              ? (parsed.to.value?.[0]?.address?.toLowerCase() ?? null)
              : null,
          subject,
          text: stripQuotedReply(rawText),
          receivedAt,
          inReplyTo: parsed.inReplyTo ?? null,
          isAutoReply: looksAutomatic({ subject, headers }),
          headers,
        });
      }

      void mailbox;
      return emails;
    } finally {
      await client.logout().catch(() => client.close());
    }
  }
}

/** Repli quand un email n'a pas de partie texte : on extrait le texte visible. */
function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
