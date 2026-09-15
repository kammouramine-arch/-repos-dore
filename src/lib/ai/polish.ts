/**
 * Mise au propre d'un projet de devis, quelle que soit sa provenance.
 *
 * Une seule source de vérité par notion :
 *  - `titre`  = l'objet du devis, une formule nominale courte et professionnelle ;
 *  - lignes   = le détail réel des prestations (Désignation) ;
 *  - `resume` = une phrase facultative qui n'existe que si elle apporte quelque
 *               chose que les lignes ne disent pas — jamais l'écho de la dictée.
 *
 * La description brute reste un contexte de création : elle n'est jamais
 * reproduite telle quelle sur le document remis au client.
 */
import { normalize, uniqueTokens, overlapScore } from './text';
import type { QuoteDraft } from './schemas';

type Language = 'fr' | 'en';

/** Tournures orales ou impératives que l'on retire en tête d'objet. */
const CONVERSATIONAL_PREFIX = /^(?:(?:bonjour|alors|donc|voilà|voila|euh|bon)\s*,?\s*)*(?:(?:le|la|les|mon|ma|mes)\s+(?:client|cliente|clients)\s+(?:veut|veulent|voudrait|souhaite|souhaiterait|demande|aimerait)\s+(?:que\s+(?:je|l'on|on)\s+)?|j['’]ai\s+(?:une?|des|le|la)?\s*|il\s+y\s+a\s+(?:une?|des)?\s*|il\s+(?:me\s+)?faut\s+|(?:il\s+)?faudrait\s+|je\s+(?:dois|vais|voudrais|veux)\s+|on\s+(?:doit|va)\s+|(?:the\s+)?(?:client|customer)\s+(?:wants|would like|needs)\s+(?:to\s+)?|i\s+(?:need|have|must)\s+(?:to\s+)?|we\s+(?:need|have)\s+to\s+)?/i;

/** Verbes à l'impératif ou à l'infinitif transformés en substantifs d'intervention. */
const VERB_TO_NOUN: [RegExp, string, string][] = [
  [/^(?:remplace[rz]?|changer?|changez)\s+/i, 'Remplacement ', 'Replacement of '],
  [/^(?:installe[rz]?|pose[rz]?|mettre|mettez|poser)\s+/i, 'Installation ', 'Installation of '],
  [/^(?:répare[rz]?|repare[rz]?|dépanne[rz]?|depanne[rz]?)\s+/i, 'Réparation ', 'Repair of '],
  [/^(?:repeindre|repeigne[rz]?|peindre|peigne[rz]?)\s+/i, 'Remise en peinture ', 'Repainting of '],
  [/^(?:rénove[rz]?|renove[rz]?|refaire|refaites)\s+/i, 'Rénovation ', 'Renovation of '],
  [/^(?:nettoye[rz]?|nettoyer)\s+/i, 'Nettoyage ', 'Cleaning of '],
  [/^(?:débouche[rz]?|deboucher)\s+/i, 'Débouchage ', 'Unblocking of '],
  [/^(?:isole[rz]?)\s+/i, 'Isolation ', 'Insulation of '],
  [/^(?:carrele[rz]?)\s+/i, 'Carrelage ', 'Tiling of '],
];

/**
 * Objets et prestations types, reconnus dans la description brute.
 * L'ordre compte : la première règle qui s'applique donne l'objet ; ses
 * prestations alimentent la Désignation quand le moteur local est seul.
 */
interface WorkRule {
  pattern: RegExp;
  subject: { fr: string; en: string };
  tasks: { fr: string[]; en: string[] };
}
const WORK_RULES: WorkRule[] = [
  { pattern: /siphon/, subject: { fr: 'Remplacement du siphon sous évier', en: 'Replacement of the sink trap' }, tasks: { fr: ['Dépose du siphon existant', 'Fourniture et pose d’un siphon neuf', 'Mise en eau et contrôle d’étanchéité'], en: ['Removal of the existing trap', 'Supply and fitting of a new trap', 'Water test and leak check'] } },
  { pattern: /chauffe[- ]eau|ballon d.eau chaude|cumulus/, subject: { fr: 'Remplacement du chauffe-eau', en: 'Water heater replacement' }, tasks: { fr: ['Dépose et évacuation de l’ancien chauffe-eau', 'Fourniture et pose du chauffe-eau neuf', 'Raccordements hydrauliques et électriques', 'Mise en service et contrôle'], en: ['Removal and disposal of the old water heater', 'Supply and installation of the new water heater', 'Plumbing and electrical connections', 'Commissioning and checks'] } },
  { pattern: /chaudiere|chaudière/, subject: { fr: 'Remplacement de la chaudière', en: 'Boiler replacement' }, tasks: { fr: ['Dépose de la chaudière existante', 'Fourniture et pose de la chaudière neuve', 'Raccordements et mise en service'], en: ['Removal of the existing boiler', 'Supply and installation of the new boiler', 'Connections and commissioning'] } },
  { pattern: /fuite/, subject: { fr: 'Recherche et réparation de fuite', en: 'Leak detection and repair' }, tasks: { fr: ['Recherche de fuite', 'Réparation et remise en état', 'Contrôle d’étanchéité'], en: ['Leak detection', 'Repair and reinstatement', 'Leak check'] } },
  { pattern: /(?:repeindre|peinture|peindre)[^.]*\bsalon/, subject: { fr: 'Remise en peinture du salon', en: 'Repainting of the living room' }, tasks: { fr: ['Protection des sols et du mobilier', 'Rebouchage et préparation des supports', 'Application de deux couches de peinture, murs et plafond', 'Nettoyage du chantier'], en: ['Protection of floors and furniture', 'Filling and surface preparation', 'Two coats of paint on walls and ceiling', 'Site clean-up'] } },
  { pattern: /(?:repeindre|peinture|peindre)[^.]*\b(?:chambre|cuisine|couloir|entree|entrée|bureau|salle)/, subject: { fr: 'Remise en peinture', en: 'Repainting' }, tasks: { fr: ['Protection des sols et du mobilier', 'Préparation des supports', 'Application de deux couches de peinture', 'Nettoyage du chantier'], en: ['Protection of floors and furniture', 'Surface preparation', 'Two coats of paint', 'Site clean-up'] } },
  { pattern: /repeindre|peinture|peindre/, subject: { fr: 'Travaux de peinture', en: 'Painting works' }, tasks: { fr: ['Préparation des supports', 'Application de deux couches de peinture', 'Nettoyage du chantier'], en: ['Surface preparation', 'Two coats of paint', 'Site clean-up'] } },
  { pattern: /prises?\b[^.]*plafonnier|plafonnier[^.]*prises?\b/, subject: { fr: 'Remplacement de prises et pose d’un plafonnier', en: 'Socket replacement and ceiling light installation' }, tasks: { fr: ['Dépose des prises existantes', 'Fourniture et pose des prises neuves', 'Fourniture et pose du plafonnier', 'Essais et mise en sécurité'], en: ['Removal of existing sockets', 'Supply and fitting of new sockets', 'Supply and fitting of the ceiling light', 'Testing and safety checks'] } },
  { pattern: /plafonnier/, subject: { fr: 'Installation d’un plafonnier', en: 'Ceiling light installation' }, tasks: { fr: ['Fourniture et pose du plafonnier', 'Raccordement et essais'], en: ['Supply and fitting of the ceiling light', 'Connection and testing'] } },
  { pattern: /prises?\b/, subject: { fr: 'Remplacement de prises électriques', en: 'Replacement of electrical sockets' }, tasks: { fr: ['Dépose des prises existantes', 'Fourniture et pose des prises neuves', 'Essais et mise en sécurité'], en: ['Removal of existing sockets', 'Supply and fitting of new sockets', 'Testing and safety checks'] } },
  { pattern: /tableau electrique|tableau électrique|disjoncteur/, subject: { fr: 'Mise en conformité du tableau électrique', en: 'Electrical panel upgrade' }, tasks: { fr: ['Diagnostic de l’installation', 'Remplacement des protections', 'Essais et mise en sécurité'], en: ['Installation diagnosis', 'Replacement of protective devices', 'Testing and safety checks'] } },
  { pattern: /porte[^.]*(?:interieure|intérieure|bati|bâti)|(?:interieure|intérieure)[^.]*porte/, subject: { fr: 'Remplacement d’une porte intérieure', en: 'Interior door replacement' }, tasks: { fr: ['Dépose de la porte existante', 'Fourniture et pose de la porte neuve', 'Ajustement du bâti et réglage de la fermeture'], en: ['Removal of the existing door', 'Supply and fitting of the new door', 'Frame adjustment and closing adjustment'] } },
  { pattern: /\bporte\b/, subject: { fr: 'Remplacement d’une porte', en: 'Door replacement' }, tasks: { fr: ['Dépose de la porte existante', 'Fourniture et pose de la porte neuve', 'Réglages et finitions'], en: ['Removal of the existing door', 'Supply and fitting of the new door', 'Adjustments and finishing'] } },
  { pattern: /fenetre|fenêtre|velux/, subject: { fr: 'Remplacement de menuiseries', en: 'Window replacement' }, tasks: { fr: ['Dépose des menuiseries existantes', 'Fourniture et pose des menuiseries neuves', 'Finitions et étanchéité'], en: ['Removal of existing windows', 'Supply and fitting of new windows', 'Finishing and sealing'] } },
  { pattern: /carrelage|faience|faïence/, subject: { fr: 'Pose de carrelage', en: 'Tiling works' }, tasks: { fr: ['Préparation du support', 'Fourniture et pose du carrelage', 'Jointoiement et nettoyage'], en: ['Substrate preparation', 'Supply and laying of tiles', 'Grouting and cleaning'] } },
  { pattern: /parquet/, subject: { fr: 'Pose de parquet', en: 'Parquet flooring' }, tasks: { fr: ['Préparation du support', 'Fourniture et pose du parquet', 'Plinthes et finitions'], en: ['Substrate preparation', 'Supply and laying of parquet', 'Skirting and finishing'] } },
  { pattern: /salle de bain|douche|baignoire/, subject: { fr: 'Rénovation de salle de bain', en: 'Bathroom renovation' }, tasks: { fr: ['Dépose des équipements existants', 'Plomberie et évacuations', 'Fourniture et pose des équipements sanitaires', 'Finitions'], en: ['Removal of existing fittings', 'Plumbing and drainage', 'Supply and fitting of sanitary equipment', 'Finishing'] } },
  { pattern: /wc|toilettes?/, subject: { fr: 'Remplacement de WC', en: 'Toilet replacement' }, tasks: { fr: ['Dépose du WC existant', 'Fourniture et pose du WC neuf', 'Raccordement et contrôle d’étanchéité'], en: ['Removal of the existing toilet', 'Supply and fitting of the new toilet', 'Connection and leak check'] } },
  { pattern: /robinet|mitigeur/, subject: { fr: 'Remplacement de robinetterie', en: 'Tap replacement' }, tasks: { fr: ['Dépose de la robinetterie existante', 'Fourniture et pose de la robinetterie neuve', 'Contrôle d’étanchéité'], en: ['Removal of the existing tap', 'Supply and fitting of the new tap', 'Leak check'] } },
  { pattern: /radiateur/, subject: { fr: 'Remplacement de radiateur', en: 'Radiator replacement' }, tasks: { fr: ['Dépose du radiateur existant', 'Fourniture et pose du radiateur neuf', 'Purge et mise en service'], en: ['Removal of the existing radiator', 'Supply and fitting of the new radiator', 'Bleeding and commissioning'] } },
  { pattern: /toiture|tuile|couverture/, subject: { fr: 'Travaux de couverture', en: 'Roofing works' }, tasks: { fr: ['Mise en sécurité du chantier', 'Réparation de la couverture', 'Contrôle d’étanchéité'], en: ['Site safety set-up', 'Roof repair', 'Waterproofing check'] } },
  { pattern: /isolation|isoler/, subject: { fr: 'Travaux d’isolation', en: 'Insulation works' }, tasks: { fr: ['Préparation des surfaces', 'Fourniture et pose de l’isolant', 'Finitions'], en: ['Surface preparation', 'Supply and installation of insulation', 'Finishing'] } },
  { pattern: /debouch|débouch|bouché|bouche\b|canalisation/, subject: { fr: 'Débouchage de canalisation', en: 'Drain unblocking' }, tasks: { fr: ['Débouchage mécanique de la canalisation', 'Contrôle d’écoulement'], en: ['Mechanical drain unblocking', 'Flow check'] } },
  { pattern: /climatisation|clim\b|split/, subject: { fr: 'Installation de climatisation', en: 'Air-conditioning installation' }, tasks: { fr: ['Fourniture et pose des unités', 'Liaisons frigorifiques et électriques', 'Mise en service'], en: ['Supply and installation of units', 'Refrigerant and electrical connections', 'Commissioning'] } },
];

export interface RecognizedWork {
  subject: string;
  tasks: string[];
}

/** Prestation type reconnue dans une description, ou null. */
export function recognizeWork(description: string, language: Language = 'fr'): RecognizedWork | null {
  const normalized = normalize(description);
  for (const rule of WORK_RULES) {
    if (rule.pattern.test(normalized)) return { subject: rule.subject[language], tasks: rule.tasks[language] };
  }
  return null;
}

const ARTICLES: Record<string, string> = { le: 'du ', la: 'de la ', les: 'des ', 'l’': 'de l’', un: 'd’un ', une: 'd’une ', mon: 'du ', ma: 'de la ', mes: 'des ' };

/**
 * Objet du devis à partir d'une phrase brute : on retire les tournures
 * orales, on nominalise le verbe de tête, on coupe sur un mot, sans points
 * de suspension ni ponctuation finale.
 */
export function subjectFromSentence(sentence: string, language: Language = 'fr', max = 64): string {
  let text = sentence.replace(/\s+/g, ' ').trim();
  text = text.replace(CONVERSATIONAL_PREFIX, '');
  for (const [pattern, fr, en] of VERB_TO_NOUN) {
    if (pattern.test(text)) {
      text = text.replace(pattern, language === 'en' ? en : fr);
      // « Remplacement le siphon » n'est pas du français : on contracte l'article.
      if (language !== 'en') text = text.replace(/^(\S+\s)(le|la|les|l['’]|un|une|mon|ma|mes)\s*/i, (_, head: string, article: string) => `${head}${ARTICLES[article.toLowerCase().replace("'", '’')] ?? article + ' '}`);
      break;
    }
  }
  text = text.replace(/\s+(?:parce qu|car\b|puisqu|because\b|since\b).*$/i, '').replace(/[.!?;:,\s]+$/g, '').trim();
  if (text.length > max) {
    const cut = text.slice(0, max);
    const space = cut.lastIndexOf(' ');
    text = (space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[,;:\s]+$/g, '');
  }
  return text ? text[0]!.toUpperCase() + text.slice(1) : text;
}

/** Première proposition exploitable d'une description brute. */
export function firstClause(description: string): string | null {
  return description
    .split(/[.\n!?;]|,\s*(?:puis|ensuite|et|then|and)\s+/i)
    .map((part) => part.trim())
    .find((part) => part.length > 8) ?? null;
}

function looksLikeQuestion(text: string) {
  return /\?/.test(text) || /^(?:quelle?s?|combien|quel(?:le)?s?|what|how|which)\b/i.test(text.trim());
}

/** Vrai quand `candidate` reprend en substance `source` (écho de la dictée). */
export function echoes(candidate: string, source: string): boolean {
  const a = normalize(candidate); const b = normalize(source);
  if (!a || !b) return false;
  if (b.includes(a) || a.includes(b.slice(0, Math.min(40, b.length)))) return true;
  return overlapScore(uniqueTokens(candidate), source) >= 0.7 && a.length > 60;
}

export interface PolishOptions {
  description: string;
  language?: Language;
  trade?: string | null;
}

/**
 * Applique la règle de la source unique à un projet de devis, IA ou local.
 * Ne touche ni aux quantités ni aux prix ; ne rend jamais un titre vide.
 */
export function polishDraft(draft: QuoteDraft, options: PolishOptions): QuoteDraft {
  const language = options.language ?? 'fr';
  const description = options.description ?? '';
  const recognized = recognizeWork(description, language);

  // Objet : court, nominal, jamais l'écho de la dictée ni une question.
  // Tournure orale en tête de titre (« Le client veut… », « Il faut… ») :
  // le préfixe est optionnel dans l'expression, on exige donc un vrai match.
  const conversational = ((draft.titre || '').trim().match(CONVERSATIONAL_PREFIX)?.[0]?.length ?? 0) > 0;
  let titre = subjectFromSentence(draft.titre || '', language, 80);
  const titleIsEcho = !titre || looksLikeQuestion(titre) || titre.length > 80 || (echoes(titre, description) && titre.length > 40) || (conversational && recognized != null);
  if (titleIsEcho) {
    titre = recognized?.subject ?? (subjectFromSentence(firstClause(description) ?? '', language) || titre);
  }
  if (!titre) titre = language === 'en' ? 'Service' : 'Intervention';

  // Désignation : les lignes portent le détail ; on ne garde en description
  // des travaux que ce qu'elles ne disent pas déjà.
  const lineLabels = new Set([...draft.materiaux, ...draft.mainOeuvre].map((line) => normalize(line.designation)));
  const descriptionTravaux = draft.descriptionTravaux
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter((item) => item && !looksLikeQuestion(item) && !echoes(item, description) && !lineLabels.has(normalize(item)))
    .filter((item, index, all) => all.findIndex((other) => normalize(other) === normalize(item)) === index)
    .slice(0, 4);

  // Résumé : une phrase, ou rien.
  let resume = (draft.resume ?? '').replace(/\s+/g, ' ').trim();
  if (resume && (echoes(resume, description) || looksLikeQuestion(resume) || resume.length > 240 || normalize(titre).includes(normalize(resume)) || normalize(resume) === normalize(titre))) resume = '';
  if (resume) {
    const sentences = resume.split(/(?<=[.!?])\s+/);
    resume = sentences.slice(0, 2).join(' ');
  }

  // Lignes : libellés nettoyés des tournures orales, descriptions jamais l'écho de la dictée.
  const cleanLine = <T extends { designation: string; description?: string | null }>(line: T): T => ({
    ...line,
    designation: subjectFromSentence(line.designation, language, 120) || line.designation,
    description: line.description && !echoes(line.description, description) && !looksLikeQuestion(line.description) ? line.description.replace(/\s+/g, ' ').trim() : null,
  });

  return {
    ...draft,
    titre,
    resume,
    descriptionTravaux,
    materiaux: draft.materiaux.map(cleanLine),
    mainOeuvre: draft.mainOeuvre.map(cleanLine),
    observations: draft.observations.filter((item) => !echoes(item, description) || item.length <= 80).slice(0, 8),
  };
}
