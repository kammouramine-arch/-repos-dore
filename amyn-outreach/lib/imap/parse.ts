// ---------------------------------------------------------------------------
// NORMALISATION DES EMAILS ENTRANTS
//
// Le corps d'une reponse contient presque toujours l'email d'origine cite en
// dessous. Si on le gardait, le classificateur reconnaitrait nos propres mots
// ("STOP pour ne plus recevoir...") et classerait la reponse en OPT_OUT a
// tort. On coupe donc la citation AVANT toute analyse.
// ---------------------------------------------------------------------------

/**
 * Marqueurs de debut de citation. Tout ce qui suit appartient a l'email
 * d'origine, pas a la reponse de la personne.
 */
const QUOTE_MARKERS: RegExp[] = [
  /^\s*-{2,}\s*(message d'origine|original message|message transf[ée]r[ée]|forwarded message)\s*-{2,}/im,
  /^\s*le\s.{0,60}\sa\s[ée]crit\s*:\s*$/im,
  /^\s*on\s.{0,60}\swrote\s*:\s*$/im,
  /^\s*de\s*:\s*.+\n\s*envoy[ée]\s*:/im,
  /^\s*from\s*:\s*.+\n\s*sent\s*:/im,
  /^_{10,}\s*$/m,
];

/** Signatures automatiques a retirer de la fin du message. */
const SIGNATURE_MARKERS: RegExp[] = [/^\s*--\s*$/m];

/**
 * Retire la citation de l'email d'origine et la signature.
 * Retourne le texte reellement ecrit par la personne.
 */
export function stripQuotedReply(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n");

  let cut = text.length;
  for (const marker of [...QUOTE_MARKERS, ...SIGNATURE_MARKERS]) {
    const match = marker.exec(text);
    if (match && match.index < cut) cut = match.index;
  }
  text = text.slice(0, cut);

  // Lignes citees ligne a ligne ("> ...") : elles ne sont pas de l'auteur.
  const lines = text.split("\n").filter((line) => !/^\s*>/.test(line));

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Extrait la premiere adresse email d'une chaine d'en-tete. */
export function extractAddress(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/.exec(header);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Retour automatique (absence du bureau, accuse de reception) : ces messages
 * ne sont pas des reponses humaines et ne doivent pas faire avancer un
 * prospect. On les detecte par leurs en-tetes standard puis par leur objet.
 */
export function looksAutomatic(input: {
  subject: string;
  headers?: Record<string, string | undefined>;
}): boolean {
  const headers = input.headers ?? {};
  const get = (name: string) => (headers[name] ?? headers[name.toLowerCase()] ?? "").toLowerCase();

  if (get("auto-submitted") && get("auto-submitted") !== "no") return true;
  if (get("x-autoreply") || get("x-autorespond")) return true;
  if (get("precedence") === "auto_reply" || get("precedence") === "bulk") return true;

  return /\b(absence du bureau|out of office|réponse automatique|automatic reply|vacation|congés annuels)\b/i.test(
    input.subject,
  );
}
