import type { Locale } from "./i18n/config.ts";
import type { HeadingLine } from "@/components/ui/Layout";

/**
 * ProofSprint — textes de la page, dans les deux langues.
 *
 * Offre distincte des sept services : un dossier commercial préparé en cinq
 * jours ouvrés pour une vente grand compte. Règles de rédaction :
 * - aucune expérience, certification, référence client, statistique ou
 *   résultat inventé ; on décrit les livrables et le processus ;
 * - aucune promesse de gain de l'affaire, ni d'hébergement sécurisé ou de
 *   contrôle d'accès qui n'existent pas : les modalités de partage
 *   s'accordent avec le client ;
 * - les affirmations produit, techniques, sécurité et commerciales restent
 *   validées par les experts du client ;
 * - pas de remise, de rareté ni de compte à rebours.
 *
 * La version française fait référence ; l'anglaise a la même structure
 * (type `ProofSprintCopy`).
 */

type Item = { title: string; body: string };

const fr = {
  meta: {
    title: "ProofSprint — dossier grand compte en 5 jours ouvrés",
    description:
      "Réponses sourcées, présentation acheteur, calculateur ROI et plan de déploiement : votre dossier grand compte en cinq jours ouvrés, validé par vos équipes.",
  },
  hero: {
    label: "ProofSprint · Service AMYN",
    title: [
      { text: "Votre dossier commercial grand compte," },
      { text: "prêt en", accent: "5 jours ouvrés." },
    ] as HeadingLine[],
    lead: "Vous vendez un logiciel ou une prestation d'intégration et votre acheteur attend des réponses techniques, des justificatifs, un plan de déploiement ou un calcul de retour sur investissement ? AMYN Agency transforme vos informations existantes en un dossier clair, adapté à cette opportunité et validé par vos équipes.",
    primary: "Parlons de votre dossier",
    secondary: "Voir les livrables",
    facts: ["5 jours ouvrés", "12 500 €", "Validé par vos experts"],
  },
  visual: {
    aria: "Illustration : des documents sources deviennent une matrice de réponses, une présentation pour l'acheteur et un calcul de retour sur investissement.",
    fictional: "Exemple fictif",
    sources: "Vos sources",
    docs: ["Questionnaire acheteur.xlsx", "Architecture.pdf", "Sécurité.pdf", "Offre tarifaire.xlsx"],
    matrix: "Matrice de réponses",
    matrixRows: [
      { q: "Q.014 · Authentification unique", status: "Sourcée", tone: "ok" },
      { q: "Q.027 · Réversibilité des données", status: "À valider", tone: "review" },
      { q: "Q.041 · Plan de reprise", status: "Manquante", tone: "gap" },
    ],
    room: "Proof room",
    roomTabs: ["Besoins", "Sécurité", "Déploiement", "ROI"],
    roi: "Calculateur ROI",
    roiNote: "Estimation · hypothèses validées par le client",
    roiInputs: [
      ["Utilisateurs", "240"],
      ["Heures gagnées / mois", "6"],
    ],
  },
  problem: {
    label: "Le contexte",
    title: [{ text: "Le deal avance. Le dossier,", accent: "pas encore." }] as HeadingLine[],
    intro:
      "Toutes les ventes n'en ont pas besoin. ProofSprint est utile dans une situation précise, que connaissent bien les équipes qui vendent à de grands comptes :",
    points: [
      {
        title: "Une opportunité sérieuse avance",
        body: "L'acheteur est intéressé, mais il lui faut encore des éléments pour défendre la décision en interne.",
      },
      {
        title: "L'information est dispersée",
        body: "Les réponses existent, mais dans des documents, des présentations et des têtes réparties entre plusieurs équipes.",
      },
      {
        title: "Le temps des experts est compté",
        body: "Commerciaux, avant-vente et experts techniques ont peu de disponibilité pour tout rassembler et mettre en forme.",
      },
      {
        title: "L'acheteur veut du concret",
        body: "Des réponses claires, des hypothèses explicites et une vision réaliste de la mise en œuvre.",
      },
    ] as Item[],
  },
  deliverables: {
    label: "Les livrables",
    title: [{ text: "Ce que vous recevez", accent: "en cinq jours." }] as HeadingLine[],
    intro: "Cinq éléments, préparés pour une opportunité précise, à partir de vos informations et validés par vos équipes.",
    items: [
      {
        title: "Matrice de réponses sourcée",
        body: "Jusqu'à 100 questions de l'acheteur ou lignes de réponse, chacune reliée aux documents qui la justifient. Les justificatifs manquants et les questions qui demandent la validation d'un expert restent visibles.",
      },
      {
        title: "Proof room : l'espace de présentation acheteur",
        body: "Une présentation web simple, jusqu'à six sections, organisée autour des critères de décision de cet acheteur. Le mode de partage est convenu avec vous.",
      },
      {
        title: "Calculateur ROI transparent",
        body: "Un outil interactif de calcul du retour sur investissement, construit sur des hypothèses que vous validez. Les paramètres sont visibles et les estimations clairement distinguées des résultats démontrés.",
      },
      {
        title: "Synthèse de mise en œuvre",
        body: "Les étapes proposées, les responsabilités, les dépendances et les hypothèses, présentées clairement et validées par vous.",
      },
      {
        title: "Registre des manques et remise réutilisable",
        body: "La liste des informations manquantes, des questions ouvertes et des validations nécessaires, et une remise ordonnée de tous les éléments préparés.",
      },
    ] as Item[],
  },
  process: {
    label: "Le sprint",
    title: [{ text: "Cinq jours ouvrés, étape par", accent: "étape." }] as HeadingLine[],
    steps: [
      { when: "Avant le lancement", title: "Cadrage", body: "Nous confirmons que ProofSprint convient, nous fixons le périmètre et nous recevons les documents sources convenus." },
      { when: "Jour 1", title: "Cartographie", body: "Nous relions les questions de l'acheteur aux justificatifs disponibles." },
      { when: "Jours 2 et 3", title: "Assemblage", body: "Nous rédigeons les réponses, construisons la proof room et le calculateur ROI." },
      { when: "Jour 4", title: "Relecture par vos experts", body: "Vos experts relisent les affirmations et traitent les manques." },
      { when: "Jour 5", title: "Révision et remise", body: "Nous intégrons la révision convenue et vous remettons le dossier." },
    ],
    note: "Les cinq jours ouvrés commencent à la réception des documents convenus. Le calendrier suppose des retours et validations dans les délais prévus ; un retard de relecture ou de validation peut le décaler.",
  },
  audience: {
    label: "Pour qui",
    title: [{ text: "Pour les équipes qui vendent à de", accent: "grands comptes." }] as HeadingLine[],
    items: [
      "Éditeurs de logiciels B2B.",
      "Partenaires technologiques et intégrateurs spécialisés.",
      "Équipes commerciales ou avant-vente engagées sur une opportunité grand compte significative.",
      "Équipes qui disposent déjà de la connaissance produit et des documents sources, et qui ont besoin d'aide pour en faire un dossier prêt pour l'acheteur.",
    ],
    whenTitle: "ProofSprint est le plus utile quand il y a :",
    when: ["une opportunité en cours", "un sponsor identifié chez l'acheteur", "une échéance concrète côté acheteur"],
  },
  pricing: {
    label: "Prix et périmètre",
    title: [{ text: "Un prix fixe, un périmètre", accent: "clair." }] as HeadingLine[],
    price: "12 500 €",
    priceNote: "pour un ProofSprint standard — TVA non applicable, article 293 B du CGI",
    scopeTitle: "Le périmètre standard",
    scope: [
      "Une opportunité commerciale.",
      "Jusqu'à 100 questions ou lignes de réponse.",
      "Jusqu'à 20 documents sources fournis.",
      "Une proof room de six sections au plus.",
      "Un calculateur ROI.",
      "Une synthèse de mise en œuvre.",
      "Un registre des manques et des validations.",
      "Une langue par livrable client.",
      "Une révision consolidée.",
    ],
    languageNote:
      "Ce site est bilingue, mais un ProofSprint standard est livré dans une seule langue, au choix : français ou anglais. Une langue supplémentaire fait l'objet d'un accord séparé.",
    paymentTitle: "Paiement",
    payment: "60 % au lancement, 40 % à l'acceptation expresse des livrables.",
    fit: "Avant d'accepter un projet, nous confirmons avec vous que ProofSprint convient à l'opportunité et nous fixons le périmètre par écrit.",
  },
  why: {
    label: "Pourquoi AMYN",
    title: [{ text: "Rendre l'information complexe facile à", accent: "relire." }] as HeadingLine[],
    body: "Nous réunissons développement web, outils interactifs et méthodes de travail structurées assistées par l'IA pour rendre une information complexe plus facile à relire et à utiliser. Vos équipes restent responsables de la validation des affirmations produit, techniques, de sécurité et commerciales.",
    capabilities: [
      { title: "Développement web", body: "La proof room est une vraie présentation web, claire sur ordinateur comme sur téléphone." },
      { title: "Outils interactifs", body: "Le calculateur ROI montre ses paramètres : l'acheteur voit d'où viennent les chiffres." },
      { title: "Méthode structurée, assistée par l'IA", body: "Chaque réponse est reliée à sa source ; ce qui manque est signalé, jamais inventé." },
    ] as Item[],
  },
  faq: {
    label: "Questions fréquentes",
    title: [{ text: "Vos questions sur", accent: "ProofSprint." }] as HeadingLine[],
    items: [
      {
        q: "ProofSprint est-il un abonnement à un logiciel de réponse aux appels d'offres ?",
        a: "Non. C'est un service réalisé pour vous, sur un périmètre défini. Il peut fonctionner en complément des outils que vous utilisez déjà.",
      },
      {
        q: "Rédigez-vous ou certifiez-vous nos affirmations de sécurité ?",
        a: "Nous organisons les informations que vous fournissez ; vos experts habilités valident les affirmations. Les certifications et les audits de sécurité ne font pas partie du service.",
      },
      {
        q: "Que devons-nous fournir ?",
        a: "Les questions de l'acheteur, les documents sources utiles, un sponsor du projet de votre côté et des relecteurs disponibles.",
      },
      {
        q: "Et si une information manque ?",
        a: "Elle est signalée clairement dans le registre des manques. Nous ne l'inventons pas.",
      },
      {
        q: "Pouvez-vous garantir que nous gagnerons l'affaire ?",
        a: "Non. ProofSprint vous aide à présenter un dossier clair et justifié ; la décision appartient à l'acheteur.",
      },
      {
        q: "Les livrables peuvent-ils être bilingues ?",
        a: "Le périmètre standard comprend une langue, français ou anglais. Toute langue supplémentaire fait l'objet d'un accord séparé.",
      },
      {
        q: "Comment les informations confidentielles sont-elles traitées ?",
        a: "Les modalités de transmission des sources et de partage des livrables sont convenues avec vous avant tout envoi de document. Nous ne revendiquons aucune certification.",
      },
      {
        q: "Qu'est-ce qui n'est pas compris dans le périmètre standard ?",
        a: "Les avis juridiques, les certifications, les audits de sécurité, les intégrations en production, ainsi que les questions, documents ou cycles de révision supplémentaires.",
      },
    ],
  },
  contact: {
    label: "Contact",
    title: [
      { text: "Un dossier à préparer pour un acheteur grand compte ?", accent: "Parlons de votre échéance." },
    ] as HeadingLine[],
    lead: "Décrivez l'opportunité et l'échéance de l'acheteur. Aucun document à joindre : nous convenons d'abord du périmètre et des modalités de partage.",
    orEmail: "Vous préférez l'e-mail ?",
  },
  card: {
    label: "Nouveau service",
    summary:
      "Un dossier commercial structuré pour vos ventes grand compte : réponses documentées, présentation acheteur, calculateur ROI et plan de déploiement.",
    cta: "Découvrir ProofSprint",
    facts: ["5 jours ouvrés", "12 500 €"],
  },
};

