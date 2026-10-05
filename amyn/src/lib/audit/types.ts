/**
 * AMYN Revenue Audit™ — modèle de données.
 *
 * Un audit = un fichier de données (src/content/audits/), rendu par des
 * composants génériques. Aucun contenu propre à une entreprise ne vit dans
 * les composants.
 *
 * Règle de fond : chaque information porte sa nature.
 *   - OBSERVÉ (`observed`)   : vérifié par AMYN (site, fiche publique,
 *                               document transmis), avec sa source ;
 *   - COMMUNIQUÉ (`provided`) : transmis directement par l'entreprise ;
 *   - HYPOTHÈSE              : piste à examiner, jamais présentée comme un
 *                               fait — elle a sa propre liste (`hypotheses`)
 *                               et dit comment la valider.
 * Rien n'est inventé : un chiffre absent reste `null` et s'affiche comme
 * « non communiqué » ; une catégorie impossible à évaluer reste `null` et
 * ne pèse pas sur le score.
 */

export type AuditLocale = "fr" | "en";

/** Nature d'une observation (les hypothèses ont leur propre type). */
export type Provenance = "observed" | "provided";
/** « À valider » : l'information existe mais doit être confirmée. */
export type Confidence = "high" | "medium" | "needs_validation";

export type CategoryId =
  | "leadCapture"
  | "response"
  | "qualification"
  | "followUp"
  | "crmHandoff"
  | "reactivation"
  | "visibility";

export type JourneyStageId =
  | "discovery"
  | "enquiry"
  | "response"
  | "qualification"
  | "crm"
  | "followUp"
  | "meeting"
  | "proposal"
  | "customer";

export type JourneyStatus = "verified" | "needs_validation" | "opportunity";

export type ModuleKey =
  | "leadCapture"
  | "aiReception"
  | "qualification"
  | "routing"
  | "crmAutomation"
  | "followUp"
  | "calendar"
  | "proposalWorkflow"
  | "reactivation"
  | "salesCopilot"
  | "managementDashboard";

export type Priority = "critical" | "high" | "medium" | "future";

/** Note de 1 (faible) à 3 (forte). */
export type Rating = 1 | 2 | 3;

export type AuditSource = {
  id: string;
  label: string;
  /**
   * website / public_listing / public_document : sources externes,
   * vérifiables (seules à pouvoir fonder une observation « observée ») ;
   * call / questionnaire / company_document : transmis par l'entreprise.
   */
  kind: "website" | "public_listing" | "public_document" | "call" | "questionnaire" | "company_document";
  url?: string;
  /** Date de consultation ou de l'échange (AAAA-MM-JJ). */
  date?: string;
};

export type Observation = {
  id: string;
  title: string;
  provenance: Provenance;
  category: CategoryId;
  stage?: JourneyStageId;
  statement: string;
  /** Identifiants de `sources` — au moins un. */
  sources: string[];
  confidence: Confidence;
  /** Formulée au conditionnel : une conséquence possible, pas un constat. */
  implication: string;
  recommendation: string;
};

export type Hypothesis = {
  id: string;
  title: string;
  category: CategoryId;
  statement: string;
  /** Comment la confirmer ou l'écarter. */
  validation: string;
};

export type ProvidedMetric = {
  id: string;
  label: string;
  value: string;
  source: string;
  note?: string;
};

export type CategoryScore = {
  id: CategoryId;
  /** Points obtenus, ou `null` : pas assez d'informations (exclu du score). */
  points: number | null;
  rationale: string;
  /** Observations / hypothèses qui fondent la note. */
  basis: string[];
};

export type JourneyStep = {
  id: JourneyStageId;
  status: JourneyStatus;
  note: string;
};

export type Opportunity = {
  id: string;
  title: string;
  summary: string;
  impact: Rating;
  confidence: Rating;
  /** 3 = complexe à mettre en œuvre. */
  complexity: Rating;
  relevance: Rating;
  basis: string[];
};

export type ModuleRecommendation = {
  module: ModuleKey;
  priority: Priority;
  what: string;
  why: string;
  impact: string;
  basis: string[];
};

export type RoiInputKey = "monthlyLeads" | "dealValue" | "grossMargin" | "qualificationRate" | "closeRate" | "historicLeads";

export type RoiAssumption = {
  key: RoiInputKey;
  /** `null` : non communiqué — jamais complété en silence. */
  value: number | null;
  origin: "provided" | "hypothesis";
  note?: string;
};

/** Leviers d'un scénario : points de pourcentage et part réactivée. */
export type ScenarioLevers = {
  qualificationLift: number;
  closeLift: number;
  reactivationRate: number;
};

export type RoiScenarios = { conservative: ScenarioLevers; central: ScenarioLevers; upside: ScenarioLevers };

export type RevenueAudit = {
  slug: string;
  locale: AuditLocale;
  status: "draft" | "ready" | "delivered" | "archived";
  /** Exemple fictif : affiché comme tel partout (écran et PDF). */
  fictional: boolean;
  company: {
    name: string;
    domain?: string;
    industry: string;
    country: string;
    /** Uniquement avec l'accord de l'entreprise. */
    logo?: { src: string; alt: string; permission: true };
  };
  /** AAAA-MM-JJ */
  date: string;
  preparedBy: string;
  summary: { context: string; primaryRecommendation: string };
  sources: AuditSource[];
  providedMetrics: ProvidedMetric[];
  scores: CategoryScore[];
  journey: JourneyStep[];
  observations: Observation[];
  hypotheses: Hypothesis[];
  opportunities: Opportunity[];
  recommendations: ModuleRecommendation[];
  roi: { assumptions: RoiAssumption[]; scenarios: RoiScenarios };
  /** Notes internes : jamais affichées. */
  notes?: string;
};
