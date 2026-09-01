// ---------------------------------------------------------------------------
// COPIE DANS « ENVOYÉS » — ce que SMTP ne fait pas
//
// POURQUOI CE FICHIER EXISTE.
//
// Envoyer un message et le ranger dans « Envoyés » sont deux opérations
// distinctes, sur deux protocoles distincts. SMTP transmet ; il n'écrit rien
// dans votre boîte. Si le webmail Zimbra garde une trace de ce que vous
// envoyez, c'est parce que LE CLIENT dépose lui-même une copie par IMAP après
// l'envoi. Un programme qui parle SMTP directement doit faire de même — sinon
// ses messages partent réellement mais restent invisibles depuis la boîte.
//
// C'est exactement ce qui s'est produit : l'email accepté par le serveur
// n'apparaissait nulle part.
//
// DEUX PRINCIPES
//
//   1. UN ÉCHEC DE COPIE N'EST PAS UN ÉCHEC D'ENVOI. Le message est parti.
//      Traiter la copie ratée comme un envoi raté conduirait à le renvoyer —
//      la seule faute vraiment grave ici. La copie est donc consignée à part,
//      et reprenable.
//
//   2. IDEMPOTENCE À DEUX NIVEAUX. Avant de déposer, on cherche le Message-ID
//      dans le dossier : s'il y est déjà, on ne dépose pas. C'est le serveur
//      qui arbitre, pas notre base — une base restaurée ou un double appel ne
//      peut donc pas produire deux copies.
// ---------------------------------------------------------------------------

import { ImapFlow } from "imapflow";
import { readImapConfig } from "@/lib/imap/config";

export type SentCopyStatus = "COPIED" | "ALREADY_PRESENT" | "FAILED" | "SKIPPED";

export type SentCopyResult = {
  status: SentCopyStatus;
  folder?: string;
  uid?: number;
  detail: string;
};

/**
 * Noms usuels du dossier d'envoi, par ordre de préférence.
 *
 * Le nom varie selon la langue et le serveur : Zimbra francophone dit
 * « Envoyés », les serveurs anglophones « Sent », d'autres préfixent par
 * INBOX. On interroge d'abord le serveur — la plupart déclarent le dossier
 * par son usage — et cette liste ne sert que de repli.
 */
export const NOMS_ENVOYES = [
  "Sent", "Envoyés", "Envoyes", "Sent Messages", "Sent Items",
  "INBOX.Sent", "INBOX.Envoyés", "INBOX.Envoyes",
];

/** Interface minimale utilisée ici : les tests fournissent leur propre boîte. */
export type BoiteEnvoi = {
  /** Dossiers disponibles, avec leur usage déclaré s'il existe. */
  list(): Promise<Array<{ path: string; specialUse?: string }>>;
  /** UID des messages portant ce Message-ID dans le dossier. */
  rechercherMessageId(folder: string, messageId: string): Promise<number[]>;
  /** Dépose le message. Renvoie l'UID attribué, s'il est communiqué. */
  deposer(folder: string, raw: Buffer, flags: string[], date: Date): Promise<number | undefined>;
};

/**
 * Trouve le dossier d'envoi.
 *
 * L'usage déclaré par le serveur (`\Sent`) prime sur le nom : il est fiable
 * quelle que soit la langue de la boîte.
 */
export function choisirDossier(
  dossiers: Array<{ path: string; specialUse?: string }>,
): string | null {
  const parUsage = dossiers.find((d) => d.specialUse === "\\Sent");
  if (parUsage) return parUsage.path;

  for (const nom of NOMS_ENVOYES) {
    const trouve = dossiers.find((d) => d.path.toLowerCase() === nom.toLowerCase());
    if (trouve) return trouve.path;
  }
  return null;
}

/**
 * Dépose une copie du message dans « Envoyés ».
 *
 * Ne lève jamais : un problème de copie doit remonter comme un RÉSULTAT, pour
 * que l'appelant puisse le consigner sans jamais confondre avec un échec
 * d'envoi.
 */
export async function copierDansEnvoyes(
  input: { raw: Buffer; messageId: string; date?: Date; folder?: string },
  boite: BoiteEnvoi,
): Promise<SentCopyResult> {
  try {
    const dossiers = await boite.list();
    const dossier = input.folder ?? choisirDossier(dossiers);

    if (!dossier) {
      return {
        status: "FAILED",
        detail:
          `Aucun dossier d'envoi trouvé parmi ${dossiers.length} dossier(s). ` +
          `Préciser IMAP_SENT_FOLDER dans .env.`,
      };
    }

    // Idempotence : c'est le serveur qui dit si le message y est déjà.
    const dejaPresent = await boite.rechercherMessageId(dossier, input.messageId);
    if (dejaPresent.length > 0) {
      return {
        status: "ALREADY_PRESENT",
        folder: dossier,
        uid: dejaPresent[0],
        detail: `Déjà présent dans « ${dossier} » (UID ${dejaPresent[0]}). Aucune copie ajoutée.`,
      };
    }

    // \Seen : un message que l'on a soi-même envoyé n'est pas « non lu ».
    const uid = await boite.deposer(dossier, input.raw, ["\\Seen"], input.date ?? new Date());

    return {
      status: "COPIED",
      folder: dossier,
      uid,
      detail: `Copie déposée dans « ${dossier} »${uid ? ` (UID ${uid})` : ""}.`,
    };
  } catch (e) {
    return {
      status: "FAILED",
      detail: `Copie impossible : ${e instanceof Error ? e.message : String(e)}. L'email est bien parti.`,
    };
  }
}

/** Boîte réelle, par IMAP. */
export class BoiteImap implements BoiteEnvoi {
  private client: ImapFlow | null = null;

  private async connecter(): Promise<ImapFlow> {
    if (this.client) return this.client;
    const { config, missing } = readImapConfig();
    if (!config) {
      throw new Error(`Configuration IMAP incomplète : ${missing.join(", ")}`);
    }
    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
      // Le journal d'imapflow reproduit les échanges, mot de passe compris.
      logger: false,
    });
    await client.connect();
    this.client = client;
    return client;
  }

  async list() {
    const client = await this.connecter();
    const dossiers = await client.list();
    return dossiers.map((d) => ({ path: d.path, specialUse: d.specialUse }));
  }

  async rechercherMessageId(folder: string, messageId: string): Promise<number[]> {
    const client = await this.connecter();
    // Ouverture en LECTURE SEULE pour la recherche : rien n'est modifié tant
    // qu'on n'a pas décidé de déposer.
    const verrou = await client.getMailboxLock(folder, { readOnly: true });
    try {
      const uids = await client.search({ header: { "message-id": messageId } }, { uid: true });
      return Array.isArray(uids) ? uids : [];
    } finally {
      verrou.release();
    }
  }

  async deposer(folder: string, raw: Buffer, flags: string[], date: Date) {
    const client = await this.connecter();
    const res = await client.append(folder, raw, flags, date);
    return typeof res === "object" && res && "uid" in res ? (res.uid as number) : undefined;
  }

  async fermer() {
    if (!this.client) return;
    await this.client.logout().catch(() => this.client?.close());
    this.client = null;
  }
}
