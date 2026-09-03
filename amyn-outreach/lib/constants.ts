// ---------------------------------------------------------------------------
// Valeurs de reference du domaine AMYN.
// SQLite ne supporte pas les enums Prisma : la source de verite est ici.
// ---------------------------------------------------------------------------

// === STATUTS PROSPECT ======================================================
export const PROSPECT_STATUSES = [
  "FOUND",
  "RESEARCHED",
  "AUDITED",
  "READY",
  "CONTACTED",
  "REPLIED",
  "INTERESTED",
  "MEETING",
  "WON",
  "LOST",
  "BLOCKED",
  "OPTOUT",
] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

type StatusMeta = { label: string; description: string; badge: string; dot: string };

export const STATUS_META: Record<ProspectStatus, StatusMeta> = {
  FOUND: {
    label: "Trouvé",
    description: "Entreprise identifiée par une source. Rien n'est encore vérifié.",
    badge: "bg-zinc-500/10 text-zinc-300 ring-zinc-400/20",
    dot: "bg-zinc-400",
  },
  RESEARCHED: {
    label: "Recherché",
    description: "Informations publiques collectées et sources enregistrées.",
    badge: "bg-slate-500/10 text-slate-300 ring-slate-400/20",
    dot: "bg-slate-400",
  },
  AUDITED: {
    label: "Audité",
    description: "Présence en ligne analysée, problèmes prouvés enregistrés.",
    badge: "bg-sky-500/10 text-sky-300 ring-sky-400/20",
    dot: "bg-sky-400",
  },
  READY: {
    label: "Prêt",
    description: "Email public trouvé, diagnostic complet, message rédigé et vérifié.",
    badge: "bg-amber-500/10 text-amber-300 ring-amber-400/20",
    dot: "bg-amber-400",
  },
  CONTACTED: {
    label: "Contacté",
    description: "Email envoyé. En attente de réponse.",
    badge: "bg-cyan-500/10 text-cyan-300 ring-cyan-400/20",
    dot: "bg-cyan-400",
  },
  REPLIED: {
    label: "A répondu",
    description: "Une réponse a été reçue et classée.",
    badge: "bg-indigo-500/10 text-indigo-300 ring-indigo-400/20",
    dot: "bg-indigo-400",
  },
  INTERESTED: {
    label: "Intéressé",
    description: "Réponse positive. À traiter commercialement.",
    badge: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
    dot: "bg-emerald-400",
  },
  MEETING: {
    label: "Rendez-vous",
    description: "Un échange ou rendez-vous est prévu.",
    badge: "bg-teal-500/10 text-teal-300 ring-teal-400/20",
    dot: "bg-teal-400",
  },
  WON: {
    label: "Client",
    description: "Devenu client. Un dossier client existe.",
    badge: "bg-gold-500/15 text-gold-300 ring-gold-500/30",
    dot: "bg-gold-400",
  },
  LOST: {
    label: "Perdu",
    description: "Refus explicite ou opportunité close.",
    badge: "bg-stone-500/10 text-stone-400 ring-stone-400/20",
    dot: "bg-stone-500",
  },
  BLOCKED: {
    label: "Bloqué",
    description:
      "Ne peut pas avancer : aucun email public fiable, ou diagnostic insuffisant.",
    badge: "bg-orange-500/10 text-orange-300 ring-orange-400/20",
    dot: "bg-orange-400",
  },
  OPTOUT: {
    label: "Opposition",
    description: "A demandé à ne plus être contacté. Bloqué définitivement.",
    badge: "bg-rose-500/10 text-rose-300 ring-rose-400/20",
    dot: "bg-rose-400",
  },
};

/** Compteurs mis en avant sur le dashboard. */
export const DASHBOARD_STATUSES: ProspectStatus[] = [
  "FOUND",
  "RESEARCHED",
  "AUDITED",
  "READY",
  "CONTACTED",
  "REPLIED",
  "INTERESTED",
  "WON",
];

