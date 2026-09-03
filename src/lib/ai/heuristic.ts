/**
 * Moteur local de préparation de devis.
 *
 * Il fonctionne sans fournisseur d'IA externe : rapprochement avec le catalogue
 * de l'entreprise, extraction des quantités et de la durée, formulation des
 * questions manquantes. C'est le mode dégradé assumé de DEVISIA — l'interface
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
}

/** Équipements dont le chiffrage exige une caractéristique précise. */
const EQUIPMENT_REQUIREMENTS: { pattern: RegExp; question: string }[] = [
  { pattern: /chaudiere/, question: "Quelle est la marque, le modèle et la puissance de la chaudière ?" },
  { pattern: /pompe a chaleur|\bpac\b/, question: 'Quelle puissance et quel type de pompe à chaleur (air/eau, air/air) ?' },
  { pattern: /chauffe[- ]eau|ballon/, question: "Quelle capacité de chauffe-eau (en litres) et quelle énergie ?" },
  { pattern: /climatisation|clim\b|split/, question: 'Combien de splits et quelle surface à climatiser ?' },
  { pattern: /tableau electrique|disjoncteur/, question: 'Quel est le nombre de circuits à reprendre sur le tableau ?' },
  { pattern: /velux|fenetre|porte/, question: 'Quelles sont les dimensions et le matériau des menuiseries ?' },
  { pattern: /toiture|couverture|tuile/, question: 'Quelle surface de toiture et quel type de tuiles ?' },
  { pattern: /peinture|peindre/, question: 'Quelle surface à peindre et combien de couches prévues ?' },
  { pattern: /carrelage|parquet|sol/, question: 'Quelle surface au sol en m² ?' },
  { pattern: /isolation|isoler/, question: "Quelle surface à isoler et quel type d'isolant ?" },
];

const NON_INCLUS = "Les éventuels travaux non décrits (reprise de maçonnerie, peinture, raccordements complémentaires) ne sont pas inclus.";

export function buildHeuristicQuoteDraft(input: HeuristicInput): QuoteDraft {
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
      designation: "Main-d'œuvre",
      description: "Intervention sur site, temps estimé d'après votre description.",
      heures: hours,
      tauxHoraire: centsToEuros(input.hourlyRateCents),
      referenceCatalogue: null,
    });
  }

  const questions: string[] = [];
  for (const requirement of EQUIPMENT_REQUIREMENTS) {
    if (requirement.pattern.test(normalized)) questions.push(requirement.question);
  }
  if (!durationMinutes) {
    questions.push("Combien de temps d'intervention faut-il prévoir ?");
  }
  if (materiaux.length === 0) {
    questions.push('Quelles fournitures faut-il prévoir pour ce chantier ?');
  }

  const alertes: string[] = [
    'Devis préparé automatiquement : vérifiez les quantités et les prix avant envoi.',
    NON_INCLUS,
  ];
  if (matches.length === 0) {
    alertes.unshift(
      "Aucun article de votre catalogue n'a été reconnu dans cette description : les lignes sont à compléter manuellement.",
    );
  }

  const descriptionTravaux = splitTasks(input.description);

  return {
    titre: buildTitle(input.description, input.trade),
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
        : "Durée d'intervention estimée à défaut d'indication : à confirmer.",
      matches.length > 0
        ? 'Quantités déduites de votre description : vérifiez-les avant envoi.'
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
function buildTitle(description: string, trade?: string | null): string {
  const first = description
    .split(/[.\n!?;]|,\s*(?:puis|ensuite|et)\s+/i)
    .map((part) => part.trim())
    .find((part) => part.length > 8);
  if (!first) return trade ? `Intervention ${tradeLabel(trade)}` : 'Intervention';
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

export function tradeLabel(trade: string): string {
  return TRADE_LABELS[trade] ?? '';
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
}): { objet: string; message: string } {
  const politeName = params.customerName.trim() || 'Madame, Monsieur';
  const amount = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
    centsToEuros(params.totalCents),
  );
  const signature = params.signature?.trim() || params.companyName;

  const bodies = [
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
  const subjects = [
    `Votre devis ${params.quoteNumber} — ${params.companyName}`,
    `Devis ${params.quoteNumber} : avez-vous des questions ?`,
    `Dernier point sur votre devis ${params.quoteNumber}`,
  ];

  return { objet: subjects[index]!, message: bodies[index]! };
}
