// ---------------------------------------------------------------------------
// VERIFICATION ANTI-INVENTION
//
// Passe obligatoire avant qu'un brouillon puisse etre approuve.
// On verifie mecaniquement que l'email :
//   1. ne cite que des Issue reellement enregistrees pour CE prospect
//   2. ne contient aucun chiffre non present dans les preuves
//   3. n'emploie aucune promesse de resultat ni superlatif
//   4. comporte l'identite AMYN et une possibilite d'opposition (RGPD)
//   5. reste court
//
// Un brouillon qui echoue ne peut pas etre envoye. Point.
// ---------------------------------------------------------------------------

import { OFFERS } from "@/lib/constants";

export type VerificationInput = {
  subject: string;
  body: string;
  citedIssueIds: string[];
  /** Issues reellement enregistrees pour ce prospect. */
  knownIssueIds: string[];
  /** Chiffres autorises car issus des preuves (prix de l'offre, mesures). */
  allowedNumbers: number[];
  companyName: string;
  senderEmail: string;
  /**
   * L'email doit-il s'appuyer sur un probleme prouve ?
   *
   * true (defaut) pour un email de prospection : affirmer quelque chose sur le
   * site de quelqu'un sans preuve est exactement ce qu'on s'interdit.
   *
   * false UNIQUEMENT pour un message qui n'affirme rien sur l'entreprise —
   * une reponse dans une conversation que le prospect a lui-meme ouverte
   * (accuse de reception, tarifs, prise de rendez-vous). Des qu'un message
   * reprend un constat, il doit le citer et repasser a true.
   */
  requiresCitedIssue?: boolean;
};

export type VerificationResult = {
  passed: boolean;
  problems: string[];
  warnings: string[];
};

/** Formulations interdites : promesses, superlatifs, urgence artificielle. */
export const FORBIDDEN_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bgarant(i|ie|is|ies)\b/i, label: "promesse de garantie" },
  { re: /\b(doubler|tripler|multiplier par)\b/i, label: "promesse de multiplication" },
  { re: /\bx\s?[2-9]\b/i, label: "promesse de multiplication (x2, x3...)" },
  { re: /\b(meilleur|n°\s?1|numero 1|leader|incontournable)\b/i, label: "superlatif" },
  { re: /\bvous perdez\b/i, label: "affirmation de perte non démontrable" },
  { re: /\b(\d+)\s?%\s?(de plus|d'augmentation|en plus)/i, label: "statistique inventée" },
  { re: /\b(tous vos concurrents|toute votre concurrence)\b/i, label: "généralisation non vérifiée" },
  { re: /\burgent\b/i, label: "urgence artificielle" },
  { re: /\bderniere chance\b/i, label: "pression commerciale" },
  { re: /\b(cliquez ici|achetez maintenant)\b/i, label: "formulation publicitaire" },
];

/** Marqueurs RGPD obligatoires dans tout email de prospection. */
const OPT_OUT_MARKERS = [/\bstop\b/i, /d[ée]sinscri/i, /ne plus (recevoir|être contact)/i, /opposition/i];

/**
 * Chiffres toujours autorises : la grille tarifaire AMYN et l'annee en cours.
 * Toute autre valeur doit provenir d'une mesure d'audit enregistree.
 */
export function catalogNumbers(): number[] {
  return [...Object.values(OFFERS).map((o) => o.price), new Date().getFullYear()];
}

/** Extrait les nombres presents dans les preuves enregistrees d'un prospect. */
export function numbersFromEvidence(texts: Array<string | null | undefined>): number[] {
  const found: number[] = [];
  for (const text of texts) {
    if (!text) continue;
    for (const match of text.matchAll(/\d+(?:[.,]\d+)?/g)) {
      const value = Number(match[0].replace(",", "."));
      if (Number.isFinite(value)) found.push(value);
    }
  }
  return found;
}

export function verifyEmail(input: VerificationInput): VerificationResult {
  const problems: string[] = [];
  const warnings: string[] = [];
  const full = `${input.subject}\n${input.body}`;

  // 1. Les problemes cites existent-ils vraiment ?
  const unknown = input.citedIssueIds.filter((id) => !input.knownIssueIds.includes(id));
  if (unknown.length > 0) {
    problems.push(
      `L'email cite ${unknown.length} problème(s) absent(s) de la base de preuves : ${unknown.join(", ")}`,
    );
  }
  if ((input.requiresCitedIssue ?? true) && input.citedIssueIds.length === 0) {
    problems.push("L'email ne s'appuie sur aucun problème prouvé.");
  }

  // 2. Chiffres non justifies
  const numbers = [...full.matchAll(/\b(\d[\d\s.,]*)\b/g)]
    .map((m) => Number(m[1].replace(/[\s.,]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);

  const allowed = new Set(input.allowedNumbers);
  const unjustified = numbers.filter((n) => !allowed.has(n));
  if (unjustified.length > 0) {
    problems.push(
      `Chiffre(s) non justifié(s) par une preuve : ${[...new Set(unjustified)].join(", ")}. Seuls les prix de la grille AMYN et les mesures issues de l'audit sont autorisés.`,
    );
  }

  // 3. Formulations interdites
  for (const { re, label } of FORBIDDEN_PATTERNS) {
    if (re.test(full)) problems.push(`Formulation interdite détectée (${label}).`);
  }

  // 4. Conformite RGPD
  if (!OPT_OUT_MARKERS.some((re) => re.test(input.body))) {
    problems.push("Aucune possibilité d'opposition n'est proposée dans le corps de l'email (obligatoire).");
  }
  if (!input.body.includes("AMYN")) {
    problems.push("L'identité de l'expéditeur (AMYN) n'apparaît pas dans l'email.");
  }
  if (!input.body.includes(input.senderEmail)) {
    warnings.push("L'adresse de contact n'apparaît pas dans le corps de l'email.");
  }

  // 5. Longueur
  const lines = input.body.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length > 22) warnings.push(`Email long : ${lines.length} lignes non vides.`);
  if (input.subject.length > 90) warnings.push(`Objet long : ${input.subject.length} caractères.`);
  if (!input.subject.trim()) problems.push("Objet vide.");

  return { passed: problems.length === 0, problems, warnings };
}
