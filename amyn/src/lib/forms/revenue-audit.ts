/**
 * Demande de Revenue Audit — cinq étapes : l'entreprise, sa taille, sa
 * façon de vendre, là où les opportunités se perdent, le contact.
 *
 * Les réponses fermées sont des identifiants stables (envoyés au serveur,
 * testés) ; leurs libellés existent en français et en anglais. La demande
 * reçue par AMYN est rédigée en français, quelle que soit la langue du
 * visiteur.
 *
 * Mêmes règles dans le navigateur et sur le serveur (module autonome,
 * testé directement par Node).
 */
import {
  EMAIL,
  FORM_LOCALES,
  LIMITS,
  PHONE,
  cleanChoice,
  cleanChoices,
  cleanLine,
  cleanText,
  isWebAddress,
  type Errors,
  type FormLocale,
} from "./shared.ts";

type Labels<T extends string> = Record<T, { fr: string; en: string }>;

const ids = <T extends string>(labels: Labels<T>) => Object.keys(labels) as T[];

/* --- Choix ---------------------------------------------------------------- */

const INDUSTRY_LABELS = {
  construction: { fr: "Construction et rénovation", en: "Construction and renovation" },
  home: { fr: "Amélioration de l'habitat", en: "Home improvement" },
  energy: { fr: "Énergie et solaire", en: "Energy and solar" },
  professional: { fr: "Services professionnels", en: "Professional services" },
  b2b: { fr: "Services B2B", en: "B2B services" },
  recruitment: { fr: "Recrutement", en: "Recruitment" },
  technology: { fr: "Technologie", en: "Technology" },
  realestate: { fr: "Immobilier", en: "Real estate" },
  other: { fr: "Autre secteur", en: "Other sector" },
} as const satisfies Labels<string>;
export type Industry = keyof typeof INDUSTRY_LABELS;
export const INDUSTRIES = ids<Industry>(INDUSTRY_LABELS);

const REVENUE_LABELS = {
  "lt-500k": { fr: "Moins de 500 k€", en: "Under €500k" },
  "500k-2m": { fr: "500 k€ à 2 M€", en: "€500k to €2M" },
  "2m-10m": { fr: "2 à 10 M€", en: "€2M to €10M" },
  "gt-10m": { fr: "Plus de 10 M€", en: "Over €10M" },
  undisclosed: { fr: "Je préfère ne pas le dire", en: "Prefer not to say" },
} as const satisfies Labels<string>;
export type RevenueRange = keyof typeof REVENUE_LABELS;
export const REVENUE_RANGES = ids<RevenueRange>(REVENUE_LABELS);

const TEAM_LABELS = {
  "1-5": { fr: "1 à 5 personnes", en: "1 to 5 people" },
  "6-20": { fr: "6 à 20", en: "6 to 20" },
  "21-50": { fr: "21 à 50", en: "21 to 50" },
  "51-200": { fr: "51 à 200", en: "51 to 200" },
  "200+": { fr: "Plus de 200", en: "Over 200" },
} as const satisfies Labels<string>;
export type TeamSize = keyof typeof TEAM_LABELS;
export const TEAM_SIZES = ids<TeamSize>(TEAM_LABELS);

const LEADS_LABELS = {
  "lt-20": { fr: "Moins de 20", en: "Under 20" },
  "20-50": { fr: "20 à 50", en: "20 to 50" },
  "50-200": { fr: "50 à 200", en: "50 to 200" },
  "200+": { fr: "Plus de 200", en: "Over 200" },
  unknown: { fr: "Je ne sais pas", en: "Not sure" },
} as const satisfies Labels<string>;
export type MonthlyLeads = keyof typeof LEADS_LABELS;
export const MONTHLY_LEADS = ids<MonthlyLeads>(LEADS_LABELS);

const VALUE_LABELS = {
  "lt-2k": { fr: "Moins de 2 000 €", en: "Under €2,000" },
  "2k-10k": { fr: "2 000 à 10 000 €", en: "€2,000 to €10,000" },
  "10k-50k": { fr: "10 000 à 50 000 €", en: "€10,000 to €50,000" },
  "50k+": { fr: "Plus de 50 000 €", en: "Over €50,000" },
} as const satisfies Labels<string>;
export type CustomerValue = keyof typeof VALUE_LABELS;
export const CUSTOMER_VALUES = ids<CustomerValue>(VALUE_LABELS);

