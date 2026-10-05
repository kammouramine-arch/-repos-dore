import type { HeadingLine } from "@/components/ui/Layout";
import type { Locale } from "./i18n/config.ts";

/**
 * AMYN Revenue OS™ — l'offre phare. Textes de l'accueil, de /revenue-os et
 * de /revenue-audit, dans les deux langues (le français fait référence).
 *
 * Règles de rédaction (à respecter pour toute modification) :
 * - l'entreprise est le héros, pas l'IA : on vend un résultat d'exploitation
 *   (aucune demande sans suite), la technologie vient ensuite ;
 * - AUCUN chiffre sur AMYN ou ses clients : pas de client, de logo, de
 *   témoignage, de résultat ni de statistique inventés. Les chiffres des
 *   démonstrations (tableau de bord, scénario, flux) sont fictifs et
 *   étiquetés comme tels à l'écran ;
 * - aucune garantie de chiffre d'affaires, de conversion ou de délai ;
 * - aucune intégration présentée comme déjà réalisée : les outils cités le
 *   sont comme exemples de ce qui peut être connecté quand c'est possible ;
 * - pas de jargon (« révolutionner », « libérer la puissance de l'IA »…).
 */

export type ModuleId =
  | "reception"
  | "instant"
  | "qualification"
  | "followup"
  | "proposal"
  | "copilot"
  | "reactivation"
  | "crm"
  | "intelligence";

export type CapabilityKey = "websites" | "webapps" | "mobile" | "ai" | "products" | "growth";

type Item = { title: string; body: string };