export function isProspectStatus(v: string): v is ProspectStatus {
  return (PROSPECT_STATUSES as readonly string[]).includes(v);
}
export function statusMeta(v: string): StatusMeta {
  return isProspectStatus(v) ? STATUS_META[v] : STATUS_META.FOUND;
}

/** Statuts à partir desquels un prospect ne doit plus jamais être contacté. */
export const TERMINAL_STATUSES: ProspectStatus[] = ["OPTOUT", "LOST", "WON"];

// === OFFRES AMYN ===========================================================
// Grille officielle. Ne jamais modifier ces prix.
export const OFFERS = {
  ESSENTIAL: {
    key: "ESSENTIAL",
    label: "Essential",
    price: 790,
    unit: "€",
    recurring: false,
    positioning: "Présence web professionnelle.",
    features: [
      "Site web professionnel",
      "Jusqu'à 5 pages",
      "Responsive",
      "WhatsApp / appel",
      "Google Maps",
      "Formulaire",
      "Domaine",
      "Mise en ligne",
    ],
  },
  PREMIUM: {
    key: "PREMIUM",
    label: "Premium",
    price: 1290,
    unit: "€",
    recurring: false,
    positioning:
      "Site + conversion + réservation + Google Business + SEO local + automatisations pertinentes.",
    features: [
      "Tout Essential",
      "Réservation",
      "Optimisation Google Business",
      "SEO local de base",
      "Automatisation simple",
      "Analytics",
      "Galerie / portfolio",
      "Petites modifications",
    ],
  },
  ULTIMATE: {
    key: "ULTIMATE",
    label: "Ultimate",
    price: 1990,
    unit: "€",
    recurring: false,
    positioning:
      "Système complet : fonctionnalités et automatisations avancées, suivi prospect, SEO renforcé, réservation avancée, support et maintenance prévus dans l'offre.",
    features: [
      "Tout Premium",
      "SEO local renforcé",
      "Automatisations avancées",
      "Suivi des prospects",
      "Réservation avancée",
      "Landing pages",
      "Tableau de suivi",
      "Optimisation Google Business",
      "Maintenance",
      "Support prioritaire",
    ],
  },
  CARE: {
    key: "CARE",
    label: "AMYN Care",
    price: 99,
    unit: "€/mois",
    recurring: true,
    positioning:
      "Maintenance, sécurité, sauvegardes, hébergement/support selon la configuration finale, petites modifications, surveillance et suivi.",
    features: [
      "Hébergement",
      "Maintenance",
      "Sécurité",
      "Sauvegardes",
      "Petites modifications",
      "Surveillance",
      "Support",
    ],
  },
} as const;

export type OfferKey = keyof typeof OFFERS;
export const SELLABLE_OFFERS: OfferKey[] = ["ESSENTIAL", "PREMIUM", "ULTIMATE"];

export function offerMeta(key: string | null | undefined) {
  if (!key) return null;
  return (OFFERS as Record<string, (typeof OFFERS)[OfferKey]>)[key] ?? null;
}

// === CATALOGUE DES PROBLEMES ==============================================
export const ISSUE_TYPES = {
  NO_WEBSITE: "Aucun site web",
  SITE_UNREACHABLE: "Site inaccessible",
  NO_HTTPS: "Pas de HTTPS",
  NOT_MOBILE_FRIENDLY: "Mauvaise expérience mobile",
  NO_FORM: "Aucun formulaire de contact",
  BROKEN_FORM: "Formulaire cassé",
  NO_BOOKING: "Réservation absente",
  NO_CLICK_TO_CALL: "Numéro non cliquable",
  NO_EMAIL_ON_SITE: "Aucun email de contact sur le site",
  NO_WHATSAPP: "Pas de contact WhatsApp",
  OUTDATED_SITE: "Site obsolète",
  BROKEN_LINKS: "Liens cassés",
  SLOW_SITE: "Site lent",
  HEAVY_PAGE: "Page très lourde",
  NO_CLEAR_CTA: "Aucun appel à l'action clair",
  MISSING_TITLE: "Balise titre absente ou vide",
  MISSING_META_DESCRIPTION: "Meta description absente",
  NO_LOCAL_INFO: "Informations locales absentes",
  NO_OPENING_HOURS: "Horaires absents",
  GBP_MISSING: "Aucune fiche Google Business connue",
  GBP_INCOMPLETE: "Fiche Google incomplète",
  LEGACY_TECH: "Technologie obsolète",
  NO_LEGAL_NOTICE: "Mentions légales absentes",
} as const;
export type IssueType = keyof typeof ISSUE_TYPES;

