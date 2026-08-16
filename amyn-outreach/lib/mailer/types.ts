// ---------------------------------------------------------------------------
// Contrat d'envoi — independant du fournisseur.
//
// Objectif : pouvoir brancher OVHcloud/Zimbra (SMTP), un autre SMTP, ou une
// API tierce plus tard, SANS toucher au reste de l'application. Tout le code
// metier ne connait que cette interface.
// ---------------------------------------------------------------------------

export type OutboundEmail = {
  to: string;
  subject: string;
  /** Corps en texte brut. Le cold email en texte brut passe mieux les filtres. */
  text: string;
  /** Optionnel. Non utilise en V1. */
  html?: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

export type SendResult = {
  /** L'email a-t-il ete reellement transmis a un serveur ? */
  delivered: boolean;
  /** SIMULATED | SENT | FAILED | BLOCKED */
  status: "SIMULATED" | "SENT" | "FAILED" | "BLOCKED";
  transport: string;
  dryRun: boolean;
  providerMessageId?: string;
  error?: string;
};

export interface Mailer {
  /** Identifiant du transport, journalise dans SendLog. */
  readonly name: string;
  /** true si ce transport peut reellement transmettre un email. */
  readonly canDeliver: boolean;
  send(email: OutboundEmail): Promise<SendResult>;
  /** Verifie la configuration au demarrage. Leve une erreur si invalide. */
  verify(): Promise<void>;
}
