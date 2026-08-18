// ---------------------------------------------------------------------------
// RECONNAISSANCE D'INTENTION
//
// Deterministe : des motifs explicites, sans appel externe. Chaque intention
// reconnue indique QUELS motifs l'ont declenchee — on peut toujours expliquer
// pourquoi l'agent a compris ce qu'il a compris.
//
// Si rien ne correspond, l'intention est UNKNOWN : l'agent demande, il ne
// devine pas.
// ---------------------------------------------------------------------------

export const INTENTS = [
  "SEARCH",
  "AUDIT",
  "CONTACT",
  "SCORE",
  "DRAFT",
  "CAMPAIGN",
  "SEND",
  "FOLLOWUP",
  "REPLY",
  "SYNC_REPLIES",
  "NEW_CLIENT",
  "ONBOARDING",
  "PROJECT",
  "STATUS",
  "TEST_EMAIL",
  "PIPELINE",
  "UNKNOWN",
] as const;
export type Intent = (typeof INTENTS)[number];

export type ParsedInstruction = {
  intent: Intent;
  parameters: Record<string, unknown>;
  matchedOn: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  explanation: string;
};

const OFFER_PATTERN = /\b(essential|premium|ultimate|care)\b/i;
const COUNT_PATTERN = /\b(\d{1,3})\s*(entreprises?|prospects?|restaurants?|commerces?|salons?|societes?|sociétés?)?\b/i;

