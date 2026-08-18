// ---------------------------------------------------------------------------
// BOITE MAIL SIMULEE
//
// Implemente le meme contrat que la source IMAP, entierement en memoire.
// Les tests ne se connectent JAMAIS a un serveur et n'envoient JAMAIS d'email.
// ---------------------------------------------------------------------------

import { stripQuotedReply, looksAutomatic } from "@/lib/imap/parse";
import type {
  FetchOptions,
  InboundEmail,
  InboundMailSource,
  MailboxInfo,
} from "@/lib/imap/types";

export type FakeMessage = {
  uid: number;
  from: string;
  fromName?: string;
  to?: string;
  subject: string;
  /** Corps brut, citation de notre email comprise si on veut la tester. */
  body: string;
  messageId?: string | null;
  receivedAt?: Date;
  headers?: Record<string, string>;
};

/** Signature AMYN citee en bas des reponses reelles. Piege classique. */
export const QUOTED_ORIGINAL = [
  "",
  "Le 17 août 2026 à 10:12, AMYN <contact@amyn.agency> a écrit :",
  "> Bonjour,",
  "> En consultant votre site, j'ai constaté qu'il répond en http:// et non en https://.",
  "> Amyn — AMYN, Web & Growth, Lille",
  "> Répondez STOP pour ne plus recevoir de message de ma part.",
].join("\n");

export class FakeMailbox implements InboundMailSource {
  readonly name = "fake";
  private readonly messages: FakeMessage[];
  private readonly folder: string;
  private readonly uidValidity: string;

  /** Compte les appels : sert a prouver qu'aucune ecriture n'a lieu. */
  verifyCalls = 0;
  fetchCalls = 0;

  constructor(
    messages: FakeMessage[],
    options: { folder?: string; uidValidity?: string } = {},
  ) {
    this.messages = messages;
    this.folder = options.folder ?? "INBOX";
    this.uidValidity = options.uidValidity ?? "1000";
  }

  async verify(): Promise<MailboxInfo> {
    this.verifyCalls += 1;
    return {
      folder: this.folder,
      uidValidity: this.uidValidity,
      totalMessages: this.messages.length,
    };
  }

  async fetch(options: FetchOptions): Promise<InboundEmail[]> {
    this.fetchCalls += 1;
    return this.messages
      .filter((m) => m.uid > options.sinceUid)
      .filter((m) => !options.since || (m.receivedAt ?? new Date()) >= options.since)
      .slice(0, options.max)
      .map((m) => ({
        messageId: m.messageId === undefined ? `<${m.uid}@test.invalid>` : m.messageId,
        uid: m.uid,
        folder: this.folder,
        fromEmail: m.from.toLowerCase(),
        fromName: m.fromName ?? null,
        toEmail: (m.to ?? "contact@amyn.agency").toLowerCase(),
        subject: m.subject,
        text: stripQuotedReply(m.body),
        receivedAt: m.receivedAt ?? new Date(),
        inReplyTo: null,
        isAutoReply: looksAutomatic({ subject: m.subject, headers: m.headers }),
      }));
  }
}