const CRM_LABELS = {
  none: { fr: "Aucun CRM", en: "No CRM" },
  spreadsheet: { fr: "Tableur ou fichiers", en: "Spreadsheets or files" },
  market: { fr: "Un CRM du marché", en: "An off-the-shelf CRM" },
  custom: { fr: "Un outil interne", en: "An in-house tool" },
  unknown: { fr: "Je ne sais pas", en: "Not sure" },
} as const satisfies Labels<string>;
export type CrmSetup = keyof typeof CRM_LABELS;
export const CRM_SETUPS = ids<CrmSetup>(CRM_LABELS);

const CHANNEL_LABELS = {
  website: { fr: "Site web", en: "Website" },
  phone: { fr: "Téléphone", en: "Phone" },
  email: { fr: "E-mail", en: "Email" },
  ads: { fr: "Publicité en ligne", en: "Online ads" },
  social: { fr: "Réseaux sociaux", en: "Social media" },
  referrals: { fr: "Recommandations", en: "Referrals" },
  marketplaces: { fr: "Plateformes et annuaires", en: "Marketplaces and directories" },
  events: { fr: "Salons et événements", en: "Trade shows and events" },
  outbound: { fr: "Prospection commerciale", en: "Sales prospecting" },
} as const satisfies Labels<string>;
export type Channel = keyof typeof CHANNEL_LABELS;
export const CHANNELS = ids<Channel>(CHANNEL_LABELS);

const PROBLEM_LABELS = {
  "slow-response": { fr: "Réponse trop lente aux demandes", en: "Slow response to enquiries" },
  "no-qualification": { fr: "Pas de qualification claire", en: "No clear qualification" },
  "follow-up": { fr: "Relances oubliées ou irrégulières", en: "Missed or irregular follow-up" },
  "no-show": { fr: "Rendez-vous non honorés", en: "Missed appointments" },
  proposals: { fr: "Devis envoyés sans suivi", en: "Proposals sent without follow-up" },
  "dormant-leads": { fr: "Anciens contacts jamais recontactés", en: "Old leads never re-engaged" },
  "crm-data": { fr: "CRM incomplet ou pas à jour", en: "Incomplete or outdated CRM" },
  visibility: { fr: "Pas de vue claire du pipeline", en: "No clear view of the pipeline" },
  unknown: { fr: "Je ne sais pas — c'est la question", en: "Not sure — that's the question" },
} as const satisfies Labels<string>;
export type Problem = keyof typeof PROBLEM_LABELS;
export const PROBLEMS = ids<Problem>(PROBLEM_LABELS);

const GROUP_LABELS = {
  industry: INDUSTRY_LABELS,
  revenue: REVENUE_LABELS,
  team: TEAM_LABELS,
  leads: LEADS_LABELS,
  value: VALUE_LABELS,
  crm: CRM_LABELS,
  channels: CHANNEL_LABELS,
  problems: PROBLEM_LABELS,
} as const;
export type AuditChoiceGroup = keyof typeof GROUP_LABELS;

/**
 * Libellé d'un choix. Certains identifiants existent dans plusieurs listes
 * (« 200+ », « unknown ») : on nomme donc la liste.
 */
export function auditLabel(group: AuditChoiceGroup, id: string, locale: FormLocale): string {
  const table = GROUP_LABELS[group] as Record<string, { fr: string; en: string }>;
  return table[id]?.[locale] ?? id;
}

/** Origine de la visite, déclarée par le lien — jamais déduite. */
export const AUDIT_SOURCES = ["site", "outreach"] as const;
export type AuditSource = (typeof AUDIT_SOURCES)[number];

/* --- Valeurs -------------------------------------------------------------- */