export const SEVERITY_META: Record<string, { label: string; badge: string; weight: number }> = {
  HIGH: { label: "Élevée", badge: "bg-rose-500/10 text-rose-300 ring-rose-400/20", weight: 3 },
  MEDIUM: { label: "Moyenne", badge: "bg-amber-500/10 text-amber-300 ring-amber-400/20", weight: 2 },
  LOW: { label: "Faible", badge: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20", weight: 1 },
};

export const AUDIT_STATUS_META: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "En attente", tone: "text-zinc-400" },
  COMPLETE: { label: "Complet", tone: "text-emerald-400" },
  INCOMPLETE: { label: "Incomplet", tone: "text-amber-400" },
  FAILED: { label: "Échec", tone: "text-rose-400" },
  BLOCKED_BY_ROBOTS: { label: "Bloqué par robots.txt", tone: "text-orange-400" },
};

export const SOURCE_KIND_LABELS: Record<string, string> = {
  WEBSITE: "Site officiel",
  LEGAL_NOTICE: "Mentions légales",
  GOOGLE_BUSINESS: "Fiche Google Business",
  INSTAGRAM: "Instagram",
  DIRECTORY: "Annuaire",
  OSM: "OpenStreetMap",
  SIRENE: "Base Sirene (INSEE)",
  MANUAL: "Saisie manuelle",
};

export const DISCOVERY_METHOD_LABELS: Record<string, string> = {
  LEGAL_NOTICE: "Mentions légales du site",
  WEBSITE_CONTACT: "Page contact du site",
  WEBSITE_MAILTO: "Lien mailto: sur le site",
  GOOGLE_BUSINESS: "Fiche Google Business",
  INSTAGRAM_BIO: "Bio Instagram",
  MANUAL: "Saisie manuelle",
};

// === REPONSES ==============================================================
export const REPLY_CLASSES = [
  "INTERESTED",
  "PRICE_REQUEST",
  "MEETING_REQUEST",
  "QUESTION",
  "POSITIVE",
  "LATER",
  "NOT_INTERESTED",
  "NEGATIVE",
  "OPT_OUT",
  "BOUNCE",
  "NEEDS_HUMAN",
  "UNKNOWN",
] as const;
export type ReplyClass = (typeof REPLY_CLASSES)[number];

