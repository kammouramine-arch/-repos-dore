// ---------------------------------------------------------------------------
// LOT 3 — RECHERCHE D'EMAIL PROFESSIONNEL PUBLIC (emplacement réservé)
//
// RÈGLE ABSOLUE : ne JAMAIS deviner une adresse email.
// Pas de prenom.nom@entreprise.fr reconstitué. Jamais.
//
// L'email doit venir d'un endroit où l'entreprise l'a publié elle-même :
//   1. Page Mentions légales  ← obligatoire en France, meilleure source
//   2. Page Contact
//   3. Lien mailto: sur le site
//   4. Fiche Google Business / bio Instagram
//
// Priorité aux adresses génériques (contact@, info@) : juridiquement plus
// simples, ce ne sont pas des données personnelles.
//
// Si aucun email public n'est trouvé → le prospect reste RESEARCHED et
// n'entre jamais dans une campagne.
// ---------------------------------------------------------------------------

export type FoundEmail = {
  email: string;
  isGeneric: boolean;
  sourceKind: "LEGAL_NOTICE" | "WEBSITE" | "GOOGLE_BUSINESS" | "INSTAGRAM";
  sourceUrl: string;
  snippet?: string;
};

const GENERIC_PREFIXES = [
  "contact", "info", "bonjour", "hello", "accueil",
  "commercial", "rdv", "reservation", "salon", "boutique",
];

export function isGenericAddress(email: string): boolean {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  return GENERIC_PREFIXES.some((p) => local === p || local.startsWith(`${p}.`));
}

// Implémentations à venir au lot 3.