export type RevenueAuditValues = {
  company: string;
  website: string;
  industry: Industry | "";
  revenue: RevenueRange | "";
  team: TeamSize | "";
  leads: MonthlyLeads | "";
  value: CustomerValue | "";
  crm: CrmSetup | "";
  /** Facultatif : le nom de l'outil utilisé. */
  crmName: string;
  channels: Channel[];
  problems: Problem[];
  /** Facultatif : précisions sur les pertes constatées. */
  problemDetails: string;
  name: string;
  /** Facultatif : fonction dans l'entreprise. */
  role: string;
  email: string;
  phone: string;
  privacy: boolean;
  source: AuditSource;
  lang: FormLocale;
};

export type RevenueAuditField = Exclude<keyof RevenueAuditValues, "source" | "lang">;

export const EMPTY_REVENUE_AUDIT: RevenueAuditValues = {
  company: "",
  website: "",
  industry: "",
  revenue: "",
  team: "",
  leads: "",
  value: "",
  crm: "",
  crmName: "",
  channels: [],
  problems: [],
  problemDetails: "",
  name: "",
  role: "",
  email: "",
  phone: "",
  privacy: false,
  source: "site",
  lang: "fr",
};

/** Les cinq étapes et les champs que chacune valide. */
export const AUDIT_STEPS: { id: string; fields: RevenueAuditField[] }[] = [
  { id: "company", fields: ["company", "website", "industry"] },
  { id: "business", fields: ["revenue", "team", "leads"] },
  { id: "sales", fields: ["value", "crm", "crmName", "channels"] },
  { id: "problem", fields: ["problems", "problemDetails"] },
  { id: "contact", fields: ["name", "role", "email", "phone", "privacy"] },
];

export const AUDIT_ORDER: RevenueAuditField[] = AUDIT_STEPS.flatMap((s) => s.fields);

export const AUDIT_LIMITS = { crmName: 80, problemDetails: 1500, role: 80 } as const;

export function sanitizeRevenueAudit(raw: Record<string, unknown>): RevenueAuditValues {
  return {
    company: cleanLine(raw.company, LIMITS.company),
    website: cleanLine(raw.website, LIMITS.url),
    industry: cleanChoice(raw.industry, INDUSTRIES),
    revenue: cleanChoice(raw.revenue, REVENUE_RANGES),
    team: cleanChoice(raw.team, TEAM_SIZES),
    leads: cleanChoice(raw.leads, MONTHLY_LEADS),
    value: cleanChoice(raw.value, CUSTOMER_VALUES),
    crm: cleanChoice(raw.crm, CRM_SETUPS),
    crmName: cleanLine(raw.crmName, AUDIT_LIMITS.crmName),
    channels: cleanChoices(raw.channels, CHANNELS),
    problems: cleanChoices(raw.problems, PROBLEMS),
    problemDetails: cleanText(raw.problemDetails, AUDIT_LIMITS.problemDetails),
    name: cleanLine(raw.name, LIMITS.name),
    role: cleanLine(raw.role, AUDIT_LIMITS.role),
    email: cleanLine(raw.email, LIMITS.email).toLowerCase(),
    phone: cleanLine(raw.phone, LIMITS.phone),
    privacy: raw.privacy === true,
    source: cleanChoice(raw.source, AUDIT_SOURCES) || "site",
    lang: cleanChoice(raw.lang, FORM_LOCALES) || "fr",
  };
}

/* --- Validation ----------------------------------------------------------- */