const CITY_PATTERN =
  /\b(?:[àa]|dans|sur|autour de|pres de|près de)\s+([A-ZÀ-Ý][\wÀ-ÿ' -]{2,30}?)(?=\s*(?:,|\.|$|\bdans\b|\bpour\b|\bet\b|\bavec\b))/;

const RULES: Array<{ intent: Intent; priority: number; patterns: RegExp[] }> = [
  {
    intent: "NEW_CLIENT",
    priority: 0,
    patterns: [
      /nouveau client/i,
      /devenu client/i,
      /a (accept[ée]|sign[ée]|valid[ée])/i,
      /prends? le relais/i,
      /client (accept[ée]|sign[ée])/i,
      /passe (en |)client/i,
    ],
  },
  {
    intent: "TEST_EMAIL",
    priority: 1,
    patterns: [/(email|mail|envoi) (de )?test/i, /teste? l'envoi/i, /envoie(-| )moi un test/i],
  },
  {
    // Prioritaire sur REPLY : « vérifie les réponses » demande de LIRE la
    // boite, pas de classer une reponse fournie a la main.
    intent: "SYNC_REPLIES",
    priority: 2,
    patterns: [
      /(v[ée]rifie|regarde|consulte|rel[èe]ve|synchronise|check)\s+(les? |mes |la |)(nouvelles? |)(r[ée]ponses?|mails?|emails?|messages?|bo[îi]te)/i,
      /(nouvelles?|nouveaux)\s+(r[ée]ponses?|messages?|mails?)/i,
      /(rel[èe]ve|releve) (du |le |)(courrier|courriel)/i,
      /qui (m'|nous |)a r[ée]pondu/i,
      /y a[- ]t[- ]il des r[ée]ponses/i,
      /sync[- ]?replies/i,
    ],
  },
  {
    intent: "REPLY",
    priority: 3,
    patterns: [
      /voici une r[ée]ponse/i,
      /(il|elle|le prospect|le client) a r[ée]pondu/i,
      /traite (cette |la |)r[ée]ponse/i,
      /classe (cette |la |)r[ée]ponse/i,
    ],
  },
  {
    intent: "ONBOARDING",
    priority: 4,
    patterns: [
      /onboarding/i,
      /(a |)envoy[ée] (son|ses|le|les) (logo|photos?|informations?|textes?)/i,
      /informations? (du |de la |)client/i,
      /qu'est[- ]ce qu'il manque/i,
    ],
  },
  {
    intent: "PROJECT",
    priority: 5,
    patterns: [
      /(le |)projet est (termin[ée]|fini|pr[êe]t)/i,
      /pr[ée]pare (la |)livraison/i,
      /avance (le |)projet/i,
      /o[uù] en est (le |)projet/i,
      /(demande|modification) du client/i,
    ],
  },
  {
    intent: "PIPELINE",
    priority: 6,
    patterns: [
      /trouve.{0,40}(analyse|audit).{0,60}(email|mail|campagne)/i,
      /(fais|lance) tout/i,
      /cha[îi]ne compl[èe]te/i,
      /de bout en bout/i,
      /pr[ée]pare une campagne (compl[èe]te|de)/i,
    ],
  },
  {
    // Prioritaire sur SEARCH : « cherche les emails » n'est pas une recherche
    // d'entreprises mais une recherche de contacts.
    intent: "CONTACT",
    priority: 7,
    patterns: [
      /(trouve|cherche|r[ée]cup[èe]re|collecte)\s+(-?\s*(moi|nous)\s+)?(les?\s+|leurs?\s+|des\s+)?(emails?|mails?|adresses?(\s+mail)?|coordonn[ée]es|contacts?)/i,
      /emails? professionnels?/i,
      /adresses? de contact/i,
    ],
  },
  {
    intent: "SEARCH",
    priority: 8,
    patterns: [
      /trouve(-| )(moi |nous |)/i,
      /cherche(-| )(moi |nous |)/i,
      /recherche (des|de|\d)/i,
      /liste(-| )(moi |nous |)(des|les|\d)/i,
      /importe/i,
    ],
  },
  {
    intent: "AUDIT",
    priority: 9,
    patterns: [/audite/i, /analyse (ces|les|le|la|\d)/i, /lance (un |l'|les |)audits?/i, /diagnostic/i],
  },

  {
    intent: "SCORE",
    priority: 10,
    patterns: [/score/i, /note (les|ces|ce)/i, /classe (les|ces) prospects?/i, /priorise/i],
  },
  {
    intent: "DRAFT",
    priority: 11,
    patterns: [
      /(r[ée]dige|[ée]cris|g[ée]n[èe]re|pr[ée]pare) (les? |des? |)(emails?|mails?|messages?)/i,
      /brouillons?/i,
    ],
  },
  {
    intent: "FOLLOWUP",
    priority: 12,
    patterns: [/relance/i, /follow[- ]?up/i, /reviens vers/i],
  },
  {
    intent: "CAMPAIGN",
    priority: 13,
    patterns: [/campagne/i, /(cr[ée]e|lance) une? (campagne|s[ée]quence)/i],
  },
  {
    intent: "SEND",
    priority: 14,
    patterns: [/envoie/i, /envoyer? les/i, /expedie/i, /approve & send/i, /approuve et envoie/i],
  },
  {
    intent: "STATUS",
    priority: 15,
    patterns: [
      /(o[uù] en (est|sommes)|[ée]tat|statut|situation|r[ée]sum[ée]|bilan)/i,
      /fais (le |un )point/i,
      /fais(-| )moi (le |un )point/i,
      /tableau de bord/i,
      /qu'est[- ]ce qui (se passe|s'est pass[ée])/i,
      /combien de/i,
      /montre(-| )moi/i,
    ],
  },
];

function extractCity(text: string): string | undefined {
  const match = CITY_PATTERN.exec(text);
  if (match) return match[1].trim().replace(/\s+/g, " ");
  // Villes frequentes de la metropole lilloise, citees sans preposition.
  const known = /\b(Lille|Roubaix|Tourcoing|Villeneuve-d'Ascq|Marcq-en-Baroeul|Lambersart|Wasquehal|Croix|Hem|Wattrelos|Armentières|Seclin)\b/i;
  const direct = known.exec(text);
  return direct ? direct[1] : undefined;
}

function extractSectors(text: string): string[] {
  const sectors: string[] = [];
  const KEYWORDS = [
    "coiffeur", "coiffure", "barbier", "institut", "beaute", "beauté", "esthetique",
    "restaurant", "brasserie", "traiteur", "boulangerie", "patisserie", "pâtisserie",
    "fleuriste", "garage", "toiletteur", "menuisier", "menuiserie", "artisan",
    "plombier", "electricien", "électricien", "coach", "salle de sport", "fitness",
    "photographe", "opticien",
  ];
  const lower = text.toLowerCase();
  for (const kw of KEYWORDS) {
    if (lower.includes(kw)) sectors.push(kw);
  }
  return [...new Set(sectors)];
}

export function parseInstruction(instruction: string): ParsedInstruction {
  const text = instruction.trim();
  const matched: Array<{ intent: Intent; priority: number; signals: string[] }> = [];

  for (const rule of RULES) {
    const signals: string[] = [];
    for (const pattern of rule.patterns) {
      const m = pattern.exec(text);
      if (m) signals.push(m[0].trim());
    }
    if (signals.length > 0) matched.push({ intent: rule.intent, priority: rule.priority, signals });
  }

  const parameters: Record<string, unknown> = {};

  const city = extractCity(text);
  if (city) parameters.city = city;

  const sectors = extractSectors(text);
  if (sectors.length > 0) parameters.sectors = sectors;

  const count = COUNT_PATTERN.exec(text);
  if (count) parameters.limit = Math.min(Number(count[1]), 200);

  const offer = OFFER_PATTERN.exec(text);
  if (offer) parameters.offer = offer[1].toUpperCase();

  // Le nom s'arrete au premier separateur ou au mot-cle suivant : on ne veut
  // pas avaler « Offre : PREMIUM. Prends le relais. » dans le nom du client.
  const COMPANY_RE =
    /(?:entreprise|client|societe|société)\s*:\s*(.+?)(?=\s*(?:[.,;\n]|$|\b(?:offre|email|mail|adresse|contact|ville|secteur|budget|t[ée]l[ée]phone)\b\s*:))/i;
  const company = COMPANY_RE.exec(text);
  if (company) {
    const name = company[1].trim().replace(/[.,;\s]+$/, "");
    if (name.length > 0) parameters.companyName = name;
  }

  const email = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.exec(text);
  if (email) parameters.email = email[0];

  if (matched.length === 0) {
    return {
      intent: "UNKNOWN",
      parameters,
      matchedOn: [],
      confidence: "LOW",
      explanation:
        "Aucune intention reconnue dans cette instruction. L'agent ne devine pas : reformulez ou utilisez une commande explicite.",
    };
  }

  matched.sort((a, b) => a.priority - b.priority);
  const best = matched[0];
  const distinct = new Set(matched.map((m) => m.intent));

  return {
    intent: best.intent,
    parameters,
    matchedOn: best.signals,
    confidence: best.signals.length >= 2 ? "HIGH" : distinct.size > 2 ? "LOW" : "MEDIUM",
    explanation: `Intention ${best.intent} reconnue sur : ${best.signals.map((s) => `« ${s} »`).join(", ")}.${
      Object.keys(parameters).length ? ` Paramètres extraits : ${JSON.stringify(parameters)}.` : ""
    }`,
  };
}