const fr = {
  meta: {
    homeTitle: "AMYN — Revenue OS : automatisation commerciale et systèmes IA pour entreprises",
    homeDescription:
      "AMYN conçoit et installe Revenue OS, l'infrastructure qui capte vos demandes, les qualifie, automatise les relances et aide votre équipe à conclure. Sites, applications et automatisation sur mesure.",
    pageTitle: "Revenue OS — automatisation commerciale, CRM et IA sur mesure",
    pageDescription:
      "Revenue OS relie vos sources de demandes, votre CRM, vos échanges et votre processus commercial en un seul système : réponse immédiate, qualification, relances, réactivation et pilotage. Mise en place sur mesure à partir de 25 000 €.",
    auditTitle: "Revenue Audit — trouvez où vos revenus s'échappent",
    auditDescription:
      "Le Revenue Audit d'AMYN analyse le parcours entre la demande et le client : réponse, qualification, relance, rendez-vous, proposition. Demandez votre audit en quelques minutes.",
  },

  /* --- Accueil : hero ---------------------------------------------------- */
  hero: {
    badge: "AMYN Revenue OS™",
    badgeNote: "Votre infrastructure commerciale, reconstruite autour de l'automatisation et de l'IA.",
    title: [{ text: "Faites de votre entreprise" }, { text: "un", accent: "moteur de revenus." }] as HeadingLine[],
    lead: "AMYN conçoit et installe les systèmes qui captent vos demandes, qualifient les opportunités, automatisent les relances et aident votre équipe à conclure davantage — 24 h/24.",
    checks: ["Construit autour de votre façon de vendre", "Mis en place de bout en bout par AMYN"],
  },

  /* Visuel du hero : le parcours d'une demande. Données fictives. */
  flow: {
    aria:
      "Animation illustrative : une nouvelle demande arrive, Revenue OS la qualifie, met à jour le CRM, programme la relance, réserve un rendez-vous et crée une opportunité.",
    label: "Exemple illustratif",
    leadSource: "Nouvelle demande · site web",
    leadText: "« Bonjour, pouvez-vous me faire un devis pour… »",
    leadTime: "21:14",
    core: "Revenue OS",
    statuses: ["Nouvelle demande", "Qualifiée", "Forte intention"],
    actions: ["CRM mis à jour", "Relance programmée", "Rendez-vous réservé"],
    result: "Opportunité créée",
    resultValue: "18\u202f500\u00a0€",
    stages: ["Qualification", "CRM", "Relance", "Rendez-vous", "Devis", "Client", "Revenu"],
  },

  /* --- Transition -------------------------------------------------------- */
  statement: {
    a: "Vous n'avez pas besoin de plus de logiciels.",
    b: "Vous avez besoin que votre entreprise fonctionne comme un seul système.",
    body: "Votre site, votre boîte mail, votre CRM, votre téléphone, votre agenda et votre processus commercial ne devraient pas fonctionner chacun de leur côté. AMYN les relie en une seule infrastructure de revenus.",
    sources: ["Site web", "Boîte mail", "CRM", "Téléphone", "Agenda", "Processus commercial"],
  },

  /* --- L'offre phare ----------------------------------------------------- */
  intro: {
    eyebrow: "Le système phare",
    title: "AMYN Revenue OS™",
    lead: "Une infrastructure commerciale sur mesure, conçue autour de la façon dont votre entreprise vend réellement.",
    body: "Nous relions vos sources de demandes, vos données clients, vos échanges, votre processus commercial et l'automatisation en un seul système d'exploitation intelligent.",
    principles: [
      "Chaque demande a une prochaine action.",
      "Chaque prospect qualifié est relancé.",
      "Chaque commercial sait ce qui demande son attention.",
      "Chaque dirigeant sait où les opportunités se perdent.",
    ],
    principlesClose: "C'est exactement ce que Revenue OS est conçu pour faire.",
    cta: "Comprendre le système",
  },

  /* --- Modules ----------------------------------------------------------- */
  modules: {
    label: "Les modules",
    title: [{ text: "Neuf modules," }, { text: "un seul", accent: "système." }] as HeadingLine[],
    intro: "Chaque Revenue OS assemble les modules dont votre activité a besoin. Choisissez un module pour voir son rôle et ce qu'il relie.",
    core: "Revenue OS",
    connectsTo: "Relie",
    groups: [
      { id: "capture", name: "Capter", note: "Aucune demande ne se perd." },
      { id: "convert", name: "Convertir", note: "Chaque opportunité avance." },
      { id: "steer", name: "Piloter", note: "Rien n'échappe à la direction." },
    ],
    items: {
      reception: {
        name: "Réception IA",
        body: "Répond aux demandes, traite les questions courantes, recueille les informations utiles et oriente chaque opportunité — à toute heure.",
        links: ["Site web", "Téléphone", "Messagerie", "E-mail"],
      },
      instant: {
        name: "Réponse immédiate",
        body: "Répond à chaque nouvelle demande pendant que l'intérêt est encore fort, au lieu de laisser le prospect attendre.",
        links: ["Formulaires", "E-mail", "SMS"],
      },
      qualification: {
        name: "Qualification des demandes",
        body: "Identifie automatiquement l'intention, le besoin, l'urgence, le budget et le potentiel commercial de chaque demande.",
        links: ["Formulaires", "CRM", "Règles métier"],
      },
      followup: {
        name: "Relances intelligentes",
        body: "Construit des séquences de relance structurées autour de votre processus commercial réel.",
        links: ["E-mail", "SMS", "CRM", "Agenda"],
      },
      proposal: {
        name: "Devis et propositions",
        body: "Fait avancer les opportunités qualifiées vers le rendez-vous, le devis et la proposition, plus vite.",
        links: ["Agenda", "Outil de devis", "CRM"],
      },
      copilot: {
        name: "Copilote commercial",
        body: "Résume les échanges, prépare les relances, fait ressortir les opportunités et recommande la prochaine action.",
        links: ["E-mail", "CRM", "Notes d'appel"],
      },
      reactivation: {
        name: "Réactivation des prospects",
        body: "Reprend contact avec les opportunités qualifiées qui dorment déjà dans votre base de données.",
        links: ["CRM", "Historique des devis", "E-mail"],
      },
      crm: {
        name: "Automatisation du CRM",
        body: "Maintient vos données clients et opportunités à jour, sans saisie répétitive.",
        links: ["CRM", "Formulaires", "Agenda", "Outils internes"],
      },
      intelligence: {
        name: "Pilotage des revenus",
        body: "Donne à la direction une vue claire du pipeline, des relances, des opportunités et de la performance.",
        links: ["CRM", "Analytics", "Tableau de bord"],
      },
    } as Record<ModuleId, { name: string; body: string; links: string[] }>,
    byGroup: {
      capture: ["reception", "instant", "qualification"],
      convert: ["followup", "proposal", "copilot"],
      steer: ["reactivation", "crm", "intelligence"],
    } as Record<string, ModuleId[]>,
  },

  /* --- Scénario ---------------------------------------------------------- */
  story: {
    label: "Le système en action",
    title: [{ text: "Une demande. Un système." }, { accent: "Zéro chaos." }] as HeadingLine[],
    note: "Scénario illustratif — données fictives.",
    record: "Fiche opportunité",
    steps: [
      { time: "09:42", title: "Nouvelle demande", quote: "« Bonjour, je souhaiterais un devis pour la rénovation complète de ma cuisine. »" },
      { time: "09:42:03", title: "Réponse envoyée", detail: "Accusé de réception personnalisé et premières questions." },
      {
        time: "09:43",
        title: "Besoin recueilli",
        fields: [
          ["Projet", "Rénovation de cuisine"],
          ["Lieu", "Lille"],
          ["Budget estimé", "15 – 25 k€"],
          ["Délai", "< 60 jours"],
        ],
      },
      { time: "09:44", title: "Demande qualifiée", status: "Forte intention" },
      { time: "09:44", title: "CRM mis à jour", detail: "Contact, projet et historique enregistrés." },
      { time: "09:45", title: "Consultation proposée", detail: "Trois créneaux envoyés." },
      { time: "09:47", title: "Rendez-vous réservé", detail: "Jeudi, 10:30 — dans l'agenda de l'équipe." },
    ] as { time: string; title: string; quote?: string; detail?: string; status?: string; fields?: [string, string][] }[],
    result: { title: "Opportunité créée", label: "Valeur potentielle", value: "21\u202f000\u00a0€" },
    colon: "\u00a0:",
    close: "Pendant que votre équipe travaillait sur autre chose.",
  },

  /* --- Le problème ------------------------------------------------------- */
  problem: {
    label: "Le vrai problème",
    title: [
      { text: "Le chiffre d'affaires ne disparaît pas toujours" },
      { text: "faute de", accent: "nouvelles demandes." },
    ] as HeadingLine[],
    lead: "Parfois, il est déjà dans votre entreprise.",
    chain: [
      { title: "Demande manquée", body: "Un appel pendant un chantier, un message un dimanche." },
      { title: "Réponse tardive", body: "Le prospect a déjà contacté quelqu'un d'autre." },
      { title: "Devis oublié", body: "Envoyé, jamais suivi." },
      { title: "Pas de relance", body: "Personne ne sait à qui c'est le tour." },
      { title: "Prospect dormant", body: "Le projet existe toujours, le contact s'est éteint." },
      { title: "Opportunité perdue", body: "Sans que personne ne l'ait décidé." },
    ] as Item[],
    close: "AMYN construit le système entre l'intérêt et le chiffre d'affaires.",
  },

  /* --- Réactivation ------------------------------------------------------ */
  reactivation: {
    label: "Réactivation",
    title: [{ text: "Votre prochain client est peut-être" }, { text: "déjà dans votre", accent: "base de données." }] as HeadingLine[],
    lead: "Au fil des années, une entreprise accumule :",
    items: ["des demandes passées", "des devis non signés", "des opportunités en sommeil", "d'anciens prospects", "des projets reportés"],
    body: "Revenue OS peut mettre en place des parcours de réactivation structurés à partir de vos données existantes, quand c'est pertinent : segmentation, message adapté au contexte de chaque contact, suivi des réponses dans le CRM.",
    compliance:
      "Chaque parcours respecte le RGPD et les règles de prospection : base légale vérifiée (consentement ou intérêt légitime selon les cas), information des personnes et droit d'opposition à chaque message. Aucun résultat n'est garanti : nous estimons le potentiel avec vous, à partir de vos propres données.",
  },

  /* --- Tableau de bord --------------------------------------------------- */
  dashboard: {
    label: "La vue direction",
    title: [{ text: "Tout ce qui demande votre attention," }, { accent: "sur un seul écran." }] as HeadingLine[],
    lead: "Revenue OS donne à la direction une lecture simple de l'activité commerciale : ce qui entre, ce qui avance, ce qui risque de se perdre.",
    tag: "Espace Revenue OS illustratif · données fictives",
    period: "30 derniers jours",
    metrics: [
      { label: "Nouvelles demandes", value: 127 },
      { label: "Qualifiées", value: 48 },
      { label: "Rendez-vous", value: 21 },
      { label: "Pipeline ouvert", value: 183500, currency: true },
      { label: "Relances du jour", value: 14 },
      { label: "Opportunités à risque", value: 6, alert: true },
    ] as { label: string; value: number; currency?: boolean; alert?: boolean }[],
    pipelineTitle: "Pipeline",
    pipeline: [
      ["Nouvelles", 38],
      ["Qualifiées", 26],
      ["Rendez-vous", 18],
      ["Devis envoyés", 12],
      ["Gagnées", 6],
    ] as [string, number][],
    riskTitle: "À traiter aujourd'hui",
    risks: [
      ["Devis cuisine · Lille", "Sans réponse depuis 6 jours"],
      ["Extension maison · Roubaix", "Relance prévue non envoyée"],
      ["Toiture · Lens", "Rendez-vous à confirmer"],
    ] as [string, string][],
  },

  /* --- Calculateur ------------------------------------------------------- */
  calculator: {
    label: "Calculateur d'opportunité",
    title: [{ text: "Combien vos demandes sans suite" }, { accent: "représentent-elles ?" }] as HeadingLine[],
    lead: "Un ordre de grandeur, à partir de vos propres hypothèses. Il ne prédit rien : il aide à décider s'il vaut la peine de regarder de plus près.",
    tag: "Scénario illustratif",
    inputs: "Vos hypothèses",
    enquiries: "Demandes par mois",
    value: "Valeur moyenne d'un client (€)",
    conversion: "Taux de conversion actuel (%)",
    lost: "Part des demandes perdues faute de réponse ou de relance (%)",
    lostHint: "Votre estimation : demandes restées sans réponse, sans relance ou traitées trop tard.",
    formula:
      "Opportunité annuelle = demandes par mois × part perdue × taux de conversion actuel × valeur client × 12.",
    monthlyLost: "Demandes concernées par mois",
    customers: "Clients potentiels par an",
    result: "Opportunité potentielle par an",
    disclaimer:
      "Scénario illustratif, pas une garantie de chiffre d'affaires. Le calcul suppose que ces demandes, mieux traitées, se convertiraient à votre taux actuel ; la réalité dépend de votre marché, de votre offre et de votre équipe.",
    cta: "Vérifier avec un Revenue Audit",
  },

  /* --- Pour qui ---------------------------------------------------------- */
  audience: {
    label: "Pour qui",
    title: [{ text: "Pour les entreprises où une seule" }, { accent: "opportunité compte." }] as HeadingLine[],
    sectors: [
      "Construction et rénovation",
      "Amélioration de l'habitat",
      "Énergie et solaire",
      "Services professionnels",
      "Services B2B",
      "Recrutement",
      "Technologie",
      "Immobilier",
      "Services à forte valeur",
    ],
    close: "Si un nouveau client peut valoir des milliers — ou des dizaines de milliers — d'euros, votre infrastructure commerciale compte.",
  },

  /* --- Méthode ----------------------------------------------------------- */
  process: {
    label: "Comment ça marche",
    title: [{ text: "Quatre étapes," }, { text: "de l'audit à", accent: "l'exploitation." }] as HeadingLine[],
    steps: [
      {
        title: "Revenue Audit",
        body: "Nous cartographions votre parcours commercial réel :",
        list: ["sources de demandes", "délais et modes de réponse", "CRM et outils", "parcours client", "relances", "points de blocage", "opportunités perdues"],
      },
      { title: "Architecture", body: "AMYN conçoit le Revenue OS autour de votre fonctionnement : modules, règles, intégrations, rôles de chacun. Vous validez avant toute construction." },
      { title: "Construction et intégration", body: "Nous construisons les automatisations, les intégrations, les interfaces et les parcours, puis nous les testons sur vos cas réels." },
      { title: "Lancement et amélioration", body: "Mise en service, suivi, formation de l'équipe, puis amélioration du système à partir de vos données d'exploitation." },
    ] as { title: string; body: string; list?: string[] }[],
  },

  /* --- L'offre ----------------------------------------------------------- */
  offer: {
    label: "L'engagement",
    title: "AMYN Revenue OS™",
    subtitle: "Mise en place sur mesure",
    priceLead: "À partir de",
    price: "25 000 €",
    tax: "TVA non applicable, article 293 B du CGI.",
    intro: "Un projet de transformation de votre infrastructure commerciale, mené de l'audit à l'exploitation. Le périmètre dépend de votre activité, de vos outils et de vos objectifs.",
    includesTitle: "Le périmètre peut comprendre",
    includes: [
      "Audit des revenus et de l'automatisation",
      "Architecture du système sur mesure",
      "Infrastructure de captation des demandes",
      "Réception IA, quand elle est pertinente",
      "Qualification des demandes",
      "Intégration au CRM",
      "Automatisation des relances",
      "Parcours de réactivation",
      "Automatisation commerciale",
      "Tableau de bord des revenus",
      "Infrastructure de conversion",
      "Mise en place avec l'équipe",
      "Documentation",
      "Formation",
      "Période d'optimisation initiale",
    ],
    cta: "Demander un Revenue Audit",
    micro: "Chaque engagement Revenue OS est cadré individuellement selon la complexité de l'activité, les intégrations nécessaires et vos objectifs.",
  },

  management: {
    label: "Après la mise en place",
    title: "AMYN OS Management",
    body: "Un système commercial vit avec l'entreprise. Après la mise en place, AMYN peut continuer à en prendre soin :",
    items: ["surveillance", "maintenance", "améliorations", "nouvelles fonctions", "tests", "nouvelles intégrations", "optimisation"],
    note: "Accompagnement disponible après la mise en place. Les conditions sont définies lors du cadrage.",
  },

  /* --- Au-delà de Revenue OS -------------------------------------------- */
  capabilities: {
    label: "Au-delà de Revenue OS",
    title: [{ text: "Certaines entreprises ont besoin d'un système." }, { text: "D'autres, du", accent: "produit lui-même." }] as HeadingLine[],
    lead: "AMYN construit les deux. Tout ce qu'il faut pour que le système fonctionne — et ce qu'il faut au-delà.",
    items: {
      websites: { title: "Sites web", body: "Des sites premium pensés pour la marque, l'expérience et la conversion." },
      webapps: { title: "Applications web", body: "Plateformes, portails, tableaux de bord et outils internes sur mesure." },
      mobile: { title: "Applications mobiles", body: "Des produits iOS et multiplateformes de qualité." },
      ai: { title: "IA et automatisation", body: "Intégrations IA, agents, flux de travail et automatisation sur mesure." },
      products: { title: "Produits numériques", body: "Du concept et de l'UX jusqu'au développement et au lancement." },
      growth: { title: "Infrastructure de croissance", body: "Analytics, conversion, CRM, captation des demandes et parcours client." },
    } as Record<CapabilityKey, Item>,
    more: "Voir toutes les capacités",
  },

  /* --- /revenue-os : sections propres ------------------------------------ */
  page: {
    label: "AMYN Revenue OS™ · Offre phare",
    title: [{ text: "L'infrastructure commerciale" }, { text: "de votre", accent: "entreprise." }] as HeadingLine[],
    lead: "Revenue OS capte chaque demande, la qualifie, déclenche la bonne relance et donne à votre équipe — et à la direction — une vue claire de ce qui doit se passer ensuite. Conçu et installé par AMYN, autour de votre façon de vendre.",
    facts: ["Sur mesure", "Relié à vos outils", "Mise en place à partir de 25 000 €"],
    architecture: {
      label: "Architecture",
      title: [{ text: "Vos outils restent." }, { accent: "Ils travaillent enfin ensemble." }] as HeadingLine[],
      layers: [
        { name: "Sources", items: ["Site web", "Téléphone", "E-mail", "Messagerie", "Publicité", "Recommandations"] },
        { name: "Revenue OS", items: ["Réception", "Qualification", "Règles et routage", "Relances", "Copilote", "Pilotage"] },
        { name: "Vos systèmes", items: ["CRM", "Agenda", "Outil de devis", "Facturation", "Outils internes"] },
        { name: "Résultats", items: ["Rendez-vous", "Propositions", "Clients", "Visibilité direction"] },
      ],
    },
    detailLabel: "Les modules en détail",
  },

  integrations: {
    label: "Intégrations",
    title: [{ text: "Construit sur votre stack," }, { accent: "pas à sa place." }] as HeadingLine[],
    lead: "Revenue OS se connecte aux outils que votre équipe utilise déjà, lorsque leurs interfaces le permettent. Les noms ci-dessous sont des exemples de systèmes connectables, pas des intégrations déjà réalisées : chaque connexion est vérifiée pendant l'audit.",
    categories: [
      ["CRM", "HubSpot, Pipedrive, Salesforce, Axonaut…"],
      ["E-mail", "Gmail, Outlook, boîtes professionnelles"],
      ["Agenda", "Google Agenda, Outlook, Calendly"],
      ["Formulaires et site", "Votre site actuel, formulaires, pages d'atterrissage"],
      ["Téléphone", "Standard, messagerie vocale, rappels"],
      ["Messagerie", "SMS, WhatsApp Business"],
      ["Analytics", "Mesure d'audience, sources de demandes"],
      ["Paiement", "Stripe, liens de paiement"],
      ["Systèmes internes", "ERP, outils de devis, tableurs, bases de données"],
    ] as [string, string][],
  },

  security: {
    label: "Données et sécurité",
    title: [{ text: "Un système commercial manipule" }, { accent: "des données sensibles." }] as HeadingLine[],
    items: [
      { title: "RGPD dès la conception", body: "Données minimales, finalités définies, durées de conservation fixées, information des personnes et droit d'opposition intégrés aux parcours." },
      { title: "Prestataires documentés", body: "Hébergement, modèles d'IA et services tiers sont choisis avec vous et documentés, avec un accord de sous-traitance (art. 28 du RGPD) quand il s'applique." },
      { title: "Accès maîtrisés", body: "Comptes nominatifs, droits par rôle, secrets stockés côté serveur — jamais dans le navigateur." },
      { title: "Contrôle humain", body: "Vous décidez de ce que le système fait seul et de ce qui demande une validation : devis, engagements, cas sensibles." },
      { title: "Traçabilité", body: "Les actions automatiques sont journalisées : on sait ce qui a été envoyé, quand, et pourquoi." },
    ] as Item[],
  },

  faq: {
    label: "Questions fréquentes",
    title: [{ text: "Vos questions" }, { text: "sur", accent: "Revenue OS." }] as HeadingLine[],
    items: [
      { q: "Faut-il changer de CRM ?", a: "Pas forcément. Revenue OS se branche d'abord sur vos outils actuels quand c'est techniquement possible. Si votre outil limite le système, nous vous le disons pendant l'audit, avec les options." },
      { q: "Est-ce un chatbot ?", a: "Non. La réception IA peut en être une partie, mais Revenue OS est l'ensemble du parcours : réponse, qualification, CRM, relances, rendez-vous, devis et pilotage." },
      { q: "L'IA parle-t-elle à nos clients sans contrôle ?", a: "Non. Vous définissez les règles, le ton et les limites. Ce qui engage l'entreprise (prix, délais, engagements) peut toujours passer par une validation humaine." },
      { q: "Combien de temps prend la mise en place ?", a: "Cela dépend du périmètre et des intégrations. Le calendrier est fixé à l'issue de l'audit, avant tout engagement." },
      { q: "Pouvez-vous garantir une hausse du chiffre d'affaires ?", a: "Non. Revenue OS supprime des pertes d'exploitation — demandes sans réponse, relances oubliées, opportunités dormantes. L'impact dépend de votre marché, de votre offre et de votre équipe ; nous l'estimons avec vous, sans promesse." },
      { q: "À qui appartient le système ?", a: "Les droits sur ce qui est développé pour vous et le choix des comptes (CRM, hébergement, outils) sont précisés dans la proposition. Le principe : vos données et vos outils restent les vôtres." },
      { q: "Et après le lancement ?", a: "AMYN OS Management permet de faire surveiller, maintenir et améliorer le système dans la durée. C'est facultatif et défini lors du cadrage." },
      { q: "Pourquoi « à partir de 25 000 € » ?", a: "Parce qu'un Revenue OS est une transformation sur mesure : audit, architecture, construction, intégrations, formation et optimisation. Le prix final dépend de la complexité ; il est fixé après l'audit." },
    ],
  },

  finale: {
    label: "Prochaine étape",
    title: [{ text: "Savez-vous ce que vous perdez" }, { accent: "aujourd'hui ?" }] as HeadingLine[],
    lead: "Le Revenue Audit commence par là : le parcours réel entre une demande et un client, et les endroits où il fuit.",
  },

  /* --- /revenue-audit ---------------------------------------------------- */
  audit: {
    label: "Revenue Audit",
    title: [{ text: "Trouvez où vos revenus" }, { text: "s'échappent de votre", accent: "processus commercial." }] as HeadingLine[],
    lead: "AMYN analyse le parcours entre une demande et un client — et vous montre précisément où des opportunités se perdent.",
    start: "Demander votre Revenue Audit",
    journeyLabel: "Ce que nous analysons",
    journeyTitle: [{ text: "Sept étapes entre une demande" }, { text: "et un", accent: "client." }] as HeadingLine[],
    journey: [
      ["Demande", "D'où viennent les demandes, et combien n'aboutissent jamais à une réponse ?"],
      ["Réponse", "En combien de temps, par qui, avec quelle qualité ?"],
      ["Qualification", "Savez-vous distinguer vite une demande sérieuse d'une simple curiosité ?"],
      ["Relance", "Qui relance, quand, et qu'arrive-t-il quand personne ne le fait ?"],
      ["Rendez-vous", "Combien d'étapes entre l'intérêt et un créneau réservé ?"],
      ["Proposition", "Combien de devis partent sans suivi structuré ?"],
      ["Client", "Que devient l'historique : est-il réutilisé, ou oublié ?"],
    ] as [string, string][],
    outcomesLabel: "À l'issue de l'audit",
    outcomes: [
      { title: "Une carte de votre parcours réel", body: "De la première demande à la signature, avec vos outils et vos délais." },
      { title: "Les points de fuite", body: "Où des opportunités se perdent, et pourquoi." },
      { title: "Des priorités", body: "Ce qu'il faut corriger d'abord, et ce qui peut attendre." },
      { title: "Une architecture recommandée", body: "Si Revenue OS est pertinent pour vous : les modules, les intégrations et le périmètre." },
    ] as Item[],
    formLabel: "Votre demande",
    formTitle: [{ text: "Cinq questions," }, { accent: "quelques minutes." }] as HeadingLine[],
    formLead: "Plus votre réponse est précise, plus le premier échange sera utile. Aucun document à joindre à ce stade.",
    faqTitle: [{ text: "Questions sur" }, { text: "le", accent: "Revenue Audit." }] as HeadingLine[],
    faq: [
      { q: "Que se passe-t-il après ma demande ?", a: "Nous étudions vos réponses, puis nous revenons vers vous pour un premier échange. Les modalités de l'audit (périmètre, durée, conditions) sont précisées avant tout engagement." },
      { q: "Suis-je engagé en envoyant ce formulaire ?", a: "Non. La demande n'engage à rien." },
      { q: "Dois-je préparer des documents ?", a: "Pas à ce stade. Si l'audit a lieu, nous convenons ensemble des informations utiles et de la manière de les partager." },
    ],
  },
};

