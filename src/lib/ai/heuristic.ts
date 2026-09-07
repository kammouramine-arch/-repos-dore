/**
 * Moteur local de préparation de devis.
 *
 * Il fonctionne sans fournisseur d'IA externe : rapprochement avec le catalogue
 * de l'entreprise, extraction des quantités et de la durée, formulation des
 * questions manquantes. C'est le mode dégradé assumé de DEVISERA — l'interface
 * l'indique clairement à l'utilisateur.
 */
import { centsToEuros } from '../money';
import { matchCatalog, type CatalogEntry } from './catalog-match';
import { extractDurationMinutes, normalize } from './text';
import type { QuoteDraft } from './schemas';

export interface HeuristicInput {
  description: string;
  catalog: CatalogEntry[];
  hourlyRateCents: number;
  defaultVatRate: number;
  trade?: string | null;
  imageObservations?: string[];
  /** Preferred output language for generated customer-facing copy. */
  language?: 'fr' | 'en';
}

/** Équipements dont le chiffrage exige une caractéristique précise. */
const EQUIPMENT_REQUIREMENTS: { pattern: RegExp; fr: string; en: string }[] = [
  { pattern: /chaudiere/, fr: "Quelle est la marque, le modèle et la puissance de la chaudière ?", en: 'What are the boiler brand, model and power rating?' },
  { pattern: /pompe a chaleur|\bpac\b/, fr: 'Quelle puissance et quel type de pompe à chaleur (air/eau, air/air) ?', en: 'What power rating and type of heat pump (air-to-water or air-to-air)?' },
  { pattern: /chauffe[- ]eau|ballon/, fr: "Quelle capacité de chauffe-eau (en litres) et quelle énergie ?", en: 'What water-heater capacity (litres) and energy source?' },
  { pattern: /climatisation|clim\b|split/, fr: 'Combien de splits et quelle surface à climatiser ?', en: 'How many split units and what area needs cooling?' },
  { pattern: /tableau electrique|disjoncteur/, fr: 'Quel est le nombre de circuits à reprendre sur le tableau ?', en: 'How many circuits need work in the electrical panel?' },
  { pattern: /velux|fenetre|porte/, fr: 'Quelles sont les dimensions et le matériau des menuiseries ?', en: 'What are the dimensions and material of the windows or doors?' },
  { pattern: /toiture|couverture|tuile/, fr: 'Quelle surface de toiture et quel type de tuiles ?', en: 'What roof area and tile type are involved?' },
  { pattern: /peinture|peindre/, fr: 'Quelle surface à peindre et combien de couches prévues ?', en: 'What area will be painted and how many coats are planned?' },
  { pattern: /carrelage|parquet|sol/, fr: 'Quelle surface au sol en m² ?', en: 'What floor area in square metres?' },
  { pattern: /isolation|isoler/, fr: "Quelle surface à isoler et quel type d'isolant ?", en: 'What area needs insulation and which insulation type?' },
];

const NON_INCLUS = "Les éventuels travaux non décrits (reprise de maçonnerie, peinture, raccordements complémentaires) ne sont pas inclus.";
const NON_INCLUDED_EN = 'Work not described (masonry repairs, painting or additional connections) is not included.';

