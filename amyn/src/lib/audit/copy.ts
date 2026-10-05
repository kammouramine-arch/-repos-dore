import type { Assessment, Tier } from "./model.ts";
import type { AuditLocale, CategoryId, Confidence, JourneyStageId, JourneyStatus, ModuleKey, Priority } from "./types.ts";

/**
 * Libellés de l'audit (structure du document), dans la langue de l'audit.
 * Le contenu propre à une entreprise vit dans son fichier de données.
 */

const nb = " ";
const nn = " ";

const fr = {
  brand: "AMYN",
  product: "Revenue Audit™",
  preparedFor: "Préparé exclusivement pour",
  confidential: "Privé & confidentiel",
  preparedBy: "Préparé par",
  sample: "Exemple d'audit — entreprise fictive",
  sampleNote:
    "Élan Habitat n'existe pas. Les observations, les chiffres et les sources de cet exemple sont inventés pour montrer le format d'un Revenue Audit — ce n'est pas le travail réalisé pour un client.",
  draft: "Brouillon — document de travail, non transmis",
  dateLocale: "fr-FR",

  toolbar: {
    contents: "Sommaire",
    present: "Présenter",
    exit: "Quitter la présentation",
    export: "Exporter en PDF",
    presentHint: "Flèches ou barre d'espace pour avancer · Échap pour quitter",
  },

  sections: {
    summary: "Synthèse",
    scorecard: "Évaluation",
    journey: "Parcours actuel",
    observations: "Observations",
    opportunities: "Carte des opportunités",
    roi: "Modèle économique",
    architecture: "Architecture recommandée",
    roadmap: "Feuille de route",
    investment: "Investissement",
    nextStep: "Prochaine étape",
    sources: "Sources et méthode",
  },

  provenance: {
    observed: { label: "Observé", desc: "Vérifié par AMYN à partir d'une source externe ou d'un document fourni." },
    provided: { label: "Communiqué", desc: "Information transmise directement par l'entreprise." },
    hypothesis: { label: "Hypothèse", desc: "Piste qui mérite d'être examinée ; non confirmée." },
  },
  legendTitle: "Lire cet audit",
  confidenceLabel: "Confiance",
  confidence: { high: "Élevée", medium: "Moyenne", low: "Faible" } as Record<Confidence, string>,

  categories: {
    leadCapture: "Captation des demandes",
    response: "Infrastructure de réponse",
    qualification: "Qualification",
    followUp: "Relances",
    crmHandoff: "CRM & transmission commerciale",
    reactivation: "Réactivation",
    visibility: "Visibilité de la direction",
  } as Record<CategoryId, string>,

  assessment: {
    foundational: { label: "Fondations", desc: "Les bases du parcours commercial restent à construire." },
    developing: { label: "En développement", desc: "Les bases existent ; plusieurs étapes dépendent encore de l'effort individuel." },
    strong: { label: "Solide", desc: "Un parcours structuré, avec des marges d'amélioration ciblées." },
    advanced: { label: "Avancé", desc: "Une infrastructure commerciale maîtrisée de bout en bout." },
  } as Record<Assessment, { label: string; desc: string }>,

  summary: {
    title: [{ text: "Synthèse" }, { accent: "exécutive." }],
    score: "Revenue Infrastructure Score",
    level: "Niveau",
    strongest: "Point fort",
    priority: "Opportunité prioritaire",
    recommendation: "Recommandation principale",
    basis: (n: number, points: number) =>
      `Calculé sur ${n} des 7 catégories (${points} points évaluables). Une catégorie sans information suffisante ne pénalise pas le score.`,
    noScore: "Pas encore assez d'informations pour calculer un score.",
  },

  scorecard: {
    title: [{ text: "Sept dimensions," }, { accent: "notées sur preuves." }],
    lead: "Chaque note s'appuie sur des observations ou des informations communiquées, citées en regard.",
    notEnough: "Pas assez d'informations",
    notEnoughNote: "Exclu du score",
    basis: "Fondé sur",
    points: "points",
  },

  journey: {
    title: [{ text: "De la découverte" }, { text: "au", accent: "client." }],
    lead: "Le parcours tel que nous le comprenons aujourd'hui, étape par étape.",
    stages: {
      discovery: "Découverte",
      enquiry: "Demande",
      response: "Réponse",
      qualification: "Qualification",
      crm: "CRM",
      followUp: "Relance",
      meeting: "Rendez-vous",
      proposal: "Proposition",
      customer: "Client",
    } as Record<JourneyStageId, string>,
    status: {
      verified: "Vérifié",
      needs_validation: "À valider",
      opportunity: "Opportunité",
    } as Record<JourneyStatus, string>,
  },

  observations: {
    title: [{ text: "Ce que nous avons" }, { accent: "constaté." }],
    lead: "Chaque observation indique sa nature, sa source et notre niveau de confiance.",
    evidence: "Source",
    implication: "Implication commerciale possible",
    recommendation: "Recommandation AMYN",
    providedTitle: "Informations communiquées",
    notProvided: "Non communiqué",
    hypothesesTitle: "Hypothèses à valider",
    hypothesesLead: "Des pistes, pas des constats : elles ne fondent aucune affirmation de cet audit tant qu'elles ne sont pas vérifiées.",
    validation: "Comment la valider",
  },

  opportunities: {
    title: [{ text: "Où agir" }, { accent: "d'abord." }],
    lead: "Priorité = impact (compté double) + confiance + pertinence commerciale − complexité de mise en œuvre.",
    tiers: { high: "Priorité haute", medium: "Priorité moyenne", lower: "Priorité basse" } as Record<Tier, string>,
    factors: { impact: "Impact", confidence: "Confiance", complexity: "Complexité", relevance: "Pertinence" },
    empty: "—",
  },

  roi: {
    title: [{ text: "Un modèle," }, { accent: "pas une promesse." }],
    lead: "Chaque hypothèse est modifiable en séance. Les valeurs communiquées par l'entreprise et les hypothèses de travail sont signalées comme telles.",
    assumptions: "Hypothèses",
    inputs: {
      monthlyLeads: { label: "Demandes par mois", unit: "" },
      dealValue: { label: "Valeur moyenne d'un projet", unit: "€" },
      qualificationRate: { label: "Taux de qualification", unit: "%" },
      closeRate: { label: "Taux de signature (demandes qualifiées)", unit: "%" },
      historicLeads: { label: "Demandes historiques", unit: "" },
      grossMargin: { label: "Marge brute", unit: "%" },
    },
    origin: { provided: "Communiqué", hypothesis: "Hypothèse", session: "Modifié en séance" },
    missing: "À renseigner",
    levers: "Leviers par scénario",
    leverLabels: {
      qualificationLift: "Qualification (+ pts)",
      closeLift: "Signature (+ pts)",
      reactivationRate: "Historique réactivé (%)",
    },
    scenarios: { baseline: "Situation actuelle", conservative: "Prudent", central: "Central", upside: "Favorable" },
    customers: "Projets signés / an",
    revenue: "Chiffre d'affaires modélisé",
    incremental: "Écart avec la situation actuelle",
    margin: "Marge brute additionnelle",
    marginMissing: "Marge non communiquée",
    needInputs: "Renseignez les hypothèses manquantes pour afficher le modèle. Aucune valeur n'est complétée automatiquement.",
    reset: "Revenir aux hypothèses de l'audit",
    formula:
      "Projets signés par an = demandes × 12 × qualification × signature ; dans un scénario, une part de l'historique réactivée est signée au même taux.",
    disclaimer: "Scénario illustratif, ni prévision ni garantie de chiffre d'affaires.",
  },

  architecture: {
    title: [{ text: "Le Revenue OS" }, { accent: "recommandé." }],
    lead: "Seuls les modules justifiés par les observations sont recommandés. Les autres restent visibles, et marqués comme tels.",
    groups: { capture: "Capter", convert: "Convertir", steer: "Piloter" },
    notRecommended: "Non recommandé à ce stade",
    what: "Ce qu'AMYN mettrait en place",
    why: "Pourquoi",
    impact: "Effet opérationnel",
    basis: "Fondé sur",
    recommendationsTitle: "Recommandations, module par module",
  },
  modules: {
    leadCapture: "Captation des demandes",
    aiReception: "Réception IA",
    qualification: "Qualification",
    routing: "Attribution",
    crmAutomation: "Automatisation du CRM",
    followUp: "Relances",
    calendar: "Agenda",
    proposalWorkflow: "Suivi des propositions",
    reactivation: "Réactivation",
    salesCopilot: "Copilote commercial",
    managementDashboard: "Tableau de bord direction",
  } as Record<ModuleKey, string>,
  priority: { critical: "Critique", high: "Élevée", medium: "Moyenne", future: "Plus tard" } as Record<Priority, string>,

  roadmap: {
    title90: [{ text: "Quatre-vingt-dix" }, { accent: "jours." }],
    titleWeeks: (w: number) => [{ text: "Feuille de route," }, { accent: `${w} semaines.` }],
    lead: "Dimensionnée par le périmètre recommandé ; précisée lors de la session d'architecture.",
    weeks: (a: number, b: number) => (a === b ? `Semaine ${a}` : `Semaines ${a}–${b}`),
    phases: {
      architecture: { name: "Architecture des revenus", items: ["Validation des hypothèses", "Cartographie des processus", "Audit des données et des outils", "Architecture cible validée"] },
      implementation: { name: "Mise en œuvre", items: [] as string[] },
      deployment: { name: "Déploiement & recette", items: ["Scénarios de test réels", "Formation de l'équipe", "Mise en service progressive"] },
      optimization: { name: "Optimisation", items: ["Mesure et ajustements", "Règles et messages affinés"] },
    },
    later: "Après 90 jours",
  },

  investment: {
    title: [{ text: "L'investissement." }],
    product: "AMYN Revenue OS™",
    kind: "Mise en place sur mesure",
    from: "À partir de",
    price: `25${nn}000${nb}€`,
    tax: "TVA non applicable, article 293 B du CGI.",
    body:
      "L'investissement final dépend de la complexité du système, des intégrations, du périmètre d'automatisation, de l'architecture des données et des exigences de mise en œuvre. Il est fixé après la session d'architecture, avant tout engagement.",
  },

  nextStep: {
    title: [{ text: "Réserver une session" }, { text: "d'architecture", accent: "Revenue." }],
    cta: "Réserver une session d'architecture Revenue",
    duration: "60 minutes avec AMYN.",
    items: [
      "Valider les observations",
      "Cartographier les processus internes",
      "Modéliser l'économie du projet",
      "Définir la mise en œuvre",
      "Déterminer si Revenue OS a un sens commercial",
    ],
    promise: "Si l'économie ne justifie pas l'engagement, nous vous le dirons.",
    emailSubject: (company: string) => `Session d'architecture Revenue — ${company}`,
  },

  sourcesSection: {
    title: [{ text: "Sources" }, { text: "et", accent: "méthode." }],
    method:
      "Cet audit distingue ce que nous avons observé, ce que l'entreprise nous a communiqué et ce qui reste à vérifier. Nous n'avons eu accès à aucun système interne sans autorisation ; aucun chiffre n'a été estimé à la place de l'entreprise sans être signalé comme hypothèse.",
    kinds: {
      website: "Site web",
      public_listing: "Fiche publique",
      call: "Échange",
      document: "Document",
      questionnaire: "Questionnaire",
      other: "Autre",
    },
  },

  footer: (company: string) => `AMYN Revenue Audit™ · ${company} · Privé & confidentiel`,
  pageOf: "/",
};

