// ---------------------------------------------------------------------------
// Contrat de la source d'emails entrants.
//
// L'interface existe pour que le reste du systeme ne depende pas d'IMAP :
// les tests utilisent une source en memoire, sans reseau ni boite mail.
// ---------------------------------------------------------------------------

/** Un email entrant, deja decode et normalise. */
export type InboundEmail = {
  /** En-tete Message-ID. Cle de deduplication durable. */
  messageId: string | null;
  /** UID IMAP dans le dossier lu. */
  uid: number;
  folder: string;
  fromEmail: string;
  fromName: string | null;
  toEmail: string | null;
  subject: string;
  /** Corps en texte brut, deja nettoye des citations de l'email d'origine. */
  text: string;
  receivedAt: Date;
  /** En-tetes utiles au diagnostic (pas de contenu sensible). */
  inReplyTo: string | null;
  /** L'email a-t-il l'allure d'un retour automatique ? */
  isAutoReply: boolean;
};

export type FetchOptions = {
  /** Ne renvoyer que les messages d'UID strictement superieur. */
  sinceUid: number;
  /** Ne renvoyer que les messages recus apres cette date. */
  since?: Date;
  /** Plafond de messages renvoyes. */
  max: number;
};

export type MailboxInfo = {
  folder: string;
  /** UIDVALIDITY : s'il change, les UID memorises ne valent plus rien. */
  uidValidity: string;
  totalMessages: number;
};

/**
 * Source d'emails entrants.
 *
 * CONTRAT : une implementation ne doit JAMAIS modifier la boite —
 * ni supprimer, ni deplacer, ni marquer un message comme lu.
 */
export interface InboundMailSource {
  readonly name: string;
  /** Verifie la connexion et l'authentification, sans rien lire ni modifier. */
  verify(): Promise<MailboxInfo>;
  fetch(options: FetchOptions): Promise<InboundEmail[]>;
}
