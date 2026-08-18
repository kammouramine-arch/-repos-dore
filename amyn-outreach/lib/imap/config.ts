// ---------------------------------------------------------------------------
// CONFIGURATION IMAP — lecture de la boite contact@amyn.agency
//
// Les identifiants viennent EXCLUSIVEMENT de l'environnement. Le mot de passe
// n'est jamais journalise, jamais affiche, jamais retourne par ces fonctions.
//
// Valeurs OVHcloud (solution MX Plan / Zimbra) :
//   IMAP_HOST=ssl0.ovh.net        (alias : imap.mail.ovh.net)
//   IMAP_PORT=993                 (SSL/TLS implicite)
//   IMAP_SECURE=true
//   IMAP_USER=contact@amyn.agency <- adresse complete
//   IMAP_PASSWORD=...             <- .env uniquement, jamais dans Git
// ---------------------------------------------------------------------------

export type ImapConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  /** Dossier lu. Par defaut la boite de reception. */
  folder: string;
  /** Nombre maximum de messages traites par execution. */
  maxMessages: number;
  /** Ne lire que les messages recus depuis N jours (0 = pas de limite). */
  sinceDays: number;
};

const REQUIRED = ["IMAP_HOST", "IMAP_USER", "IMAP_PASSWORD"] as const;

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Lit la configuration IMAP. Ne leve jamais : retourne la liste de ce qui
 * manque pour que l'appelant puisse l'afficher.
 */
export function readImapConfig(): { config?: ImapConfig; missing: string[] } {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) return { missing: [...missing] };

  return {
    missing: [],
    config: {
      host: process.env.IMAP_HOST!,
      port: int(process.env.IMAP_PORT, 993),
      secure: (process.env.IMAP_SECURE ?? "true").trim().toLowerCase() !== "false",
      user: process.env.IMAP_USER!,
      password: process.env.IMAP_PASSWORD!,
      folder: (process.env.IMAP_FOLDER ?? "INBOX").trim() || "INBOX",
      maxMessages: int(process.env.IMAP_MAX_MESSAGES, 200),
      sinceDays: int(process.env.IMAP_SINCE_DAYS, 90),
    },
  };
}

/**
 * Etat lisible de la configuration, pour l'interface et le CLI.
 * NE CONTIENT JAMAIS LE MOT DE PASSE — seulement le fait qu'il soit present.
 */
export function imapStatus() {
  const { config, missing } = readImapConfig();
  return {
    configured: missing.length === 0,
    missing,
    host: process.env.IMAP_HOST ?? null,
    port: config?.port ?? int(process.env.IMAP_PORT, 993),
    secure: config?.secure ?? true,
    user: process.env.IMAP_USER ?? null,
    folder: config?.folder ?? (process.env.IMAP_FOLDER ?? "INBOX"),
    passwordPresent: Boolean(process.env.IMAP_PASSWORD),
  };
}