export type ProofSprintCopy = typeof fr;

const en: ProofSprintCopy = {
  meta: {
    title: "ProofSprint — enterprise proof package in 5 business days",
    description:
      "Source-linked answers, a buyer-facing proof room, an ROI calculator and a rollout summary: your enterprise deal package in five business days, approved by your team.",
  },
  hero: {
    label: "ProofSprint · An AMYN service",
    title: [
      { text: "Your enterprise deal proof package," },
      { text: "ready in", accent: "five business days." },
    ],
    lead: "Selling software or an implementation project, but your buyer still needs technical answers, supporting evidence, a rollout plan or a business case? AMYN Agency turns your existing information into a clear, deal-specific package reviewed and approved by your team.",
    primary: "Discuss your deal",
    secondary: "Explore the deliverables",
    facts: ["Five business days", "€12,500", "Approved by your experts"],
  },
  visual: {
    aria: "Illustration: source documents become a response matrix, a buyer-facing presentation and a business case.",
    fictional: "Fictional example",
    sources: "Your sources",
    docs: ["Buyer questionnaire.xlsx", "Architecture.pdf", "Security.pdf", "Pricing proposal.xlsx"],
    matrix: "Response matrix",
    matrixRows: [
      { q: "Q.014 · Single sign-on", status: "Sourced", tone: "ok" },
      { q: "Q.027 · Data portability", status: "To approve", tone: "review" },
      { q: "Q.041 · Recovery plan", status: "Missing", tone: "gap" },
    ],
    room: "Proof room",
    roomTabs: ["Needs", "Security", "Rollout", "ROI"],
    roi: "ROI calculator",
    roiNote: "Estimate · client-approved assumptions",
    roiInputs: [
      ["Users", "240"],
      ["Hours saved / month", "6"],
    ],
  },
  problem: {
    label: "The situation",
    title: [{ text: "The deal is moving. The proof", accent: "isn't yet." }],
    intro:
      "Not every sale needs it. ProofSprint is useful in a specific situation that teams selling to enterprise buyers know well:",
    points: [
      {
        title: "A promising deal is moving forward",
        body: "The buyer is interested, but still needs material to defend the decision internally.",
      },
      {
        title: "The information is scattered",
        body: "The answers exist, but across documents, slide decks and people in several teams.",
      },
      {
        title: "Expert time is limited",
        body: "Sales, presales and technical experts have little time to pull it all together and present it well.",
      },
      {
        title: "The buyer needs specifics",
        body: "Clear answers, explicit assumptions and a practical picture of the implementation.",
      },
    ],
  },
  deliverables: {
    label: "Deliverables",
    title: [{ text: "What you receive", accent: "in five days." }],
    intro: "Five components, prepared for one specific opportunity, built from your information and approved by your team.",
    items: [
      {
        title: "Source-linked response matrix",
        body: "Up to 100 buyer questions or response rows, each linked to the documents that support it. Missing evidence and questions that need expert approval stay visible.",
      },
      {
        title: "Buyer-facing proof room",
        body: "A simple web presentation with up to six sections, organised around this buyer's decision criteria. The sharing method is agreed with you.",
      },
      {
        title: "Transparent ROI calculator",
        body: "An interactive business-case tool built on assumptions you approve. The inputs are visible, and estimates are clearly distinguished from proven results.",
      },
      {
        title: "Implementation summary",
        body: "The proposed stages, responsibilities, dependencies and assumptions, set out clearly and approved by you.",
      },
      {
        title: "Gap register and reusable handover",
        body: "A list of missing information, unresolved questions and required approvals, plus an organised handover of everything prepared.",
      },
    ],
  },
  process: {
    label: "The sprint",
    title: [{ text: "Five business days, step by", accent: "step." }],
    steps: [
      { when: "Before kickoff", title: "Scoping", body: "We confirm ProofSprint is a fit, agree the scope and receive the agreed source materials." },
      { when: "Day 1", title: "Mapping", body: "We map the buyer's questions to the available evidence." },
      { when: "Days 2–3", title: "Assembly", body: "We assemble the responses, the proof room and the business case." },
      { when: "Day 4", title: "Expert review", body: "Your experts review the claims and resolve gaps." },
      { when: "Day 5", title: "Revision and handover", body: "We incorporate the agreed revision and hand over the package." },
    ],
    note: "The five business days start once the agreed materials are received. The schedule depends on timely feedback and approvals from your team; delays in review or approval can move it.",
  },
  audience: {
    label: "Who it's for",
    title: [{ text: "For teams selling to", accent: "enterprise buyers." }],
    items: [
      "B2B software companies.",
      "Specialist technology and implementation partners.",
      "Sales or solutions teams working on a substantial enterprise opportunity.",
      "Teams that already have the product knowledge and source material, and need help turning it into buyer-ready output.",
    ],
    whenTitle: "ProofSprint is most relevant when there is:",
    when: ["a live opportunity", "an identified internal sponsor at the buyer", "a concrete buyer deadline"],
  },
  pricing: {
    label: "Pricing and scope",
    title: [{ text: "One fixed price, a", accent: "clear scope." }],
    price: "€12,500",
    priceNote: "for a standard ProofSprint — VAT not applicable (French tax code, article 293 B)",
    scopeTitle: "Standard scope",
    scope: [
      "One commercial opportunity.",
      "Up to 100 questions or response rows.",
      "Up to 20 supplied source documents.",
      "One proof room with up to six sections.",
      "One ROI calculator.",
      "One implementation summary.",
      "One gap and approval register.",
      "One language per client deliverable.",
      "One consolidated revision.",
    ],
    languageNote:
      "This website is bilingual, but a standard ProofSprint is delivered in one language of your choice: English or French. An additional language requires a separate agreement.",
    paymentTitle: "Payment",
    payment: "60% at kickoff, 40% upon express acceptance of the deliverables.",
    fit: "Before accepting a project, we confirm with you that ProofSprint suits the opportunity and agree the scope in writing.",
  },
  why: {
    label: "Why AMYN",
    title: [{ text: "Making complex information easy to", accent: "review." }],
    body: "We bring together web development, interactive tools and structured AI-assisted workflows to make complex information easier to review and use. Your team remains responsible for approving the product, technical, security and commercial claims.",
    capabilities: [
      { title: "Web development", body: "The proof room is a real web presentation, clear on desktop and on mobile." },
      { title: "Interactive tools", body: "The ROI calculator shows its inputs, so the buyer can see where the numbers come from." },
      { title: "Structured, AI-assisted workflow", body: "Every answer is linked to its source; anything missing is flagged, never invented." },
    ],
  },
  faq: {
    label: "FAQ",
    title: [{ text: "Questions about", accent: "ProofSprint." }],
    items: [
      {
        q: "Is ProofSprint an RFP software subscription?",
        a: "No. It is a scoped, done-for-you service, and it can work alongside the tools you already use.",
      },
      {
        q: "Do you write or certify our security claims?",
        a: "We organise the information you supply; your authorised experts approve the claims. Certification and security audits are not included.",
      },
      {
        q: "What do we need to provide?",
        a: "The buyer's questions, the relevant source documents, a project sponsor on your side and available reviewers.",
      },
      {
        q: "What if information is missing?",
        a: "It is flagged clearly in the gap register. We don't invent it.",
      },
      {
        q: "Can you guarantee we will win the deal?",
        a: "No. ProofSprint helps you present a clear, well-supported package; the decision belongs to the buyer.",
      },
      {
        q: "Can the deliverables be bilingual?",
        a: "The standard scope includes one language, English or French. Any additional language requires a separate agreement.",
      },
      {
        q: "How is confidential information handled?",
        a: "How source material is transferred and how deliverables are shared are agreed with you before any document is sent. We don't claim any certification.",
      },
      {
        q: "What is outside the standard scope?",
        a: "Legal opinions, certifications, security audits, production integrations, and additional questions, documents or revision rounds.",
      },
    ],
  },
  contact: {
    label: "Contact",
    title: [{ text: "Preparing materials for an enterprise buyer?", accent: "Let's discuss your deadline." }],
    lead: "Tell us about the opportunity and the buyer's deadline. No documents needed: we first agree the scope and how information will be shared.",
    orEmail: "Prefer email?",
  },
  card: {
    label: "New service",
    summary:
      "A structured proof package for enterprise sales: source-linked answers, a buyer presentation, an ROI calculator and a rollout summary.",
    cta: "Discover ProofSprint",
    facts: ["Five business days", "€12,500"],
  },
};

const copy: Record<Locale, ProofSprintCopy> = { fr, en };

export const getProofSprint = (locale: Locale): ProofSprintCopy => copy[locale];

/** Prix public, pour les données structurées (franchise en base : pas de TVA). */
export const PROOFSPRINT_PRICE_EUR = 12500;
