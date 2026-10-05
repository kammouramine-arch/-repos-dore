import type { RevenueAudit } from "../../lib/audit/types.ts";

/**
 * EXEMPLE FICTIF — Élan Habitat n'existe pas.
 *
 * Cet audit sert de démonstration du format. Les sources, observations et
 * chiffres sont inventés (domaine réservé `.example`) et l'audit est marqué
 * `fictional: true` : il est présenté comme tel à l'écran et dans le PDF.
 * Même entreprise que la démonstration interactive (/revenue-os/demo).
 */
export const elanHabitatFr: RevenueAudit = {
  slug: "elan-habitat-exemple",
  locale: "fr",
  status: "ready",
  fictional: true,
  company: {
    name: "Élan Habitat",
    domain: "elan-habitat.example",
    industry: "Rénovation résidentielle haut de gamme",
    country: "France",
  },
  date: "2026-10-05",
  preparedBy: "Amine Kammour — AMYN",
  summary: {
    context:
      "Élan Habitat reçoit un volume de demandes élevé pour une équipe commerciale de quatre personnes. L'enjeu n'est pas d'attirer davantage de demandes, mais de mieux traiter celles qui arrivent déjà.",
    primaryRecommendation:
      "Structurer la réponse et la qualification dès la demande, puis donner à chaque proposition une prochaine action visible.",
  },

  sources: [
    { id: "S1", kind: "website", label: "Page « Demande de devis »", url: "https://elan-habitat.example/devis", date: "2026-09-29" },
    { id: "S2", kind: "website", label: "Page de confirmation après envoi du formulaire", url: "https://elan-habitat.example/devis/merci", date: "2026-09-29" },
    { id: "S3", kind: "public_listing", label: "Fiche d'établissement en ligne", date: "2026-09-29" },
    { id: "S4", kind: "call", label: "Entretien préliminaire avec la direction commerciale", date: "2026-09-30" },
    { id: "S5", kind: "questionnaire", label: "Questionnaire Revenue Audit rempli par l'entreprise", date: "2026-10-01" },
  ],

  providedMetrics: [
    { id: "M1", label: "Demandes entrantes par mois", value: "≈ 225", source: "S5", note: "Estimation de l'entreprise" },
    { id: "M2", label: "Valeur moyenne d'un projet", value: "18 500 €", source: "S5" },
    { id: "M3", label: "Équipe commerciale", value: "4 conseillers", source: "S4" },
    { id: "M4", label: "Demandes historiques", value: "≈ 3 240 depuis 2019", source: "S4" },
    { id: "M5", label: "Origine des demandes", value: "Site 55 % · téléphone 25 % · recommandations et salons 20 %", source: "S5" },
  ],

  scores: [
    { id: "leadCapture", points: 11, basis: ["O6", "O3"], rationale: "Formulaire accessible depuis toutes les pages, fiche d'établissement soignée, plusieurs canaux d'entrée. Les appels entrants ne sont pas enregistrés de façon homogène." },
    { id: "response", points: 7, basis: ["O2"], rationale: "Délai de recontact annoncé de 48 heures ouvrées ; aucun accusé de réception personnalisé, aucune réponse hors horaires." },
    { id: "qualification", points: 6, basis: ["O1", "H1"], rationale: "Le formulaire ne recueille aucune information de qualification ; elle se ferait au premier appel (hypothèse à valider)." },
    { id: "followUp", points: 8, basis: ["O4", "H2"], rationale: "La relance des propositions dépend de chaque conseiller, sans règle ni échéance communes." },
    { id: "crmHandoff", points: null, basis: [], rationale: "Accès au CRM non encore partagé : pas assez d'informations pour noter cette dimension." },
    { id: "reactivation", points: 2, basis: ["O5"], rationale: "Un historique important, jamais exploité de façon structurée." },
    { id: "visibility", points: 4, basis: ["O7"], rationale: "Suivi consolidé à la main, une fois par mois." },
  ],

  journey: [
    { id: "discovery", status: "verified", note: "Site et fiche d'établissement observés." },
    { id: "enquiry", status: "verified", note: "Formulaire de devis observé ; appels non observés." },
    { id: "response", status: "opportunity", note: "Délai annoncé : 48 h ouvrées." },
    { id: "qualification", status: "opportunity", note: "Aucune qualification structurée à la demande." },
    { id: "crm", status: "needs_validation", note: "Accès au CRM à obtenir." },
    { id: "followUp", status: "opportunity", note: "Relances sans règle commune (communiqué)." },
    { id: "meeting", status: "needs_validation", note: "Consultation à domicile (communiqué)." },
    { id: "proposal", status: "needs_validation", note: "Délai et suivi des devis à mesurer." },
    { id: "customer", status: "needs_validation", note: "Passage au chantier hors périmètre observé." },
  ],

  observations: [
    {
      id: "O1",
      title: "Formulaire de demande de devis",
      provenance: "observed",
      category: "qualification",
      stage: "enquiry",
      statement:
        "Le formulaire principal de demande de devis demande le nom, l'e-mail, le téléphone et une description libre du projet. Aucun champ ne précise le type de travaux, le budget, l'échéance ou la nature du bien.",
      sources: ["S1"],
      confidence: "high",
      implication: "L'équipe commerciale doit probablement compléter la qualification manuellement après la demande.",
      recommendation: "Introduire une qualification structurée, tout en gardant une première étape légère pour le visiteur.",
    },
    {
      id: "O2",
      title: "Délai de recontact annoncé",
      provenance: "observed",
      category: "response",
      stage: "response",
      statement: "La page affichée après l'envoi du formulaire indique : « Nous vous recontactons sous 48 heures ouvrées. »",
      sources: ["S2"],
      confidence: "high",
      implication:
        "Une demande envoyée un vendredi soir peut attendre jusqu'au mardi ; dans l'intervalle, le prospect peut solliciter d'autres entreprises.",
      recommendation: "Accuser réception immédiatement et engager la qualification dès la demande, y compris hors horaires.",
    },
    {
      id: "O3",
      title: "Volume et origine des demandes",
      provenance: "provided",
      category: "leadCapture",
      stage: "enquiry",
      statement: "L'entreprise indique recevoir environ 225 demandes par mois : 55 % via le site, 25 % par téléphone, 20 % par recommandations et salons.",
      sources: ["S5"],
      confidence: "medium",
      implication: "Pour quatre conseillers, ce volume représenterait plus de 50 demandes par personne et par mois, avant toute qualification.",
      recommendation: "Trier et prioriser les demandes dès leur arrivée, pour concentrer le temps des conseillers sur les projets à forte intention.",
    },
    {
      id: "O4",
      title: "Relance des propositions",
      provenance: "provided",
      category: "followUp",
      stage: "followUp",
      statement: "La direction commerciale indique que la relance des propositions est laissée à l'appréciation de chaque conseiller, sans règle commune ni échéance partagée.",
      sources: ["S4"],
      confidence: "high",
      implication: "Une proposition peut rester sans prochaine action identifiée, sans que personne ne s'en aperçoive.",
      recommendation: "Définir une séquence de relance commune, avec des rappels et une alerte pour les opportunités à risque.",
    },
    {
      id: "O5",
      title: "Historique des demandes",
      provenance: "provided",
      category: "reactivation",
      statement: "L'entreprise conserve environ 3 240 demandes depuis 2019, réparties entre un tableur et des exports du CRM.",
      sources: ["S4"],
      confidence: "medium",
      implication: "Une partie de ces demandes pourrait concerner des projets reportés, susceptibles de redevenir d'actualité.",
      recommendation: "Segmenter l'historique et préparer des parcours de réactivation approuvés, configurés selon les autorisations applicables à chaque contact.",
    },
    {
      id: "O6",
      title: "Présence en ligne",
      provenance: "observed",
      category: "leadCapture",
      stage: "discovery",
      statement: "La fiche d'établissement est complète (horaires, zone d'intervention, photos de réalisations) et les avis reçoivent des réponses régulières.",
      sources: ["S3"],
      confidence: "high",
      implication: "La découverte de l'entreprise est un point fort : la difficulté se situerait après la demande, pas avant.",
      recommendation: "Conserver cette base ; pas de chantier prioritaire sur l'acquisition.",
    },
    {
      id: "O7",
      title: "Suivi par la direction",
      provenance: "provided",
      category: "visibility",
      statement: "Le suivi commercial est consolidé une fois par mois dans un tableur, à partir des informations transmises par chaque conseiller.",
      sources: ["S4"],
      confidence: "high",
      implication: "La direction verrait les écarts avec jusqu'à un mois de décalage.",
      recommendation: "Un tableau de bord alimenté en continu par le CRM, centré sur les prochaines actions et les opportunités à risque.",
    },
  ],

  hypotheses: [
    {
      id: "H1",
      title: "Qualification au premier appel",
      category: "qualification",
      statement: "La qualification se ferait principalement lors du premier appel, ce qui mobiliserait du temps de conseiller sur des demandes peu avancées.",
      validation: "Revoir avec l'équipe vingt demandes récentes et le temps passé avant le premier rendez-vous.",
    },
    {
      id: "H2",
      title: "Propositions sans prochaine action",
      category: "followUp",
      statement: "Une partie des propositions restées sans réponse après sept jours n'aurait pas de prochaine action planifiée.",
      validation: "Extraire du CRM les propositions des 90 derniers jours et leur dernière activité.",
    },
    {
      id: "H3",
      title: "Informations perdues entre téléphone et CRM",
      category: "crmHandoff",
      statement: "Une partie des informations recueillies au téléphone ne serait pas saisie dans le CRM.",
      validation: "Comparer, avec l'équipe, un échantillon d'appels et les fiches CRM correspondantes.",
    },
  ],

  opportunities: [
    { id: "P1", title: "Qualification structurée dès la demande", summary: "Recueillir type de projet, budget, échéance et bien avant le premier appel.", impact: 3, confidence: 3, complexity: 1, relevance: 3, basis: ["O1", "O3"] },
    { id: "P2", title: "Réponse immédiate, y compris hors horaires", summary: "Un accusé de réception personnalisé et les premières questions en quelques secondes.", impact: 3, confidence: 3, complexity: 1, relevance: 3, basis: ["O2"] },
    { id: "P3", title: "Discipline de relance des propositions", summary: "Une séquence commune, des rappels, une alerte à J+8.", impact: 3, confidence: 2, complexity: 2, relevance: 3, basis: ["O4", "H2"] },
    { id: "P4", title: "Vue direction en continu", summary: "Pipeline, prochaines actions et risques, à jour chaque jour.", impact: 2, confidence: 3, complexity: 2, relevance: 2, basis: ["O7"] },
    { id: "P5", title: "Réactivation de l'historique", summary: "Les projets reportés, recontactés selon un parcours approuvé.", impact: 2, confidence: 2, complexity: 2, relevance: 2, basis: ["O5"] },
    { id: "P6", title: "Traçabilité des appels entrants", summary: "Chaque appel enregistré comme une demande, avec son contexte.", impact: 2, confidence: 1, complexity: 3, relevance: 2, basis: ["O3", "H3"] },
  ],

  recommendations: [
    {
      module: "aiReception",
      priority: "critical",
      what: "Accusé de réception immédiat et premiers échanges au nom d'Élan Habitat, sur le site et par e-mail, selon le ton et les limites définis par l'équipe.",
      why: "Le délai annoncé de 48 heures ouvrées laisse les demandes sans réponse, notamment le week-end.",
      impact: "Chaque demande reçoit une réponse en quelques secondes ; les conseillers reprennent des échanges déjà engagés.",
      basis: ["O2"],
    },
    {
      module: "qualification",
      priority: "critical",
      what: "Questions de qualification conversationnelles et fiche structurée : projet, budget, échéance, bien, disponibilités.",
      why: "Le formulaire ne recueille aucune information de qualification.",
      impact: "Les conseillers savent, avant d'appeler, quelles demandes traiter en premier.",
      basis: ["O1", "O3", "H1"],
    },
    {
      module: "followUp",
      priority: "critical",
      what: "Séquence de relance commune, messages approuvés, rappels aux conseillers et alerte à J+8.",
      why: "La relance des propositions dépend aujourd'hui de chaque conseiller.",
      impact: "Plus aucune proposition sans prochaine action visible.",
      basis: ["O4", "H2"],
    },
    {
      module: "crmAutomation",
      priority: "high",
      what: "Création et mise à jour automatiques des fiches à partir des échanges, avec la source de chaque information.",
      why: "Des informations recueillies au téléphone pourraient ne pas être saisies (à valider).",
      impact: "Une fiche complète sans ressaisie ; un historique fiable pour la relance et la réactivation.",
      basis: ["H3", "O1"],
    },
    {
      module: "calendar",
      priority: "high",
      what: "Proposition des créneaux réels des conseillers dans l'échange, confirmation et rappel automatiques.",
      why: "Avec plus de 50 demandes par conseiller et par mois, fixer les rendez-vous mobilise du temps.",
      impact: "Moins d'allers-retours entre la demande et la consultation.",
      basis: ["O3"],
    },
    {
      module: "proposalWorkflow",
      priority: "high",
      what: "Suivi de chaque proposition : envoi, ouverture, relances, statut, opportunités à risque.",
      why: "Le devis est le moment où l'opportunité se perd le plus silencieusement.",
      impact: "Une vision claire des propositions en cours, par conseiller.",
      basis: ["O4"],
    },
    {
      module: "routing",
      priority: "medium",
      what: "Attribution selon le secteur, la spécialité et la charge de chaque conseiller.",
      why: "Volume élevé pour une équipe de quatre personnes.",
      impact: "Une répartition plus équilibrée et plus rapide.",
      basis: ["O3"],
    },
    {
      module: "managementDashboard",
      priority: "medium",
      what: "Tableau de bord direction : demandes, qualification, rendez-vous, pipeline, prochaines actions, risques.",
      why: "Le suivi est aujourd'hui consolidé à la main, une fois par mois.",
      impact: "La direction voit les écarts au jour le jour.",
      basis: ["O7"],
    },
    {
      module: "reactivation",
      priority: "medium",
      what: "Segmentation de l'historique et parcours de réactivation approuvés, configurés selon les autorisations applicables.",
      why: "Environ 3 240 demandes conservées, jamais exploitées de façon structurée.",
      impact: "Des projets reportés identifiés et recontactés au bon moment.",
      basis: ["O5"],
    },
    {
      module: "salesCopilot",
      priority: "future",
      what: "Briefs avant rendez-vous et comptes rendus après consultation.",
      why: "Utile une fois la qualification et le CRM fiabilisés.",
      impact: "Des consultations mieux préparées.",
      basis: ["O3"],
    },
  ],

  roi: {
    assumptions: [
      { key: "monthlyLeads", value: 225, origin: "provided", note: "Questionnaire (S5)" },
      { key: "dealValue", value: 18500, origin: "provided", note: "Questionnaire (S5)" },
      { key: "qualificationRate", value: 41, origin: "hypothesis", note: "Hypothèse AMYN à valider à partir du CRM" },
      { key: "closeRate", value: 22, origin: "hypothesis", note: "Hypothèse AMYN à valider à partir du CRM" },
      { key: "historicLeads", value: 3240, origin: "provided", note: "Entretien (S4)" },
      { key: "grossMargin", value: null, origin: "provided", note: "Non communiquée" },
    ],
    scenarios: {
      conservative: { qualificationLift: 1, closeLift: 0.5, reactivationRate: 0.5 },
      central: { qualificationLift: 2, closeLift: 1, reactivationRate: 1 },
      upside: { qualificationLift: 4, closeLift: 2, reactivationRate: 2 },
    },
  },
};