export type RevenueCopy = typeof fr;

const en: RevenueCopy = {
  meta: {
    homeTitle: "AMYN — Revenue OS: sales automation and AI business systems",
    homeDescription:
      "AMYN designs and installs Revenue OS, the infrastructure that captures enquiries, qualifies them, automates follow-up and helps your team close. Plus bespoke websites, apps and automation.",
    pageTitle: "Revenue OS — custom sales automation, CRM and AI systems",
    pageDescription:
      "Revenue OS connects your lead sources, CRM, communication and sales process into one system: instant response, qualification, follow-up, reactivation and management visibility. Custom implementation from €25,000.",
    auditTitle: "Revenue Audit — find where revenue is leaking",
    auditDescription:
      "AMYN's Revenue Audit analyses the journey from enquiry to customer: response, qualification, follow-up, appointment, proposal. Request your audit in a few minutes.",
  },
  hero: {
    badge: "AMYN Revenue OS™",
    badgeNote: "Your sales infrastructure, rebuilt around automation and AI.",
    title: [{ text: "Turn your business" }, { text: "into a", accent: "revenue engine." }],
    lead: "AMYN designs and installs the systems that capture leads, qualify opportunities, automate follow-up and help your team convert more business — 24/7.",
    checks: ["Built around the way you sell", "Implemented end to end by AMYN"],
  },
  flow: {
    aria: "Illustrative animation: a new enquiry arrives, Revenue OS qualifies it, updates the CRM, schedules follow-up, books an appointment and creates an opportunity.",
    label: "Illustrative example",
    leadSource: "New enquiry · website",
    leadText: "“Hello, could you quote me for…”",
    leadTime: "21:14",
    core: "Revenue OS",
    statuses: ["New lead", "Qualified", "High intent"],
    actions: ["CRM updated", "Follow-up scheduled", "Appointment booked"],
    result: "Opportunity created",
    resultValue: "€18,500",
    stages: ["Qualification", "CRM", "Follow-up", "Appointment", "Proposal", "Customer", "Revenue"],
  },
  statement: {
    a: "You don't need more software.",
    b: "You need your business to work as one system.",
    body: "Your website, inbox, CRM, phone, calendar and sales process shouldn't operate independently. AMYN connects them into one revenue infrastructure.",
    sources: ["Website", "Inbox", "CRM", "Phone", "Calendar", "Sales process"],
  },
  intro: {
    eyebrow: "The flagship system",
    title: "AMYN Revenue OS™",
    lead: "A custom revenue infrastructure designed around the way your company actually sells.",
    body: "We connect your lead sources, customer data, communication, sales workflow and automation into one intelligent operating system.",
    principles: [
      "Every enquiry has a next action.",
      "Every qualified lead is followed up.",
      "Every salesperson knows what needs attention.",
      "Every owner knows where opportunities are being lost.",
    ],
    principlesClose: "That's what Revenue OS is built to do.",
    cta: "Understand the system",
  },
  modules: {
    label: "Modules",
    title: [{ text: "Nine modules," }, { text: "one", accent: "system." }],
    intro: "Each Revenue OS combines the modules your business needs. Select a module to see what it does and what it connects.",
    core: "Revenue OS",
    connectsTo: "Connects",
    groups: [
      { id: "capture", name: "Capture", note: "No enquiry slips through." },
      { id: "convert", name: "Convert", note: "Every opportunity moves forward." },
      { id: "steer", name: "Steer", note: "Nothing escapes management." },
    ],
    items: {
      reception: { name: "AI reception", body: "Responds to enquiries, answers common questions, captures information and routes opportunities 24/7.", links: ["Website", "Phone", "Messaging", "Email"] },
      instant: { name: "Instant response", body: "Responds to new enquiries while intent is still high, instead of leaving prospects waiting.", links: ["Forms", "Email", "SMS"] },
      qualification: { name: "Lead qualification", body: "Automatically identifies intent, project requirements, urgency, budget and commercial potential.", links: ["Forms", "CRM", "Business rules"] },
      followup: { name: "Intelligent follow-up", body: "Creates structured follow-up sequences around your actual sales process.", links: ["Email", "SMS", "CRM", "Calendar"] },
      proposal: { name: "Proposal workflow", body: "Moves qualified opportunities toward appointments, quotes and proposals faster.", links: ["Calendar", "Quoting tool", "CRM"] },
      copilot: { name: "Sales copilot", body: "Summarises conversations, prepares follow-ups, surfaces opportunities and recommends next actions.", links: ["Email", "CRM", "Call notes"] },
      reactivation: { name: "Lead reactivation", body: "Reconnects with qualified opportunities already sitting in your database.", links: ["CRM", "Quote history", "Email"] },
      crm: { name: "CRM automation", body: "Keeps customer and opportunity data synchronised without repetitive manual work.", links: ["CRM", "Forms", "Calendar", "Internal tools"] },
      intelligence: { name: "Revenue intelligence", body: "Gives management visibility over pipeline, follow-up, opportunities and performance.", links: ["CRM", "Analytics", "Dashboard"] },
    },
    byGroup: {
      capture: ["reception", "instant", "qualification"],
      convert: ["followup", "proposal", "copilot"],
      steer: ["reactivation", "crm", "intelligence"],
    },
  },
  story: {
    label: "The system at work",
    title: [{ text: "One lead. One system." }, { accent: "Zero chaos." }],
    note: "Illustrative scenario — fictional data.",
    record: "Opportunity record",
    steps: [
      { time: "09:42", title: "New enquiry", quote: "“Hello, I'd like a quote for a complete renovation of my kitchen.”" },
      { time: "09:42:03", title: "Response sent", detail: "Personalised acknowledgement and first questions." },
      {
        time: "09:43",
        title: "Requirements captured",
        fields: [
          ["Project", "Kitchen renovation"],
          ["Location", "Lille"],
          ["Estimated budget", "€15k–€25k"],
          ["Timeline", "< 60 days"],
        ],
      },
      { time: "09:44", title: "Lead qualified", status: "High intent" },
      { time: "09:44", title: "CRM updated", detail: "Contact, project and history recorded." },
      { time: "09:45", title: "Consultation proposed", detail: "Three time slots sent." },
      { time: "09:47", title: "Appointment booked", detail: "Thursday, 10:30 — in the team's calendar." },
    ],
    result: { title: "Opportunity created", label: "Potential value", value: "€21,000" },
    colon: ":",
    close: "While your team was working on something else.",
  },
  problem: {
    label: "The real problem",
    title: [{ text: "Revenue doesn't always disappear" }, { text: "because you need", accent: "more leads." }],
    lead: "Sometimes it's already inside your business.",
    chain: [
      { title: "Missed enquiry", body: "A call during a site visit, a message on a Sunday." },
      { title: "Late response", body: "The prospect has already contacted someone else." },
      { title: "Forgotten quote", body: "Sent, never followed up." },
      { title: "No follow-up", body: "Nobody knows whose turn it is." },
      { title: "Dormant lead", body: "The project still exists; the conversation went cold." },
      { title: "Lost opportunity", body: "Without anyone deciding to lose it." },
    ],
    close: "AMYN builds the system between interest and revenue.",
  },
  reactivation: {
    label: "Reactivation",
    title: [{ text: "Your next customer may already be" }, { text: "in your", accent: "database." }],
    lead: "Over the years, a business accumulates:",
    items: ["previous enquiries", "unconverted quotes", "dormant opportunities", "old prospects", "postponed projects"],
    body: "Revenue OS can create structured reactivation workflows around your existing data where appropriate: segmentation, messages adapted to each contact's context, and replies tracked in the CRM.",
    compliance:
      "Every workflow follows the GDPR and marketing rules: a verified legal basis (consent or legitimate interest, depending on the case), clear information and a right to object in every message. No result is guaranteed: we estimate the potential with you, from your own data.",
  },
  dashboard: {
    label: "The management view",
    title: [{ text: "Everything that needs your attention," }, { accent: "on one screen." }],
    lead: "Revenue OS gives management a simple reading of commercial activity: what's coming in, what's moving, what's at risk of being lost.",
    tag: "Illustrative Revenue OS workspace · fictional data",
    period: "Last 30 days",
    metrics: [
      { label: "New leads", value: 127 },
      { label: "Qualified", value: 48 },
      { label: "Meetings", value: 21 },
      { label: "Open pipeline", value: 183500, currency: true },
      { label: "Follow-ups today", value: 14 },
      { label: "Opportunities at risk", value: 6, alert: true },
    ],
    pipelineTitle: "Pipeline",
    pipeline: [
      ["New", 38],
      ["Qualified", 26],
      ["Meetings", 18],
      ["Quotes sent", 12],
      ["Won", 6],
    ],
    riskTitle: "Needs attention today",
    risks: [
      ["Kitchen quote · Lille", "No reply for 6 days"],
      ["House extension · Roubaix", "Planned follow-up not sent"],
      ["Roofing · Lens", "Appointment to confirm"],
    ],
  },
  calculator: {
    label: "Opportunity calculator",
    title: [{ text: "What are your unanswered enquiries" }, { accent: "worth?" }],
    lead: "An order of magnitude, from your own assumptions. It predicts nothing: it helps you decide whether it's worth a closer look.",
    tag: "Illustrative scenario",
    inputs: "Your assumptions",
    enquiries: "Enquiries per month",
    value: "Average customer value (€)",
    conversion: "Current conversion rate (%)",
    lost: "Share of enquiries lost to slow or no follow-up (%)",
    lostHint: "Your estimate: enquiries left unanswered, never followed up or handled too late.",
    formula: "Annual opportunity = enquiries per month × share lost × current conversion rate × customer value × 12.",
    monthlyLost: "Enquiries affected per month",
    customers: "Potential customers per year",
    result: "Potential opportunity per year",
    disclaimer:
      "Illustrative scenario, not a revenue guarantee. The calculation assumes these enquiries, handled better, would convert at your current rate; reality depends on your market, your offer and your team.",
    cta: "Check it with a Revenue Audit",
  },
  audience: {
    label: "Who it's for",
    title: [{ text: "Built for businesses where one" }, { accent: "opportunity matters." }],
    sectors: [
      "Construction & renovation",
      "Home improvement",
      "Energy & solar",
      "Professional services",
      "B2B services",
      "Recruitment",
      "Technology",
      "Real estate",
      "High-value service businesses",
    ],
    close: "If a new customer can be worth thousands — or tens of thousands — your revenue infrastructure matters.",
  },
  process: {
    label: "How it works",
    title: [{ text: "Four stages," }, { text: "from audit to", accent: "operation." }],
    steps: [
      {
        title: "Revenue Audit",
        body: "We map your actual sales journey:",
        list: ["lead sources", "response processes", "CRM and tools", "customer journey", "follow-up", "bottlenecks", "lost opportunities"],
      },
      { title: "Architecture", body: "AMYN designs the Revenue OS around your actual operation: modules, rules, integrations and everyone's role. You approve before anything is built." },
      { title: "Build & integrate", body: "We build the automations, integrations, interfaces and workflows, then test them on your real cases." },
      { title: "Launch & optimise", body: "Deployment, monitoring, team training, then continuous improvement using your real operational data." },
    ],
  },
  offer: {
    label: "The engagement",
    title: "AMYN Revenue OS™",
    subtitle: "Custom implementation",
    priceLead: "From",
    price: "€25,000",
    tax: "VAT not applicable (French tax code, article 293 B).",
    intro: "A transformation of your sales infrastructure, run from audit to operation. The scope depends on your business, your tools and your objectives.",
    includesTitle: "The scope can include",
    includes: [
      "Revenue & automation audit",
      "Custom system architecture",
      "Lead capture infrastructure",
      "AI reception where appropriate",
      "Lead qualification",
      "CRM integration",
      "Follow-up automation",
      "Lead reactivation workflows",
      "Sales automation",
      "Revenue dashboard",
      "Conversion infrastructure",
      "Team implementation",
      "Documentation",
      "Training",
      "Initial optimisation period",
    ],
    cta: "Apply for a Revenue Audit",
    micro: "Revenue OS engagements are scoped individually based on business complexity, integrations and objectives.",
  },
  management: {
    label: "After implementation",
    title: "AMYN OS Management",
    body: "A sales system lives with the business. After implementation, AMYN can keep looking after it:",
    items: ["monitoring", "maintenance", "improvements", "extensions", "testing", "new integrations", "optimisation"],
    note: "Ongoing management available after implementation. Terms are defined during scoping.",
  },
  capabilities: {
    label: "Beyond Revenue OS",
    title: [{ text: "Some businesses need a system." }, { text: "Others need", accent: "the product itself." }],
    lead: "AMYN builds both. Everything needed to make the system work — and what lies beyond it.",
    items: {
      websites: { title: "Websites", body: "Premium websites designed around brand, experience and conversion." },
      webapps: { title: "Web applications", body: "Custom platforms, portals, dashboards and internal systems." },
      mobile: { title: "Mobile applications", body: "High-quality iOS and cross-platform digital products." },
      ai: { title: "AI & automation", body: "Custom AI integrations, agents, workflows and business automation." },
      products: { title: "Digital products", body: "From concept and UX to engineering and launch." },
      growth: { title: "Growth infrastructure", body: "Analytics, conversion systems, CRM, lead capture and customer journeys." },
    },
    more: "See all capabilities",
  },
  page: {
    label: "AMYN Revenue OS™ · Flagship offer",
    title: [{ text: "The revenue infrastructure" }, { text: "of your", accent: "business." }],
    lead: "Revenue OS captures every enquiry, qualifies it, triggers the right follow-up and gives your team — and management — a clear view of what needs to happen next. Designed and installed by AMYN, around the way you sell.",
    facts: ["Bespoke", "Connected to your tools", "Implementation from €25,000"],
    architecture: {
      label: "Architecture",
      title: [{ text: "Your tools stay." }, { accent: "They finally work together." }],
      layers: [
        { name: "Sources", items: ["Website", "Phone", "Email", "Messaging", "Advertising", "Referrals"] },
        { name: "Revenue OS", items: ["Reception", "Qualification", "Rules & routing", "Follow-up", "Copilot", "Management view"] },
        { name: "Your systems", items: ["CRM", "Calendar", "Quoting tool", "Invoicing", "Internal tools"] },
        { name: "Outcomes", items: ["Appointments", "Proposals", "Customers", "Management visibility"] },
      ],
    },
    detailLabel: "The modules in detail",
  },
  integrations: {
    label: "Integrations",
    title: [{ text: "Built on your stack," }, { accent: "not instead of it." }],
    lead: "Revenue OS connects to the tools your team already uses, where their interfaces allow it. The names below are examples of systems that can be connected, not integrations already delivered: each connection is checked during the audit.",
    categories: [
      ["CRM", "HubSpot, Pipedrive, Salesforce, Axonaut…"],
      ["Email", "Gmail, Outlook, business mailboxes"],
      ["Calendar", "Google Calendar, Outlook, Calendly"],
      ["Forms & website", "Your current website, forms, landing pages"],
      ["Phone", "Switchboard, voicemail, call-backs"],
      ["Messaging", "SMS, WhatsApp Business"],
      ["Analytics", "Audience measurement, lead sources"],
      ["Payments", "Stripe, payment links"],
      ["Internal systems", "ERP, quoting tools, spreadsheets, databases"],
    ],
  },
  security: {
    label: "Data & security",
    title: [{ text: "A sales system handles" }, { accent: "sensitive data." }],
    items: [
      { title: "GDPR by design", body: "Minimal data, defined purposes, set retention periods, and clear information and a right to object built into every workflow." },
      { title: "Documented providers", body: "Hosting, AI models and third-party services are chosen with you and documented, with a data processing agreement (GDPR Art. 28) where it applies." },
      { title: "Controlled access", body: "Named accounts, role-based permissions, secrets kept server-side — never in the browser." },
      { title: "Human control", body: "You decide what the system does on its own and what needs approval: quotes, commitments, sensitive cases." },
      { title: "Traceability", body: "Automatic actions are logged: you know what was sent, when, and why." },
    ],
  },
  faq: {
    label: "FAQ",
    title: [{ text: "Questions" }, { text: "about", accent: "Revenue OS." }],
    items: [
      { q: "Do we need to change CRM?", a: "Not necessarily. Revenue OS first connects to your current tools where technically possible. If your tool limits the system, we tell you during the audit, with the options." },
      { q: "Is it a chatbot?", a: "No. AI reception can be one part of it, but Revenue OS is the whole journey: response, qualification, CRM, follow-up, appointments, quotes and management visibility." },
      { q: "Does the AI talk to our customers unsupervised?", a: "No. You define the rules, the tone and the limits. Anything that commits the business (prices, timelines, commitments) can always require human approval." },
      { q: "How long does implementation take?", a: "It depends on the scope and the integrations. The schedule is set after the audit, before you commit to anything." },
      { q: "Can you guarantee more revenue?", a: "No. Revenue OS removes operational leaks — unanswered enquiries, forgotten follow-ups, dormant opportunities. The impact depends on your market, your offer and your team; we estimate it with you, without promises." },
      { q: "Who owns the system?", a: "Rights in what is built for you, and which accounts are used (CRM, hosting, tools), are set out in the proposal. The principle: your data and your tools remain yours." },
      { q: "What happens after launch?", a: "AMYN OS Management lets you have the system monitored, maintained and improved over time. It's optional and defined during scoping." },
      { q: "Why “from €25,000”?", a: "Because a Revenue OS is a bespoke transformation: audit, architecture, build, integrations, training and optimisation. The final price depends on complexity and is set after the audit." },
    ],
  },
  finale: {
    label: "Next step",
    title: [{ text: "Do you know what you're losing" }, { accent: "today?" }],
    lead: "The Revenue Audit starts there: the real journey from enquiry to customer, and the places where it leaks.",
  },
  audit: {
    label: "Revenue Audit",
    title: [{ text: "Find where revenue is leaking" }, { text: "from your", accent: "sales process." }],
    lead: "AMYN analyses the journey between an enquiry and a customer — and shows you precisely where opportunities are being lost.",
    start: "Request your Revenue Audit",
    journeyLabel: "What we analyse",
    journeyTitle: [{ text: "Seven steps between an enquiry" }, { text: "and a", accent: "customer." }],
    journey: [
      ["Enquiry", "Where do enquiries come from, and how many never get a reply?"],
      ["Response", "How fast, by whom, and how well?"],
      ["Qualification", "Can you quickly tell a serious enquiry from simple curiosity?"],
      ["Follow-up", "Who follows up, when — and what happens when nobody does?"],
      ["Appointment", "How many steps between interest and a booked slot?"],
      ["Proposal", "How many quotes go out without structured follow-up?"],
      ["Customer", "What happens to the history: is it reused, or forgotten?"],
    ],
    outcomesLabel: "After the audit",
    outcomes: [
      { title: "A map of your real journey", body: "From first enquiry to signature, with your tools and your timings." },
      { title: "The leak points", body: "Where opportunities are lost, and why." },
      { title: "Priorities", body: "What to fix first, and what can wait." },
      { title: "A recommended architecture", body: "If Revenue OS is relevant for you: the modules, the integrations and the scope." },
    ],
    formLabel: "Your request",
    formTitle: [{ text: "Five questions," }, { accent: "a few minutes." }],
    formLead: "The more precise your answers, the more useful the first conversation. No documents needed at this stage.",
    faqTitle: [{ text: "Questions about" }, { text: "the", accent: "Revenue Audit." }],
    faq: [
      { q: "What happens after my request?", a: "We review your answers, then get back to you for an initial conversation. The audit's terms (scope, duration, conditions) are set out before you commit to anything." },
      { q: "Am I committed by sending this form?", a: "No. The request commits you to nothing." },
      { q: "Do I need to prepare documents?", a: "Not at this stage. If the audit goes ahead, we agree together on the useful information and how to share it." },
    ],
  },
};