export function buildHeuristicQuoteDraft(input: HeuristicInput): QuoteDraft {
  const english = input.language === 'en';
  const source = [input.description, ...(input.imageObservations ?? [])].filter(Boolean).join('. ');
  const normalized = normalize(source);
  const matches = matchCatalog(source, input.catalog, { limit: 8 });

  const materiaux: QuoteDraft['materiaux'] = [];
  const mainOeuvre: QuoteDraft['mainOeuvre'] = [];

  for (const match of matches) {
    if (match.entry.category === 'MAIN_OEUVRE') {
      const hours = match.quantityExplicit ? match.quantity : 1;
      mainOeuvre.push({
        designation: match.entry.name,
        description: match.entry.description ?? null,
        heures: hours,
        tauxHoraire: centsToEuros(match.entry.salePriceCents),
        referenceCatalogue: match.entry.reference,
      });
      continue;
    }
    materiaux.push({
      designation: match.entry.name,
      description: match.entry.description ?? null,
      quantite: match.quantity,
      unite: match.entry.unit,
      prixUnitaireHT: centsToEuros(match.entry.salePriceCents),
      referenceCatalogue: match.entry.reference,
      tauxTVA: match.entry.vatRate,
    });
  }

  const durationMinutes = extractDurationMinutes(source);
  if (mainOeuvre.length === 0) {
    const hours = durationMinutes ? Math.round((durationMinutes / 60) * 100) / 100 : 1;
    mainOeuvre.push({
      designation: english ? 'Labour' : "Main-d'œuvre",
      description: english ? 'On-site work; time estimated from your description.' : "Intervention sur site, temps estimé d'après votre description.",
      heures: hours,
      tauxHoraire: centsToEuros(input.hourlyRateCents),
      referenceCatalogue: null,
    });
  }

  const questions: string[] = [];
  for (const requirement of EQUIPMENT_REQUIREMENTS) {
    if (requirement.pattern.test(normalized)) questions.push(english ? requirement.en : requirement.fr);
  }
  if (!durationMinutes) {
    questions.push(english ? 'How long should the intervention take?' : "Combien de temps d'intervention faut-il prévoir ?");
  }
  if (materiaux.length === 0) {
    questions.push(english ? 'Which materials should be included for this job?' : 'Quelles fournitures faut-il prévoir pour ce chantier ?');
  }

  const alertes: string[] = [
    english ? 'Quote prepared automatically: check quantities and prices before sending.' : 'Devis préparé automatiquement : vérifiez les quantités et les prix avant envoi.',
    english ? NON_INCLUDED_EN : NON_INCLUS,
  ];
  if (matches.length === 0) {
    alertes.unshift(
      english ? 'No catalogue item matched this description: complete the lines manually.' : "Aucun article de votre catalogue n'a été reconnu dans cette description : les lignes sont à compléter manuellement.",
    );
  }

  const descriptionTravaux = splitTasks(input.description);

  return {
    titre: buildTitle(input.description, input.trade, input.language),
    resume: buildSummary(input.description),
    descriptionTravaux,
    materiaux,
    mainOeuvre,
    questions: dedupe(questions).slice(0, 6),
    alertes: dedupe(alertes).slice(0, 5),
    observations: dedupe(descriptionTravaux).slice(0, 6),
    hypotheses: dedupe([
      durationMinutes
        ? null
        : (english ? 'Intervention duration was estimated because none was provided: please confirm.' : "Durée d'intervention estimée à défaut d'indication : à confirmer."),
      matches.length > 0
        ? (english ? 'Quantities inferred from your description: check them before sending.' : 'Quantités déduites de votre description : vérifiez-les avant envoi.')
        : null,
    ].filter((item): item is string => item != null)).slice(0, 5),
    dureeEstimeeMinutes: durationMinutes,
    confiance: confidenceScore({
      matched: matches.length,
      hasDuration: durationMinutes != null,
      descriptionLength: input.description.trim().length,
      openQuestions: questions.length,
    }),
  };
}

/**
 * Objet du devis.
 *
 * L'objet reprenait la première phrase entière : sur un devis dicté d'un seul
 * trait, il recopiait toute la description et l'écran affichait deux fois le
 * même texte. On s'arrête donc à la première proposition, coupée sur un mot.
 */
