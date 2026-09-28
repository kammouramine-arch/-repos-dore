/**
 * Informations légales de l'éditeur.
 *
 * AUCUNE DE CES VALEURS N'EST INVENTÉE. Tant qu'un champ vaut `null`, la
 * page concernée affiche un emplacement « [À COMPLÉTER — …] », reste hors
 * des moteurs de recherche, et `npm run check:launch` échoue.
 *
 * Ce fichier ne remplace pas un avis juridique : il rend visibles les
 * informations manquantes, il ne les devine pas.
 */

export type LegalInfo = {
  /** Dénomination ou nom de l'entrepreneur (ex. « Jeanne Dupont » ou « AMYN SAS »). */
  publisherName: string | null;
  /** Forme juridique (EI, micro-entreprise, SAS, SARL…). */
  legalForm: string | null;
  /** Capital social — uniquement pour une société. */
  shareCapital: string | null;
  siren: string | null;
  siret: string | null;
  /** Immatriculation (RCS / RNE) — selon la forme juridique. */
  registration: string | null;
  address: string | null;
  vatNumber: string | null;
  /** Mention à afficher si non assujetti (ex. « TVA non applicable, art. 293 B du CGI »). */
  vatMention: string | null;
  publicationDirector: string | null;
  phone: string | null;
  /** Assurance professionnelle, si elle doit être mentionnée pour l'activité. */
  insurance: string | null;
};

/*
 * Éditeur : personne physique Amine Kammour, déjà confirmée comme éditeur
 * et directeur de la publication dans la documentation juridique du dépôt
 * (docs/acquisition, branche DEVISERA). Aucune immatriculation n'existe
 * encore (création d'entreprise prévue) : SIREN, SIRET, forme juridique et
 * mention TVA restent vides. L'adresse personnelle ne doit pas être publiée
 * (décision consignée dans la même documentation) : il faut une adresse
 * professionnelle ou une domiciliation.
 */
export const legal: LegalInfo = {
  publisherName: "Amine Kammour",
  legalForm: null,
  shareCapital: null,
  siren: null,
  siret: null,
  registration: null,
  address: null,
  vatNumber: null,
  vatMention: null,
  publicationDirector: "Amine Kammour",
  phone: null,
  insurance: null,
};

/**
 * Hébergeur — constaté sur l'infrastructure : les en-têtes HTTP de
 * amyn.agency (`server: Vercel`, `x-vercel-id`) et l'adresse DNS
 * (216.198.79.1) désignent Vercel. Adresse postale vérifiée le 28 septembre
 * 2026 sur la page officielle vercel.com/legal/dmca-policy.
 */
export const hosting = {
  name: "Vercel Inc.",
  address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  website: "https://vercel.com",
  verified: true,
} as const;

/**
 * Conditions commerciales. Elles relèvent du contrat : aucune n'est
 * rédigée à la place de l'éditeur. Tant qu'une valeur vaut `null`, la page
 * « Conditions des services » affiche un emplacement et reste hors index.
 */
export type Terms = {
  payment: string | null;
  intellectualProperty: string | null;
  liability: string | null;
  termination: string | null;
  law: string | null;
};

export const terms: Terms = {
  payment: null,
  intellectualProperty: null,
  liability: null,
  termination: null,
  law: null,
};

export const TERMS_LABELS: Record<keyof Terms, string> = {
  payment: "Conditions de paiement (acomptes, échéances, pénalités de retard)",
  intellectualProperty: "Propriété intellectuelle et cession des droits",
  liability: "Garanties et responsabilité",
  termination: "Suspension et résiliation",
  law: "Droit applicable et juridiction compétente",
};

export const missingTerms = (t: Terms = terms) =>
  (Object.keys(t) as (keyof Terms)[]).filter((k) => !t[k]?.trim());

/** Libellés des champs, pour les emplacements et la vérification. */
export const LEGAL_LABELS: Record<keyof LegalInfo, string> = {
  publisherName: "Nom ou dénomination de l'éditeur",
  legalForm: "Forme juridique",
  shareCapital: "Capital social (société uniquement)",
  siren: "SIREN",
  siret: "SIRET",
  registration: "Immatriculation (RCS / RNE)",
  address: "Adresse du siège",
  vatNumber: "Numéro de TVA intracommunautaire",
  vatMention: "Mention TVA si non assujetti",
  publicationDirector: "Directeur de la publication",
  phone: "Téléphone",
  insurance: "Assurance professionnelle",
};

/**
 * Champs indispensables à la mise en ligne. Les autres dépendent du statut
 * (capital, TVA, assurance) et ne bloquent pas si le statut ne les exige pas.
 */
export const REQUIRED_LEGAL_FIELDS: (keyof LegalInfo)[] = [
  "publisherName",
  "legalForm",
  "siren",
  "address",
  "publicationDirector",
];

export function missingLegalFields(info: LegalInfo = legal) {
  return REQUIRED_LEGAL_FIELDS.filter((key) => !info[key]?.trim());
}

export const legalComplete = (info: LegalInfo = legal) =>
  missingLegalFields(info).length === 0;

/**
 * Durées de conservation annoncées dans la politique de confidentialité.
 * Ce sont des engagements : à valider par l'éditeur, puis à respecter dans
 * les outils (boîte mail, outil de prospection).
 */
export const retention = {
  requests: "3 ans à compter du dernier échange",
  prospects: "3 ans à compter du dernier contact",
  optOut: "3 ans à compter de l'opposition, pour pouvoir la respecter",
  clients:
    "la durée de la relation contractuelle, puis les durées imposées par la loi (par exemple 10 ans pour les pièces comptables)",
} as const;

/** Date de dernière mise à jour affichée sur les pages légales. */
export const LEGAL_UPDATED = "28 septembre 2026";