export const REPLY_META: Record<ReplyClass, { label: string; badge: string; positive: boolean }> = {
  INTERESTED: { label: "Intéressé", badge: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20", positive: true },
  PRICE_REQUEST: { label: "Demande de prix", badge: "bg-teal-500/10 text-teal-300 ring-teal-400/20", positive: true },
  MEETING_REQUEST: { label: "Rendez-vous", badge: "bg-cyan-500/10 text-cyan-300 ring-cyan-400/20", positive: true },
  QUESTION: { label: "Question", badge: "bg-sky-500/10 text-sky-300 ring-sky-400/20", positive: true },
  LATER: { label: "Plus tard", badge: "bg-indigo-500/10 text-indigo-300 ring-indigo-400/20", positive: false },
  NOT_INTERESTED: { label: "Pas intéressé", badge: "bg-stone-500/10 text-stone-400 ring-stone-400/20", positive: false },
  OPT_OUT: { label: "Opposition", badge: "bg-rose-500/10 text-rose-300 ring-rose-400/20", positive: false },
  BOUNCE: { label: "Rebond", badge: "bg-orange-500/10 text-orange-300 ring-orange-400/20", positive: false },
  POSITIVE: { label: "Ton favorable", badge: "bg-emerald-500/10 text-emerald-200 ring-emerald-400/15", positive: true },
  NEGATIVE: { label: "Ton défavorable", badge: "bg-stone-500/10 text-stone-300 ring-stone-400/20", positive: false },
  NEEDS_HUMAN: { label: "Intervention requise", badge: "bg-amber-500/10 text-amber-300 ring-amber-400/25", positive: false },
  UNKNOWN: { label: "Non classée", badge: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20", positive: false },
};

/**
 * Prochaine action suggeree pour chaque classement.
 *
 * REGLE : l'agent PROPOSE, il n'execute pas. Aucune de ces actions n'est
 * declenchee automatiquement — aucune reponse n'est envoyee sans vous.
 */
export const RECOMMENDED_ACTION: Record<ReplyClass, string> = {
  INTERESTED: "Proposer un appel",
  PRICE_REQUEST: "Envoyer le devis correspondant à l'offre recommandée",
  MEETING_REQUEST: "Proposer un créneau",
  QUESTION: "Préparer une réponse",
  POSITIVE: "Relancer avec une proposition concrète",
  LATER: "Reprogrammer un contact à la date indiquée",
  NOT_INTERESTED: "Arrêter la séquence",
  NEGATIVE: "Arrêter la séquence et relire le message",
  OPT_OUT: "Aucune action — blacklist",
  BOUNCE: "Adresse invalide — retirer du circuit",
  NEEDS_HUMAN: "Intervention humaine requise",
  UNKNOWN: "À lire : le classement automatique n'a rien reconnu",
};

/** Etat de traitement d'une reponse dans le centre de tri. */
export const REVIEW_STATUSES = [
  "NEW", "REVIEWED", "ACTION_REQUIRED", "RESOLVED", "SYSTEM", "UNMATCHED",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_META: Record<ReviewStatus, { label: string; badge: string }> = {
  NEW: { label: "Nouvelle", badge: "bg-sky-500/10 text-sky-300 ring-sky-400/20" },
  REVIEWED: { label: "Lue", badge: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20" },
  ACTION_REQUIRED: { label: "Action requise", badge: "bg-amber-500/10 text-amber-300 ring-amber-400/25" },
  RESOLVED: { label: "Traitée", badge: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20" },
  // Deux etats volontairement distincts de « traitee » : ils ne demandent rien,
  // mais pour des raisons opposees. L'un n'est pas un message, l'autre en est
  // un dont on ignore l'auteur — et celui-la merite un coup d'oeil.
  SYSTEM: { label: "Système", badge: "bg-stone-500/10 text-stone-400 ring-stone-400/20" },
  UNMATCHED: { label: "Non rattachée", badge: "bg-violet-500/10 text-violet-300 ring-violet-400/20" },
};

/** Nature d'un courrier automatique, pour l'affichage. */
export const SYSTEM_KIND_LABEL: Record<string, string> = {
  DMARC_REPORT: "Rapport DMARC",
  BOUNCE: "Avis de non-remise",
  AUTO_REPLY: "Réponse automatique",
  SYSTEM: "Message de service",
};

/** Comment le prospect a ete rattache a une reponse. */
export const MATCHED_BY_LABEL: Record<string, string> = {
  CONTACT: "Adresse enregistrée dans la fiche prospect",
  SEND_LOG: "Adresse à laquelle un email a été envoyé",
  CLIENT: "Adresse de contact d'un client",
  DOMAIN: "Même domaine que le site du prospect",
  MANUAL: "Prospect indiqué à la saisie",
  NONE: "Expéditeur inconnu — aucun prospect rattaché",
};

/**
 * Libelle du rattachement, coherent avec ce qui est reellement affiche.
 *
 * Les reponses enregistrees avant l'ajout du champ `matchedBy` portent la
 * valeur par defaut "NONE" tout en ayant un prospect : on ne les presente pas
 * comme des expediteurs inconnus, ce serait faux.
 */
export function matchedByLabel(matchedBy: string, hasProspect: boolean): string {
  if (!hasProspect) return MATCHED_BY_LABEL.NONE;
  if (matchedBy === "NONE") return "Rattachement enregistré avant le suivi de provenance";
  return MATCHED_BY_LABEL[matchedBy] ?? matchedBy;
}

// === PHASES PROJET =========================================================
export const PROJECT_PHASES = ["ONBOARDING", "CONTENT", "PRODUCTION", "QA", "DELIVERY", "DONE"] as const;
export type ProjectPhase = (typeof PROJECT_PHASES)[number];

export const PHASE_LABEL: Record<string, string> = {
  ONBOARDING: "Onboarding",
  CONTENT: "Contenu",
  PRODUCTION: "Production",
  QA: "Contrôle qualité",
  DELIVERY: "Livraison",
  DONE: "Terminé",
  BLOCKED: "Bloqué",
};

export const TASK_STATUS_META: Record<string, { label: string; badge: string }> = {
  TODO: { label: "À faire", badge: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20" },
  IN_PROGRESS: { label: "En cours", badge: "bg-sky-500/10 text-sky-300 ring-sky-400/20" },
  BLOCKED: { label: "Bloqué", badge: "bg-orange-500/10 text-orange-300 ring-orange-400/20" },
  DONE: { label: "Terminé", badge: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20" },
  SKIPPED: { label: "Ignoré", badge: "bg-stone-500/10 text-stone-400 ring-stone-400/20" },
};

// === AUTONOMIE =============================================================
/**
 * Niveau d'autonomie par type d'action. Modifiable en base (table Setting)
 * sans redeploiement — voir lib/agent/autonomy.ts.
 */
export const DEFAULT_AUTONOMY: Record<string, "AUTOMATIC" | "APPROVAL_REQUIRED"> = {
  "research.search": "AUTOMATIC",
  "research.import": "AUTOMATIC",
  "audit.run": "AUTOMATIC",
  "contact.discover": "AUTOMATIC",
  "scoring.compute": "AUTOMATIC",
  "email.generate": "AUTOMATIC",
  "campaign.create": "AUTOMATIC",
  // Regle absolue : aucun email ne part sans validation humaine explicite.
  "campaign.send": "APPROVAL_REQUIRED",
  "campaign.followup": "APPROVAL_REQUIRED",
  "send.test": "APPROVAL_REQUIRED",
  "replies.classify": "AUTOMATIC",
  // Lecture seule de la boite : rien n'est envoye, rien n'est modifie.
  "replies.sync": "AUTOMATIC",
  "crm.create_client": "AUTOMATIC",
  "project.create": "AUTOMATIC",
  "project.tasks": "AUTOMATIC",
  "project.onboarding_status": "AUTOMATIC",
  "project.advance": "AUTOMATIC",
  "status.report": "AUTOMATIC",
  // Une mission prepare et s'arrete avant l'envoi : rien ne part sans vous.
  "operator.mission": "AUTOMATIC",
  // Un tour d'operateur lit, decide et prepare. Il n'expedie jamais.
  "operator.tick": "AUTOMATIC",
  "prospect.delete": "APPROVAL_REQUIRED",
  "document.sign_contract": "APPROVAL_REQUIRED",
  "payment.charge": "APPROVAL_REQUIRED",
  "payment.refund": "APPROVAL_REQUIRED",
  "delivery.publish": "APPROVAL_REQUIRED",
};
