/**
 * Informations légales de l'éditeur.
 *
 * AUCUNE DE CES VALEURS N'EST INVENTÉE : elles viennent des identifiants
 * officiels transmis par l'entrepreneur (2 octobre 2026). Un champ `null`
 * n'est pas affiché ; tant qu'un champ obligatoire manque, les mentions
 * légales restent hors des moteurs de recherche et `npm run check:launch`
 * le signale.
 *
 * Références (vérifiées le 2 octobre 2026) :
 *   - loi n° 2004-575 (LCEN), art. 1-1 (Légifrance) : une personne physique
 *     éditrice à titre professionnel publie ses nom, prénoms, adresse et
 *     numéro de téléphone, son numéro d'immatriculation le cas échéant, le
 *     directeur de la publication, et le nom, l'adresse et le téléphone de
 *     l'hébergeur ;
 *   - entreprendre.service-public.gouv.fr, fiche F31228 (mentions d'un site
 *     d'entrepreneur individuel) et actualité A15744 / décret n° 2022-725 :
 *     le nom de l'entrepreneur est précédé ou suivi de « entrepreneur
 *     individuel » ou « EI » ;
 *   - n° RCS : seulement pour une activité commerciale. AMYN exerce une
 *     activité libérale non réglementée (micro-entrepreneur) : non concerné ;
 *   - TVA : franchise en base → mention « TVA non applicable, article 293 B
 *     du CGI » à la place d'un numéro de TVA.
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

/** Nom commercial (enseigne) sous lequel l'entreprise individuelle exerce. */
export const tradeName = "AMYN";

/*
 * Éditeur : Amine Kammour, entrepreneur individuel (EI), nom commercial
 * AMYN. Identifiants officiels transmis le 2 octobre 2026 (SIREN et SIRET
 * vérifiés par leur clé de contrôle ; l'immatriculation, toute récente,
 * n'apparaissait pas encore dans l'annuaire public à cette date).
 */
export const legal: LegalInfo = {
  publisherName: "Amine Kammour",
  legalForm: "Entrepreneur individuel (EI)",
  shareCapital: null,
  siren: "130 867 757",
  siret: "130 867 757 00010",
  /* Activité libérale non réglementée : pas d'immatriculation au RCS (réservé
     aux commerçants). Aucune mention d'immatriculation n'est donc affichée. */
  registration: null,
  address: "18 rue Blériot, 59139 Wattignies, France",
  /* Franchise en base de TVA (micro-entrepreneur) : pas de numéro de TVA,
     mention légale de non-application à la place. */
  vatNumber: null,
  vatMention: "TVA non applicable, article 293 B du CGI.",
  publicationDirector: "Amine Kammour",
  phone: "+33 7 55 88 77 09",
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
  address: "Adresse professionnelle",
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
  address: "Business address",
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
export const LEGAL_UPDATED = "5 octobre 2026";
export const LEGAL_UPDATED_EN = "5 October 2026";
