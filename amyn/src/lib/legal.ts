/**
 * Informations légales de l'éditeur.
 *
 * AUCUNE DE CES VALEURS N'EST INVENTÉE. Un champ `null` n'est pas affiché
 * (jamais d'emplacement « à compléter » en ligne) : la page dit à la place,
 * en toutes lettres, que l'entreprise est en cours de création. Tant qu'un
 * champ obligatoire manque, les mentions légales restent hors des moteurs de
 * recherche et `npm run check:launch` le signale.
 *
 * Références (vérifiées le 30 septembre 2026) :
 *   - loi n° 2004-575 (LCEN), art. 1-1 : une personne physique éditrice à
 *     titre professionnel publie ses nom, prénoms, domicile et numéro de
 *     téléphone, son numéro d'immatriculation le cas échéant, le directeur
 *     de la publication, et le nom, l'adresse et le téléphone de l'hébergeur ;
 *   - entreprendre.service-public.gouv.fr, fiche F31228 (mentions
 *     obligatoires d'un site internet professionnel).
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

/**
 * Situation d'immatriculation, affichée tant que SIREN et SIRET n'existent
 * pas. Formulation factuelle : elle ne prétend ni à une immatriculation ni
 * à un statut qui n'existent pas encore.
 */
export const registrationPending = {
  fr: "Entreprise en cours de création : les identifiants SIREN et SIRET ne sont pas encore attribués. Le numéro d'immatriculation, la forme juridique, l'adresse de l'établissement et la situation au regard de la TVA seront publiés sur cette page dès leur attribution.",
  en: "Business currently being set up: SIREN and SIRET identifiers have not yet been assigned. The registration number, legal form, business address and VAT status will be published on this page as soon as they are issued.",
} as const;

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
  addressEn: "440 N Barranca Ave #4133, Covina, CA 91723, United States",
  /* Téléphone publié par Vercel sur la même page officielle. */
  phone: "+1 559 288 7060",
  website: "https://vercel.com",
  verified: true,
} as const;

/** Libellés des champs, pour l'affichage et la vérification. */
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

export const LEGAL_LABELS_EN: Record<keyof LegalInfo, string> = {
  publisherName: "Publisher name",
  legalForm: "Legal form",
  shareCapital: "Share capital (companies only)",
  siren: "SIREN number",
  siret: "SIRET number",
  registration: "Registration (RCS / RNE)",
  address: "Registered address",
  vatNumber: "EU VAT number",
  vatMention: "VAT statement if not VAT-registered",
  publicationDirector: "Publication director",
  phone: "Phone",
  insurance: "Professional insurance",
};

/**
 * Champs exigés pour des mentions légales complètes (LCEN art. 1-1 ; fiche
 * F31228). Les autres dépendent du statut (capital, TVA, assurance).
 */
export const REQUIRED_LEGAL_FIELDS: (keyof LegalInfo)[] = [
  "publisherName",
  "legalForm",
  "siren",
  "address",
  "phone",
  "publicationDirector",
];

export function missingLegalFields(info: LegalInfo = legal) {
  return REQUIRED_LEGAL_FIELDS.filter((key) => !info[key]?.trim());
}

export const legalComplete = (info: LegalInfo = legal) =>
  missingLegalFields(info).length === 0;

/**
 * Durées de conservation annoncées dans la politique de confidentialité.
 * Ce sont des engagements, à respecter dans les outils (boîte mail, outil
 * de prospection). Les 3 ans après le dernier contact suivent la
 * recommandation de la CNIL pour les données de prospection.
 */
export const retention = {
  requests: "3 ans à compter du dernier échange",
  prospects: "3 ans à compter du dernier contact",
  optOut: "3 ans à compter de l'opposition, pour pouvoir la respecter",
  clients:
    "la durée de la relation contractuelle, puis les durées imposées par la loi (par exemple 10 ans pour les pièces comptables)",
} as const;

export const retentionEn = {
  requests: "3 years from our last exchange",
  prospects: "3 years from our last contact",
  optOut: "3 years from your objection, so that we can keep honouring it",
  clients:
    "the length of the contractual relationship, then the periods required by law (for example 10 years for accounting records)",
} as const;

/** Date de dernière mise à jour affichée sur les pages légales. */
export const LEGAL_UPDATED = "30 septembre 2026";
export const LEGAL_UPDATED_EN = "30 September 2026";
