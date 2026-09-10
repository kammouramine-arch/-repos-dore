/**
 * Défense contre l'injection de prompt.
 *
 * Tout contenu provenant d'un client, d'une photo, d'un document ou d'un
 * message entrant est considéré comme non fiable. Il est neutralisé puis
 * encapsulé dans une balise explicite que le prompt système désigne comme
 * « données », jamais comme « instructions ».
 */

const MAX_UNTRUSTED_LENGTH = 12_000;

const CONTROL_CHARS = new RegExp('[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]', 'g');

const INJECTION_PATTERNS: RegExp[] = [
  /ignore(?:z)?\s+(?:les\s+)?(?:instructions|consignes)\s+(?:pr[ée]c[ée]dentes|ci-dessus)/gi,
  /ignore\s+(?:all\s+)?(?:previous|above)\s+instructions/gi,
  /(?:tu es|you are)\s+(?:maintenant|now)\s+(?:un|une|a|an)\s+/gi,
  /<\/?(?:system|assistant|instructions?|donnees_non_fiables)>/gi,
  /system\s*prompt/gi,
  /\bdeveloper\s+mode\b/gi,
  /\boublie(?:z)?\s+(?:tout|toutes\s+les\s+consignes)/gi,
];

/** Neutralise les tentatives d'injection les plus courantes et borne la taille. */
export function sanitizeUntrusted(input: string | null | undefined): string {
  if (!input) return '';
  let value = String(input).replace(CONTROL_CHARS, ' ').slice(0, MAX_UNTRUSTED_LENGTH);
  for (const pattern of INJECTION_PATTERNS) {
    value = value.replace(pattern, '[contenu filtré]');
  }
  return value.trim();
}

/** Encapsule un contenu non fiable dans une balise de données inerte. */
export function wrapUntrusted(
  input: string | null | undefined,
  label = 'saisie_utilisateur',
): string {
  const safe = sanitizeUntrusted(input);
  if (!safe) return '';
  return `<donnees_non_fiables source="${label}">\n${safe}\n</donnees_non_fiables>`;
}

/** Échappe le texte inséré dans un contexte de confiance (catalogue, paramètres). */
export function escapeForPrompt(value: string): string {
  return value.replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim();
}
