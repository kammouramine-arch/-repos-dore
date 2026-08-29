// ---------------------------------------------------------------------------
// CANDIDATS DE DOMAINE — des hypothèses, jamais des conclusions
//
// Le registre des entreprises ne publie aucun site web. Pour une prospection
// nationale, il faut donc le trouver. Deux façons de s'y prendre :
//
//   • deviner un domaine plausible et l'écrire dans la fiche — inacceptable :
//     un email qui commente « votre site » en désignant le site de quelqu'un
//     d'autre est pire que pas d'email du tout ;
//   • générer des hypothèses, aller les vérifier, et ne retenir que celles
//     dont l'appartenance est PROUVÉE.
//
// Ce fichier ne fait que la première moitié : produire des candidats. Rien
// de ce qu'il renvoie n'a la moindre valeur tant que lib/site/verify.ts n'a
// pas trouvé de preuve. Un candidat n'est jamais enregistré comme site.
// ---------------------------------------------------------------------------

/** Mots qui n'identifient pas l'entreprise et polluent un nom de domaine. */
const MOTS_VIDES = new Set([
  "le", "la", "les", "l", "du", "de", "des", "d", "au", "aux", "et", "the",
  "sarl", "sas", "sasu", "eurl", "sa", "snc", "eirl", "ei", "scop", "sci",
  "scm", "selarl", "gie", "earl", "societe", "entreprise", "etablissements",
  "ets", "groupe", "france",
]);

/** Retire accents, ponctuation et forme juridique. */
export function motsSignifiants(nom: string): string[] {
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((m) => m.length > 0 && !MOTS_VIDES.has(m));
}

export type Candidat = {
  domaine: string;
  /** Comment il a été formé. Sert à expliquer la démarche, pas à la justifier. */
  forme: string;
};

/**
 * Construit les domaines à tester pour une entreprise.
 *
 * Volontairement peu nombreux et volontairement plausibles. Multiplier les
 * variantes ne trouverait pas plus de vrais sites — cela ferait surtout plus
 * de requêtes vers des serveurs qui ne nous ont rien demandé.
 */
export function candidatsDomaine(
  nom: string,
  options: { maxCandidats?: number } = {},
): Candidat[] {
  const max = options.maxCandidats ?? 6;
  const mots = motsSignifiants(nom);
  if (mots.length === 0) return [];

  const bases = new Set<string>();
  const colle = mots.join("");
  const tiret = mots.join("-");

  // Un nom trop court après nettoyage ne discrimine rien : « bar », « auto »
  // renverraient des sites sans aucun rapport. On s'abstient.
  if (colle.length < 4) return [];

  bases.add(colle);
  if (mots.length > 1) bases.add(tiret);
  // Les deux premiers mots suffisent souvent : « Boulangerie Patisserie
  // Dupont Freres » se trouve en général sur boulangerie-dupont.fr.
  if (mots.length > 2) {
    bases.add(mots.slice(0, 2).join(""));
    bases.add(mots.slice(0, 2).join("-"));
  }

  const candidats: Candidat[] = [];
  for (const base of bases) {
    if (base.length < 4 || base.length > 40) continue;
    for (const tld of [".fr", ".com"]) {
      candidats.push({
        domaine: `${base}${tld}`,
        forme: base === colle ? "nom accolé" : base.includes("-") ? "nom avec tirets" : "deux premiers mots",
      });
      if (candidats.length >= max) return candidats;
    }
  }

  return candidats;
}
