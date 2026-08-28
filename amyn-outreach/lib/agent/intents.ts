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

import { listSectors, resolveSectorOpen, NAF_DIVISIONS } from "@/lib/research/sectors";

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
  "MISSION",
  "WORKER",
  "UNKNOWN",
] as const;
export type Intent = (typeof INTENTS)[number];

export type ParsedInstruction = {
  intent: Intent;
  /** Instruction d'origine, conservee mot pour mot. */
  raw: string;
  parameters: Record<string, unknown>;
  matchedOn: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  explanation: string;
};

const OFFER_PATTERN = /\b(essential|premium|ultimate|care)\b/i;
const COUNT_PATTERN = /\b(\d{1,3})\s*(entreprises?|prospects?|restaurants?|commerces?|salons?|societes?|sociétés?)?\b/i;

/**
 * Extraction de la ville.
 *
 * ATTENTION AU PIEGE : « \b » ne produit PAS de frontiere de mot devant « à »,
 * car « à » n'appartient pas a \w en JavaScript. Un motif commencant par
 * « \b(?:[àa]|...) » ne reconnait donc jamais « à Bordeaux » — seulement
 * « a Bordeaux » sans accent. On ancre sur un debut de chaine ou une espace.
 */
const CITY_PATTERN =
  /(?:^|[\s,])(?:à|a|dans|sur|autour de|pres de|près de|en)\s+(?:la |le |l'|les )?([A-ZÀ-Ý][\wÀ-ÿ'-]*(?:[ -][A-ZÀ-Ýa-zà-ÿ][\wÀ-ÿ'-]*){0,3})/;

/**
 * Mots qui suivent parfois « à » ou « dans » sans designer une ville.
 * On les ecarte plutot que de retenir une fausse localite.
 */
const NON_VILLES = new Set([
  "partir", "nouveau", "jour", "cette", "ce", "chaque", "tous", "toute", "toutes",
  "condition", "distance", "domicile", "propos", "compter", "priori", "peu",
  "france", "paris-region",
]);

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
    // « Fais un tour » : lancer les jobs de l'operateur.
    intent: "WORKER",
    priority: 1.5,
    patterns: [
      /(fais|lance|ex[ée]cute) (un |le |)tour/i,
      /(lance|d[ée]marre) (l'|le |les |)(op[ée]rateur|jobs?|worker)/i,
      /au (boulot|travail)/i,
      /\bfais ton travail\b/i,
    ],
  },
  {
    // « Prospecte les coiffeurs de Lille » : une mission complete, pas une
    // simple recherche. Prioritaire sur SEARCH.
    intent: "MISSION",
    priority: 1.8,
    patterns: [
      /\bprospecte\b/i,
      /mission (de |)prospection/i,
      /campagne compl[èe]te/i,
      /(occupe|charge)[- ]toi (de|des|du)\b/i,
      /trouve[- ]?(moi |nous |)des? (entreprises?|soci[ée]t[ée]s?|clients?|prospects?)/i,
      /qui (pourrai(en)?t|aurai(en)?t) (avoir |)besoin/i,
      /(ont|auraient) besoin d'un (nouveau |)site/i,
    ],
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
  if (!match) return undefined;

  const ville = match[1].trim().replace(/\s+/g, " ");
  // Un mot courant derriere « à » n'est pas une ville : on prefere ne rien
  // retenir plutot que d'inventer une localite.
  if (NON_VILLES.has(ville.toLowerCase())) return undefined;
  if (ville.length < 2) return undefined;

  return ville;
}

/**
 * Vocabulaire des secteurs, DERIVE du module secteurs.
 *
 * Il n'y a volontairement aucune liste en dur ici : ajouter un metier dans
 * SECTORS ou une division dans NAF_DIVISIONS le rend immediatement
 * reconnaissable dans une instruction, sans toucher a l'analyseur.
 *
 * Les termes les plus longs passent en premier : « salle de sport » doit
 * l'emporter sur « sport ».
 */
let VOCABULAIRE_SECTEURS: string[] | null = null;

function vocabulaireSecteurs(): string[] {
  if (VOCABULAIRE_SECTEURS) return VOCABULAIRE_SECTEURS;

  const termes = new Set<string>();
  for (const secteur of listSectors()) {
    termes.add(secteur.key.replace(/_/g, " "));
    for (const alias of secteur.aliases) termes.add(alias);
  }
  for (const division of NAF_DIVISIONS) {
    for (const mot of division.keywords) termes.add(mot);
  }

  VOCABULAIRE_SECTEURS = [...termes]
    .filter((t) => t.length >= 4)
    .sort((a, b) => b.length - a.length);
  return VOCABULAIRE_SECTEURS;
}

/** Enleve les accents pour comparer « électricien » et « electricien ». */
function sansAccents(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function extractSectors(text: string): string[] {
  const cible = sansAccents(text);
  const trouves: string[] = [];

  const clesVues = new Set<string>();

  for (const terme of vocabulaireSecteurs()) {
    const t = sansAccents(terme);
    if (!cible.includes(t)) continue;
    // Un terme deja couvert par un plus long n'apporte rien :
    // « salle de sport » rend « sport » redondant.
    if (trouves.some((deja) => sansAccents(deja).includes(t))) continue;

    // Deux alias du meme secteur ne doivent pas produire deux recherches :
    // « agence » et « immobiliere » designent la meme cible.
    const resolu = resolveSectorOpen(terme);
    if (resolu.kind !== "UNKNOWN") {
      if (clesVues.has(resolu.key)) continue;
      clesVues.add(resolu.key);
    }
    trouves.push(terme);
  }

  return trouves;
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
      raw: text,
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
    raw: text,
    matchedOn: best.signals,
    confidence: best.signals.length >= 2 ? "HIGH" : distinct.size > 2 ? "LOW" : "MEDIUM",
    explanation: `Intention ${best.intent} reconnue sur : ${best.signals.map((s) => `« ${s} »`).join(", ")}.${
      Object.keys(parameters).length ? ` Paramètres extraits : ${JSON.stringify(parameters)}.` : ""
    }`,
  };
}