const MESSAGES = {
  fr: {
    company: "Indiquez le nom de votre entreprise.",
    website: "Indiquez l'adresse de votre site (ex. monentreprise.fr).",
    industry: "Choisissez votre secteur.",
    revenue: "Choisissez une tranche de chiffre d'affaires.",
    team: "Choisissez la taille de votre équipe.",
    leads: "Choisissez un volume de demandes mensuel.",
    value: "Choisissez la valeur moyenne d'un client.",
    crm: "Indiquez comment vous suivez vos demandes aujourd'hui.",
    channels: "Choisissez au moins une source de demandes.",
    problems: "Choisissez au moins un point — ou « Je ne sais pas ».",
    name: "Indiquez votre nom.",
    emailMissing: "Indiquez votre adresse e-mail professionnelle.",
    emailInvalid: "Cette adresse e-mail ne semble pas valide.",
    phone: "Ce numéro ne semble pas valide.",
    privacy: "Merci de confirmer avoir pris connaissance de la politique de confidentialité.",
  },
  en: {
    company: "Please enter your company name.",
    website: "Please enter your website address (e.g. mycompany.com).",
    industry: "Please choose your sector.",
    revenue: "Please choose a revenue range.",
    team: "Please choose your team size.",
    leads: "Please choose a monthly enquiry volume.",
    value: "Please choose your average customer value.",
    crm: "Please tell us how you track enquiries today.",
    channels: "Please choose at least one lead source.",
    problems: "Please choose at least one point — or “Not sure”.",
    name: "Please enter your name.",
    emailMissing: "Please enter your work email address.",
    emailInvalid: "This email address doesn't look valid.",
    phone: "This phone number doesn't look valid.",
    privacy: "Please confirm you have read the privacy policy.",
  },
} as const;

export function validateRevenueAudit(v: RevenueAuditValues): Errors<RevenueAuditField> {
  const m = MESSAGES[v.lang] ?? MESSAGES.fr;
  const errors: Record<string, string> = {};
  if (v.company.length < 2) errors.company = m.company;
  if (!isWebAddress(v.website)) errors.website = m.website;
  if (!v.industry) errors.industry = m.industry;
  if (!v.revenue) errors.revenue = m.revenue;
  if (!v.team) errors.team = m.team;
  if (!v.leads) errors.leads = m.leads;
  if (!v.value) errors.value = m.value;
  if (!v.crm) errors.crm = m.crm;
  if (v.channels.length === 0) errors.channels = m.channels;
  if (v.problems.length === 0) errors.problems = m.problems;
  if (v.name.length < 2) errors.name = m.name;
  if (!v.email) errors.email = m.emailMissing;
  else if (!EMAIL.test(v.email)) errors.email = m.emailInvalid;
  if (v.phone && !PHONE.test(v.phone)) errors.phone = m.phone;
  if (!v.privacy) errors.privacy = m.privacy;
  return errors;
}

/** Erreurs d'une seule étape (navigation entre étapes). */
export function validateAuditStep(v: RevenueAuditValues, step: number): Errors<RevenueAuditField> {
  const all = validateRevenueAudit(v);
  const fields = AUDIT_STEPS[step]?.fields ?? [];
  const errors: Errors<RevenueAuditField> = {};
  for (const f of fields) if (all[f]) errors[f] = all[f];
  return errors;
}

/* --- Demande reçue par AMYN (en français) ---------------------------------- */

/** Lignes du message envoyé à AMYN : libellés français, valeurs lisibles. */
export function auditSummaryRows(v: RevenueAuditValues): [string, string][] {
  const fr = (group: AuditChoiceGroup, id: string) => (id ? auditLabel(group, id, "fr") : "—");
  const list = (group: AuditChoiceGroup, items: string[]) =>
    items.length ? items.map((id) => auditLabel(group, id, "fr")).join(", ") : "—";
  return [
    ["Entreprise", v.company],
    ["Site web", v.website],
    ["Secteur", fr("industry", v.industry)],
    ["Chiffre d'affaires", fr("revenue", v.revenue)],
    ["Équipe", fr("team", v.team)],
    ["Demandes par mois", fr("leads", v.leads)],
    ["Valeur moyenne d'un client", fr("value", v.value)],
    ["Suivi des demandes", fr("crm", v.crm) + (v.crmName ? ` (${v.crmName})` : "")],
    ["Sources de demandes", list("channels", v.channels)],
    ["Où les opportunités se perdent", list("problems", v.problems)],
    ["Nom", v.name],
    ["Fonction", v.role || "—"],
    ["E-mail", v.email],
    ["Téléphone", v.phone || "—"],
    ["Origine", v.source === "outreach" ? "Fait suite à un message d'AMYN" : "Site"],
    ["Langue", v.lang === "en" ? "Anglais — répondre en anglais" : "Français"],
  ];
}
