// ---------------------------------------------------------------------------
// LOT 4 — RÉDACTION DES EMAILS (emplacement réservé)
//
// Modèle prévu : claude-opus-5 (Anthropic).
//
// Ce que le modèle reçoit : nom, secteur, ville, la liste des Issue AVEC
// leurs preuves, l'offre recommandée. Rien d'autre.
//
// Contraintes appliquées :
//   • 6 à 10 lignes maximum
//   • 1 à 2 problèmes cités, les plus concrets
//   • aucun chiffre, aucune promesse de résultat, aucun superlatif
//   • mention de désinscription obligatoire (RGPD)
//
// Puis VÉRIFICATION AUTOMATIQUE avant validation : le brouillon est rejeté
// s'il cite un problème absent de la table Issue, contient un chiffre non
// fourni, ou un mot interdit ("garanti", "+30 %", "x2"...).
// ---------------------------------------------------------------------------

export type EmailGenerationInput = {
  prospectName: string;
  sector: string;
  city: string;
  issues: Array<{ id: string; title: string; summary: string; evidenceUrl?: string }>;
  offerKey: string;
  offerPrice: number;
};

export type GeneratedEmail = {
  subject: string;
  body: string;
  citedIssueIds: string[];
  model: string;
};

export type VerificationResult = {
  passed: boolean;
  problems: string[];
};

/** Mots qui font échouer la vérification automatique. */
export const FORBIDDEN_CLAIMS = [
  "garanti", "garantie", "assuré", "certain",
  "doubler", "tripler", "x2", "x3",
  "meilleur", "n°1", "leader",
  "immédiatement", "en 24h",
];

// Implémentations à venir au lot 4.
