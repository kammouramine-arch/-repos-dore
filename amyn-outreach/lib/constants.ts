// ---------------------------------------------------------------------------
// Valeurs de reference du domaine AMYN.
// SQLite ne supporte pas les enums Prisma : la source de verite est ici.
// ---------------------------------------------------------------------------

// --- STATUTS PROSPECT -------------------------------------------------------
export const PROSPECT_STATUSES = [
  "FOUND",
  "RESEARCHED",
  "READY",
  "APPROVED",
  "SENT",
  "REPLIED",
  "INTERESTED",
  "NOT_INTERESTED",
  "BOUNCED",
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

type StatusMeta = {
  label: string;
  description: string;
  /** classes Tailwind du badge */
  badge: string;
  /** couleur du point / de la barre */
  dot: string;
};

export const STATUS_META: Record<ProspectStatus, StatusMeta> = {
  FOUND: {
    label: "Trouvé",
    description: "Entreprise identifiée. Aucune vérification effectuée.",
    badge: "bg-zinc-500/10 text-zinc-300 ring-zinc-400/20",
    dot: "bg-zinc-400",
  },
  RESEARCHED: {
    label: "Analysé",
    description: "Site audité, informations vérifiées. Email pas encore confirmé.",
    badge: "bg-sky-500/10 text-sky-300 ring-sky-400/20",
    dot: "bg-sky-400",
  },
  READY: {
    label: "Prêt",
    description: "Email public trouvé, diagnostic complet, message rédigé.",
    badge: "bg-amber-500/10 text-amber-300 ring-amber-400/20",
    dot: "bg-amber-400",
  },
  APPROVED: {
    label: "Approuvé",
    description: "Validé manuellement. Autorisé à partir.",
    badge: "bg-violet-500/10 text-violet-300 ring-violet-400/20",
    dot: "bg-violet-400",
  },
  SENT: {
    label: "Envoyé",
    description: "Email transmis. En attente de réponse.",
    badge: "bg-cyan-500/10 text-cyan-300 ring-cyan-400/20",
    dot: "bg-cyan-400",
  },
  REPLIED: {
    label: "Répondu",
    description: "L'entreprise a répondu.",
    badge: "bg-indigo-500/10 text-indigo-300 ring-indigo-400/20",
    dot: "bg-indigo-400",
  },
  INTERESTED: {
    label: "Intéressé",
    description: "Réponse positive. À relancer commercialement.",
    badge: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
    dot: "bg-emerald-400",
  },
  NOT_INTERESTED: {
    label: "Pas intéressé",
    description: "Refus. Ne plus contacter.",
    badge: "bg-stone-500/10 text-stone-400 ring-stone-400/20",
    dot: "bg-stone-500",
  },
  BOUNCED: {
    label: "Rebond",
    description: "Adresse invalide. Mise en liste noire.",
    badge: "bg-rose-500/10 text-rose-300 ring-rose-400/20",
    dot: "bg-rose-400",
  },
};

/** Les compteurs affichés sur le dashboard, dans l'ordre. */
export const DASHBOARD_STATUSES: ProspectStatus[] = [
  "FOUND",
  "RESEARCHED",
  "READY",
  "APPROVED",
  "SENT",
  "REPLIED",
  "INTERESTED",
  "BOUNCED",
];

export function isProspectStatus(value: string): value is ProspectStatus {
  return (PROSPECT_STATUSES as readonly string[]).includes(value);
}

export function statusMeta(value: string): StatusMeta {
  return isProspectStatus(value) ? STATUS_META[value] : STATUS_META.FOUND;
}

// --- OFFRES AMYN ------------------------------------------------------------
export const OFFERS = {
  ESSENTIAL: {
    key: "ESSENTIAL",
    label: "Essential",
    price: 790,
    unit: "€",
    recurring: false,
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

export function offerMeta(key: string | null | undefined) {
  if (!key) return null;
  return (OFFERS as Record<string, (typeof OFFERS)[OfferKey]>)[key] ?? null;
}

// --- TYPES DE PROBLEMES DETECTABLES (catalogue, utilisé au lot 2) -----------
export const ISSUE_TYPES = {
  NO_WEBSITE: "Aucun site web",
  SITE_UNREACHABLE: "Site inaccessible",
  NO_HTTPS: "Pas de HTTPS",
  NOT_MOBILE_FRIENDLY: "Mauvaise expérience mobile",
  NO_FORM: "Aucun formulaire de contact",
  BROKEN_FORM: "Formulaire cassé",
  NO_BOOKING: "Réservation absente",
  NO_CLICK_TO_CALL: "Pas de bouton d'appel / WhatsApp",
  OUTDATED_SITE: "Site obsolète",
  BROKEN_LINKS: "Liens cassés",
  SLOW_SITE: "Site lent",
  NO_CLEAR_CTA: "Aucun appel à l'action clair",
  WEAK_CONVERSION_PATH: "Parcours de conversion faible",
  GBP_INCOMPLETE: "Fiche Google incomplète",
  GBP_MISSING: "Aucune fiche Google Business",
  STALE_CONTENT: "Contenu obsolète",
} as const;

export type IssueType = keyof typeof ISSUE_TYPES;

export const SEVERITY_META: Record<string, { label: string; badge: string }> = {
  HIGH: { label: "Élevée", badge: "bg-rose-500/10 text-rose-300 ring-rose-400/20" },
  MEDIUM: { label: "Moyenne", badge: "bg-amber-500/10 text-amber-300 ring-amber-400/20" },
  LOW: { label: "Faible", badge: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20" },
};

export const AUDIT_STATUS_META: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "En attente", tone: "text-zinc-400" },
  COMPLETE: { label: "Complet", tone: "text-emerald-400" },
  INCOMPLETE: { label: "Incomplet", tone: "text-amber-400" },
  FAILED: { label: "Échec", tone: "text-rose-400" },
};

export const SOURCE_KIND_LABELS: Record<string, string> = {
  WEBSITE: "Site officiel",
  LEGAL_NOTICE: "Mentions légales",
  GOOGLE_BUSINESS: "Fiche Google Business",
  INSTAGRAM: "Instagram",
  DIRECTORY: "Annuaire",
  MANUAL: "Saisie manuelle",
};