export type AuditCopy = typeof fr;

const en: AuditCopy = {
  brand: "AMYN",
  product: "Revenue Audit™",
  preparedFor: "Prepared exclusively for",
  confidential: "Private & Confidential",
  preparedBy: "Prepared by",
  sample: "Sample Audit — Fictional Company",
  sampleNote:
    "Élan Habitat does not exist. The observations, figures and sources in this sample are invented to show the format of a Revenue Audit — it is not work carried out for a client.",
  draft: "Draft — working document, not delivered",
  dateLocale: "en-GB",

  toolbar: {
    contents: "Contents",
    present: "Present",
    exit: "Exit presentation",
    export: "Export PDF",
    presentHint: "Arrows or space bar to move on · Esc to exit",
  },

  sections: {
    summary: "Executive summary",
    scorecard: "Assessment",
    journey: "Current journey",
    observations: "Observations",
    opportunities: "Opportunity map",
    roi: "Economic model",
    architecture: "Recommended architecture",
    roadmap: "Roadmap",
    investment: "Investment",
    nextStep: "Next step",
    sources: "Sources & method",
  },

  provenance: {
    observed: { label: "Observed", desc: "Verified by AMYN from an external source or a document provided." },
    provided: { label: "Provided", desc: "Information supplied directly by the company." },
    hypothesis: { label: "Hypothesis", desc: "Worth investigating; not confirmed." },
  },
  legendTitle: "Reading this audit",
  confidenceLabel: "Confidence",
  confidence: { high: "High", medium: "Medium", low: "Low" },

  categories: {
    leadCapture: "Lead Capture",
    response: "Response Infrastructure",
    qualification: "Qualification",
    followUp: "Follow-Up",
    crmHandoff: "CRM & Commercial Handoff",
    reactivation: "Reactivation Infrastructure",
    visibility: "Management Visibility",
  },

  assessment: {
    foundational: { label: "Foundational", desc: "The basics of the sales journey are still to be built." },
    developing: { label: "Developing", desc: "The basics exist; several stages still depend on individual effort." },
    strong: { label: "Strong", desc: "A structured journey, with targeted room for improvement." },
    advanced: { label: "Advanced", desc: "A sales infrastructure managed end to end." },
  },

  summary: {
    title: [{ text: "Executive" }, { accent: "summary." }],
    score: "Revenue Infrastructure Score",
    level: "Assessment",
    strongest: "Strongest area",
    priority: "Highest-priority opportunity",
    recommendation: "Primary recommendation",
    basis: (n: number, points: number) =>
      `Calculated on ${n} of 7 categories (${points} assessable points). A category without enough information does not lower the score.`,
    noScore: "Not enough information yet to calculate a score.",
  },

  scorecard: {
    title: [{ text: "Seven dimensions," }, { accent: "scored on evidence." }],
    lead: "Each score rests on observations or provided information, cited alongside.",
    notEnough: "Not enough information",
    notEnoughNote: "Excluded from the score",
    basis: "Based on",
    points: "points",
  },

  journey: {
    title: [{ text: "From discovery" }, { text: "to", accent: "customer." }],
    lead: "The journey as we understand it today, stage by stage.",
    stages: {
      discovery: "Discovery",
      enquiry: "Enquiry",
      response: "Response",
      qualification: "Qualification",
      crm: "CRM",
      followUp: "Follow-up",
      meeting: "Meeting",
      proposal: "Proposal",
      customer: "Customer",
    },
    status: { verified: "Verified", needs_validation: "Needs validation", opportunity: "Potential opportunity" },
  },

  observations: {
    title: [{ text: "What we" }, { accent: "found." }],
    lead: "Each observation states its nature, its source and our level of confidence.",
    evidence: "Evidence",
    implication: "Potential commercial implication",
    recommendation: "AMYN recommendation",
    providedTitle: "Information provided",
    notProvided: "Not provided",
    hypothesesTitle: "Hypotheses to validate",
    hypothesesLead: "Leads, not findings: none of them supports any statement in this audit until verified.",
    validation: "How to validate",
  },

  opportunities: {
    title: [{ text: "Where to act" }, { accent: "first." }],
    lead: "Priority = impact (counted twice) + confidence + commercial relevance − implementation complexity.",
    tiers: { high: "High priority", medium: "Medium priority", lower: "Lower priority" },
    factors: { impact: "Impact", confidence: "Confidence", complexity: "Complexity", relevance: "Relevance" },
    empty: "—",
  },

  roi: {
    title: [{ text: "A model," }, { accent: "not a promise." }],
    lead: "Every assumption can be changed live. Values provided by the company and working hypotheses are labelled as such.",
    assumptions: "Assumptions",
    inputs: {
      monthlyLeads: { label: "Monthly leads", unit: "" },
      dealValue: { label: "Average deal value", unit: "€" },
      qualificationRate: { label: "Qualification rate", unit: "%" },
      closeRate: { label: "Close rate (qualified leads)", unit: "%" },
      historicLeads: { label: "Historic lead database", unit: "" },
      grossMargin: { label: "Gross margin", unit: "%" },
    },
    origin: { provided: "Provided", hypothesis: "Hypothesis", session: "Changed in session" },
    missing: "To be entered",
    levers: "Levers per scenario",
    leverLabels: {
      qualificationLift: "Qualification (+ pts)",
      closeLift: "Close rate (+ pts)",
      reactivationRate: "Database reactivated (%)",
    },
    scenarios: { baseline: "Baseline", conservative: "Conservative", central: "Central", upside: "Upside" },
    customers: "Projects won / year",
    revenue: "Modelled revenue",
    incremental: "Difference vs baseline",
    margin: "Additional gross margin",
    marginMissing: "Margin not provided",
    needInputs: "Enter the missing assumptions to display the model. No value is filled in automatically.",
    reset: "Back to the audit's assumptions",
    formula:
      "Projects won per year = leads × 12 × qualification × close rate; in a scenario, a share of the historic database is reactivated and won at the same rate.",
    disclaimer: "Illustrative scenario, not a forecast or revenue guarantee.",
  },

  architecture: {
    title: [{ text: "The recommended" }, { accent: "Revenue OS." }],
    lead: "Only modules justified by the observations are recommended. The others stay visible, and are marked as such.",
    groups: { capture: "Capture", convert: "Convert", steer: "Steer" },
    notRecommended: "Not recommended at this stage",
    what: "What AMYN would implement",
    why: "Why",
    impact: "Operational impact",
    basis: "Based on",
    recommendationsTitle: "Recommendations, module by module",
  },
  modules: {
    leadCapture: "Lead capture",
    aiReception: "AI reception",
    qualification: "Qualification",
    routing: "Routing",
    crmAutomation: "CRM automation",
    followUp: "Follow-up",
    calendar: "Calendar",
    proposalWorkflow: "Proposal workflow",
    reactivation: "Reactivation",
    salesCopilot: "Sales copilot",
    managementDashboard: "Management dashboard",
  },
  priority: { critical: "Critical", high: "High", medium: "Medium", future: "Future" },

  roadmap: {
    title90: [{ text: "Ninety" }, { accent: "days." }],
    titleWeeks: (w: number) => [{ text: "Roadmap," }, { accent: `${w} weeks.` }],
    lead: "Sized by the recommended scope; refined during the architecture session.",
    weeks: (a: number, b: number) => (a === b ? `Week ${a}` : `Weeks ${a}–${b}`),
    phases: {
      architecture: { name: "Revenue architecture", items: ["Hypotheses validated", "Process mapping", "Data and tooling review", "Target architecture signed off"] },
      implementation: { name: "Implementation", items: [] },
      deployment: { name: "Deployment & QA", items: ["Real-world test scenarios", "Team training", "Progressive go-live"] },
      optimization: { name: "Optimization", items: ["Measurement and adjustments", "Rules and messages refined"] },
    },
    later: "After 90 days",
  },

  investment: {
    title: [{ text: "Investment." }],
    product: "AMYN Revenue OS™",
    kind: "Custom implementation",
    from: "From",
    price: "€25,000",
    tax: "VAT not applicable, article 293 B of the French Tax Code.",
    body:
      "The final investment depends on system complexity, integrations, automation scope, data architecture and implementation requirements. It is set after the architecture session, before any commitment.",
  },

  nextStep: {
    title: [{ text: "Book a Revenue" }, { text: "architecture", accent: "session." }],
    cta: "Book a Revenue Architecture Session",
    duration: "60 minutes with AMYN.",
    items: ["Validate findings", "Map internal processes", "Model economics", "Define implementation", "Determine whether Revenue OS makes commercial sense"],
    promise: "If the economics do not justify the engagement, we'll tell you.",
    emailSubject: (company: string) => `Revenue Architecture Session — ${company}`,
  },

  sourcesSection: {
    title: [{ text: "Sources" }, { text: "&", accent: "method." }],
    method:
      "This audit separates what we observed, what the company told us and what remains to be verified. We accessed no internal system without permission; no figure was estimated on the company's behalf without being labelled as a hypothesis.",
    kinds: {
      website: "Website",
      public_listing: "Public listing",
      call: "Conversation",
      document: "Document",
      questionnaire: "Questionnaire",
      other: "Other",
    },
  },

  footer: (company: string) => `AMYN Revenue Audit™ · ${company} · Private & Confidential`,
  pageOf: "/",
};

const copy: Record<AuditLocale, AuditCopy> = { fr, en };
export const getAuditCopy = (locale: AuditLocale): AuditCopy => copy[locale];

/** Regroupement des modules dans le schéma d'architecture. */
export const MODULE_GROUPS: { id: "capture" | "convert" | "steer"; modules: ModuleKey[] }[] = [
  { id: "capture", modules: ["leadCapture", "aiReception", "qualification", "routing"] },
  { id: "convert", modules: ["crmAutomation", "followUp", "calendar", "proposalWorkflow"] },
  { id: "steer", modules: ["reactivation", "salesCopilot", "managementDashboard"] },
];
