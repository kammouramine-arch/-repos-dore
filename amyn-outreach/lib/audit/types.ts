// ---------------------------------------------------------------------------
// MOTEUR D'AUDIT — contrat de base
//
// RÈGLE ABSOLUE : aucune affirmation sans preuve.
//
// Chaque règle retourne un CheckResult qui contient obligatoirement :
//   • ce qui a été OBSERVÉ (factuel, jamais une interprétation)
//   • COMMENT cela a été observé (méthode, outil, requête)
//   • la date du constat
//   • un verdict et un niveau de confiance
//
// Une règle qui ne peut pas conclure retourne UNVERIFIED. Elle n'invente rien.
// ---------------------------------------------------------------------------

/** Résultat d'une vérification. */
export const VERDICTS = ["VERIFIED", "UNVERIFIED", "NOT_FOUND"] as const;
export type Verdict = (typeof VERDICTS)[number];

/**
 * VERIFIED   — le constat est démontré par une preuve exploitable.
 * UNVERIFIED — information insuffisante pour conclure. On ne conclut pas.
 * NOT_FOUND  — l'élément a été cherché, à des endroits précis, et non trouvé.
 */

export const CONFIDENCES = ["HIGH", "MEDIUM", "LOW"] as const;
export type Confidence = (typeof CONFIDENCES)[number];

export const SEVERITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const RULE_CATEGORIES = [
  "PRESENCE",
  "ACCESSIBILITE",
  "SECURITE",
  "MOBILE",
  "CONTACT",
  "CONVERSION",
  "LOCAL",
  "TECHNIQUE",
  "GOOGLE",
] as const;
export type RuleCategory = (typeof RULE_CATEGORIES)[number];

/** La preuve conservée pour un constat. */
export type Evidence = {
  /** URL exacte sur laquelle porte le constat. */
  targetUrl?: string;
  /** Extrait littéral (HTML, en-tête, message d'erreur). Jamais reformulé. */
  snippet?: string;
  /** Mesures brutes : codes HTTP, millisecondes, octets, compteurs. */
  data?: Record<string, unknown>;
};

/** Ce que retourne une règle. */
export type CheckResult = {
  verdict: Verdict;
  confidence: Confidence;

  /**
   * true UNIQUEMENT si ce constat démontre un problème exploitable
   * commercialement. Un `isProblem: true` avec un verdict autre que VERIFIED
   * est refusé par le moteur.
   */
  isProblem: boolean;

  /** Type de problème (catalogue ISSUE_TYPES). Requis si isProblem. */
  issueType?: string;
  severity?: Severity;
  /** Titre court affiché dans la fiche. Requis si isProblem. */
  title?: string;

  /** CE QUI A ÉTÉ OBSERVÉ. Factuel. Chiffré quand c'est mesurable. */
  observation: string;
  /** COMMENT cela a été observé. */
  method: string;

  evidence?: Evidence;
};

/** Une règle d'audit. Ajouter une règle = créer un fichier + une ligne dans le registre. */
export type AuditRule = {
  /** Identifiant stable, utilisé en base. Ne jamais le renommer. */
  id: string;
  label: string;
  category: RuleCategory;
  /** Ordre d'exécution (croissant). Les règles de présence passent en premier. */
  order: number;
  /**
   * La règle peut-elle s'exécuter dans ce contexte ?
   * Retourner false quand les données nécessaires manquent : le moteur
   * enregistrera alors un UNVERIFIED explicite plutôt que rien.
   */
  applicable: (ctx: AuditContext) => boolean;
  /** Raison affichée quand la règle n'est pas applicable. */
  notApplicableReason?: (ctx: AuditContext) => string;
  run: (ctx: AuditContext) => Promise<CheckResult> | CheckResult;
};

// --- Données d'entrée -------------------------------------------------------

export type FetchedPage = {
  requestedUrl: string;
  finalUrl: string;
  ok: boolean;
  status: number;
  statusText: string;
  contentType: string;
  html: string;
  bytes: number;
  /** Durée totale de la requête, en millisecondes. */
  durationMs: number;
  redirected: boolean;
  headers: Record<string, string>;
  error?: string;
  errorCode?: string;
};

export type ProspectInput = {
  id: string;
  name: string;
  sector: string;
  city: string;
  website: string | null;
  googleBusinessUrl: string | null;
  googlePlaceId: string | null;
  instagramUrl: string | null;
  phone: string | null;
  email: string | null;
  sourceLabels: string[];
};

export type AuditContext = {
  prospect: ProspectInput;
  /** Pages deja analysees (DOM + texte). Fournies par le moteur. */
  parsed: import("./html").ParsedPage[];
  parsedHome: import("./html").ParsedPage | null;
  /** Page d'accueil. null si absente ou inaccessible. */
  home: FetchedPage | null;
  /** Autres pages récupérées (contact, mentions légales, réservation...). */
  pages: FetchedPage[];
  /** Toutes les pages exploitables, accueil comprise. */
  allPages: FetchedPage[];
  /** Texte visible concaténé de toutes les pages, en minuscules. Pour les recherches. */
  combinedText: string;
  /** Le site a-t-il pu être atteint ? */
  siteReachable: boolean;
  /** robots.txt interdit-il l'exploration ? */
  robotsBlocked: boolean;
  robotsNote?: string;
  /** Utilitaire de requête, pour les règles qui doivent vérifier un lien. */
  probe: (url: string) => Promise<{ status: number; ok: boolean; error?: string }>;
  startedAt: Date;
  userAgent: string;
};

/** Rapport complet d'une exécution. */
export type AuditReport = {
  status: "COMPLETE" | "INCOMPLETE" | "FAILED" | "BLOCKED_BY_ROBOTS";
  note?: string;
  checks: Array<CheckResult & { ruleId: string; ruleLabel: string; category: RuleCategory }>;
  stats: {
    pagesFetched: number;
    bytesFetched: number;
    requestsMade: number;
    rulesRun: number;
    verified: number;
    unverified: number;
    notFound: number;
    problems: number;
    durationMs: number;
  };
};

export const VERDICT_META: Record<Verdict, { label: string; badge: string; dot: string }> = {
  VERIFIED: {
    label: "Vérifié",
    badge: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
    dot: "bg-emerald-400",
  },
  UNVERIFIED: {
    label: "Non vérifiable",
    badge: "bg-amber-500/10 text-amber-300 ring-amber-400/20",
    dot: "bg-amber-400",
  },
  NOT_FOUND: {
    label: "Non trouvé",
    badge: "bg-sky-500/10 text-sky-300 ring-sky-400/20",
    dot: "bg-sky-400",
  },
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  HIGH: "Élevée",
  MEDIUM: "Moyenne",
  LOW: "Faible",
};

export const CATEGORY_LABEL: Record<RuleCategory, string> = {
  PRESENCE: "Présence",
  ACCESSIBILITE: "Accessibilité",
  SECURITE: "Sécurité",
  MOBILE: "Mobile",
  CONTACT: "Contact",
  CONVERSION: "Conversion",
  LOCAL: "Présence locale",
  TECHNIQUE: "Technique",
  GOOGLE: "Google Business",
};