const copy: Record<Locale, RevenueCopy> = { fr, en };
export const getRevenue = (locale: Locale): RevenueCopy => copy[locale];

/** Prix plancher d'un Revenue OS, pour les données structurées. */
export const REVENUE_OS_FROM_EUR = 25000;

/* ---------------------------------------------------------------------------
   Calculateur d'opportunité — formule unique, testée.
   --------------------------------------------------------------------------- */

export const OPPORTUNITY_DEFAULTS = { enquiries: 40, value: 8000, conversion: 20, lost: 10 } as const;
export const OPPORTUNITY_LIMITS = { enquiries: 100000, value: 10000000, conversion: 100, lost: 100 } as const;

const clamp = (v: number, max: number) => (Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : 0);

/**
 * Opportunité annuelle = demandes/mois × part perdue × taux de conversion
 * actuel × valeur client × 12. Aucune division : toute entrée nulle donne 0.
 */
export function computeOpportunity(input: { enquiries: number; value: number; conversion: number; lost: number }) {
  const enquiries = clamp(input.enquiries, OPPORTUNITY_LIMITS.enquiries);
  const value = clamp(input.value, OPPORTUNITY_LIMITS.value);
  const conversion = clamp(input.conversion, OPPORTUNITY_LIMITS.conversion) / 100;
  const lost = clamp(input.lost, OPPORTUNITY_LIMITS.lost) / 100;
  const monthlyLost = enquiries * lost;
  const customersPerYear = monthlyLost * conversion * 12;
  return { monthlyLost, customersPerYear, annual: customersPerYear * value };
}