function buildTitle(description: string, trade?: string | null, language: 'fr' | 'en' = 'fr'): string {
  const first = description
    .split(/[.\n!?;]|,\s*(?:puis|ensuite|et)\s+/i)
    .map((part) => part.trim())
    .find((part) => part.length > 8);
  if (!first) return trade
    ? (language === 'en' ? `${tradeLabel(trade, language)} service` : `Intervention ${tradeLabel(trade, language)}`)
    : (language === 'en' ? 'Service' : 'Intervention');
  const cleaned = first
    .replace(/^(le client|la cliente|il faut|je dois)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return capitalize(shorten(cleaned, 62));
}

/** Coupe sur un mot, jamais au milieu. */
function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trim()}…`;
}

function buildSummary(description: string): string {
  const cleaned = description.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= 320) return capitalize(cleaned);
  return `${capitalize(cleaned.slice(0, 317))}…`;
}

function splitTasks(description: string): string[] {
  return description
    .split(/[.;\n]|,\s*(?:puis|ensuite|et)\s+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 10)
    .slice(0, 8)
    .map(capitalize);
}

function confidenceScore(signals: {
  matched: number;
  hasDuration: boolean;
  descriptionLength: number;
  openQuestions: number;
}): number {
  let score = 30;
  score += Math.min(signals.matched, 4) * 8;
  if (signals.hasDuration) score += 12;
  if (signals.descriptionLength > 120) score += 10;
  if (signals.descriptionLength > 320) score += 5;
  score -= Math.min(signals.openQuestions, 4) * 5;
  return Math.max(10, Math.min(85, score));
}

function capitalize(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed[0]!.toUpperCase() + trimmed.slice(1) : trimmed;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

const TRADE_LABELS: Record<string, string> = {
  PLOMBIER: 'plomberie',
  ELECTRICIEN: 'électricité',
  CHAUFFAGISTE: 'chauffage',
  CLIMATICIEN: 'climatisation',
  PEINTRE: 'peinture',
  COUVREUR: 'couverture',
  MENUISIER: 'menuiserie',
  MACON: 'maçonnerie',
  PAYSAGISTE: 'paysage',
  RENOVATION: 'rénovation',
  NETTOYAGE: 'nettoyage',
  DEPANNAGE: 'dépannage',
  AUTRE: '',
};

const TRADE_LABELS_EN: Record<string, string> = {
  PLOMBIER: 'plumbing', ELECTRICIEN: 'electrical', CHAUFFAGISTE: 'heating', CLIMATICIEN: 'air conditioning',
  PEINTRE: 'painting', COUVREUR: 'roofing', MENUISIER: 'joinery', MACON: 'masonry', PAYSAGISTE: 'landscaping',
  RENOVATION: 'renovation', NETTOYAGE: 'cleaning', DEPANNAGE: 'repairs', AUTRE: '',
};

export function tradeLabel(trade: string, language: 'fr' | 'en' = 'fr'): string {
  return (language === 'en' ? TRADE_LABELS_EN : TRADE_LABELS)[trade] ?? '';
}

/**
 * Message de relance rédigé sans IA : gabarits professionnels français,
 * personnalisés avec les données réelles du devis.
 */
export function buildTemplateFollowUp(params: {
  customerName: string;
  quoteNumber: string;
  quoteTitle: string;
  totalCents: number;
  attempt: number;
  viewed: boolean;
  companyName: string;
  signature?: string | null;
  language?: string;
  country?: string;
  currency?: string;
}): { objet: string; message: string } {
  const politeName = params.customerName.trim() || 'Madame, Monsieur';
  const english = params.language === 'en';
  const amount = new Intl.NumberFormat(english ? (params.country === 'US' ? 'en-US' : 'en-GB') : 'fr-FR', { style: 'currency', currency: params.currency ?? (params.country === 'GB' ? 'GBP' : params.country === 'US' ? 'USD' : 'EUR') }).format(
    centsToEuros(params.totalCents),
  );
  const signature = params.signature?.trim() || params.companyName;

  const bodies = english ? [
    `Hello ${politeName},\n\nI’m following up regarding quote ${params.quoteNumber}, “${params.quoteTitle}”, for ${amount}.\n\n${params.viewed ? 'Please let me know if you would like any point clarified or adjusted.' : 'I wanted to make sure it reached you.'}\n\nI remain available to discuss it.\n\nKind regards,\n${signature}`,
    `Hello ${politeName},\n\nQuote ${params.quoteNumber}, “${params.quoteTitle}”, is still awaiting your reply.\n\nIf the schedule or budget needs adjusting, we can review the proposal together.\n\nKind regards,\n${signature}`,
    `Hello ${politeName},\n\nI’m closing pending requests soon and wanted to check in about quote ${params.quoteNumber}, “${params.quoteTitle}”.\n\nIf the project is postponed, please contact me whenever convenient.\n\nKind regards,\n${signature}`,
  ] : [
    `Bonjour ${politeName},

Je me permets de revenir vers vous concernant le devis ${params.quoteNumber} « ${params.quoteTitle} », d'un montant de ${amount} TTC.

${params.viewed ? "Vous avez pu en prendre connaissance : n'hésitez pas à me dire si un point mérite d'être précisé ou ajusté." : "Je souhaitais m'assurer qu'il vous est bien parvenu."}

Je reste à votre disposition pour en discuter.

Bien cordialement,
${signature}`,
    `Bonjour ${politeName},

Sauf erreur de ma part, le devis ${params.quoteNumber} « ${params.quoteTitle} » est toujours en attente de votre retour.

Si le planning ou le budget doivent être adaptés, dites-le moi : nous pouvons revoir la proposition ensemble.

Bien cordialement,
${signature}`,
    `Bonjour ${politeName},

Je clôture prochainement les demandes en attente et je souhaitais faire un dernier point sur le devis ${params.quoteNumber} « ${params.quoteTitle} ».

Si le projet est reporté, ce n'est pas un souci : recontactez-moi quand vous le souhaitez, le devis pourra être réactualisé.

Bien cordialement,
${signature}`,
  ];

  const index = Math.min(Math.max(params.attempt, 1), bodies.length) - 1;
  const subjects = english ? [
    `Your quote ${params.quoteNumber} — ${params.companyName}`,
    `Quote ${params.quoteNumber}: do you have any questions?`,
    `One last point about quote ${params.quoteNumber}`,
  ] : [
    `Votre devis ${params.quoteNumber} — ${params.companyName}`,
    `Devis ${params.quoteNumber} : avez-vous des questions ?`,
    `Dernier point sur votre devis ${params.quoteNumber}`,
  ];

  return { objet: subjects[index]!, message: bodies[index]! };
}
