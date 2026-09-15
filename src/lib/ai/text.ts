/** Utilitaires de traitement du français, partagés par le moteur local et le rapprochement catalogue. */

const STOPWORDS = new Set([
  'le','la','les','un','une','des','du','de','d','au','aux','et','ou','a','à','en','dans','sur',
  'pour','par','avec','sans','sous','il','elle','on','je','tu','nous','vous','ils','elles','ce',
  'cet','cette','ces','son','sa','ses','leur','leurs','mon','ma','mes','ton','ta','tes','qui',
  'que','quoi','dont','ou','est','sont','etre','avoir','faut','faire','fait','y','ne','pas','plus',
  'aussi','tres','bien','chez','client','monsieur','madame','environ','prevoir','prevu','doit',
  'aussi','puis','ensuite','apres','avant','the','and','for','with','of','to','in','on',
]);

/** Minuscule sans accent ni ponctuation, pour toutes les comparaisons. */
export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['`]/g, ' ')
    .replace(/[^a-z0-9%.,\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Radical très simple : suffit pour rapprocher « radiateurs » et « radiateur ». */
export function stem(word: string): string {
  let w = word;
  for (const suffix of ['ations', 'ation', 'ements', 'ement', 'euses', 'eurs', 'euse', 'eur', 'ages', 'age', 'es', 's', 'x']) {
    if (w.length > suffix.length + 3 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  return w;
}

export function tokenize(input: string): string[] {
  return normalize(input)
    .split(/[\s,.;:!?()-]+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token))
    .map(stem);
}

export function uniqueTokens(input: string): Set<string> {
  return new Set(tokenize(input));
}

/** Similarité de Jaccard pondérée par la couverture de la requête. */
export function overlapScore(queryTokens: Set<string>, candidate: string): number {
  const candidateTokens = uniqueTokens(candidate);
  if (candidateTokens.size === 0 || queryTokens.size === 0) return 0;
  let hits = 0;
  for (const token of candidateTokens) {
    if (queryTokens.has(token)) hits += 1;
  }
  if (hits === 0) return 0;
  const coverage = hits / candidateTokens.size;
  const recall = hits / queryTokens.size;
  return coverage * 0.75 + recall * 0.25;
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9,
  dix: 10, onze: 11, douze: 12, quinze: 15, vingt: 20, trente: 30, cinquante: 50, cent: 100,
  demi: 0.5, 'demie': 0.5,
};

export function parseFrenchNumber(token: string): number | null {
  const cleaned = token.replace(',', '.');
  const numeric = Number(cleaned);
  if (Number.isFinite(numeric) && cleaned.trim() !== '') return numeric;
  return NUMBER_WORDS[normalize(token)] ?? null;
}

/**
 * Extrait une durée de main-d'œuvre exprimée en français courant.
 * Renvoie des minutes, ou null si aucune durée n'est mentionnée.
 */
export function extractDurationMinutes(input: string): number | null {
  const text = normalize(input);

  const hhmm = text.match(/(\d+)\s*h\s*(\d{1,2})/);
  if (hhmm) return Number(hhmm[1]) * 60 + Number(hhmm[2]);

  const hours = text.match(/(\d+(?:[.,]\d+)?)\s*(?:h\b|heures?\b)/);
  if (hours) return Math.round(Number(hours[1]!.replace(',', '.')) * 60);

  const minutes = text.match(/(\d+)\s*(?:min\b|minutes?\b)/);
  if (minutes) return Number(minutes[1]);

  const wordHours = text.match(
    /\b(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|demi|demie)\s+(?:bonne\s+)?heures?\b/,
  );
  if (wordHours) {
    const value = parseFrenchNumber(wordHours[1]!);
    if (value) return Math.round(value * 60);
  }

  if (/demi[- ]journee/.test(text)) return 210;
  if (/\bjournees?\b|\bune journee\b/.test(text)) return 420;
  if (/\b(\d+)\s*jours?\b/.test(text)) {
    const days = Number(text.match(/\b(\d+)\s*jours?\b/)![1]);
    return days * 420;
  }
  if (/\bsemaine\b/.test(text)) return 2100;
  return null;
}

export interface ExtractedQuantity {
  value: number;
  unit: string;
  subject: string;
}

const UNIT_ALIASES: Record<string, string> = {
  m2: 'm²', 'm²': 'm²', metres: 'm', metre: 'm', m: 'm', ml: 'ml', 'm3': 'm³', 'm³': 'm³',
  kg: 'kg', l: 'L', litres: 'L', litre: 'L', u: 'u', unites: 'u', unite: 'u',
};

/** Repère les quantités explicites : « 2 radiateurs », « 12 m2 de carrelage ». */
export function extractQuantities(input: string): ExtractedQuantity[] {
  const text = normalize(input);
  const results: ExtractedQuantity[] = [];
  const pattern =
    /(\d+(?:[.,]\d+)?|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s*(m2|m²|m3|m³|ml|metres?|m|kg|litres?|l|unites?|u)?\s*(?:de\s+|d\s+)?([a-z][a-z-]{2,}(?:\s+[a-z][a-z-]{2,})?)/g;

  for (const match of text.matchAll(pattern)) {
    const value = parseFrenchNumber(match[1] ?? '');
    if (value == null || value <= 0 || value > 100_000) continue;
    const rawUnit = match[2] ? UNIT_ALIASES[match[2]] ?? 'u' : 'u';
    const subject = (match[3] ?? '').trim();
    if (!subject || STOPWORDS.has(subject)) continue;
    if (/^(heures?|h|min|minutes?|jours?)$/.test(subject)) continue;
    results.push({ value, unit: rawUnit, subject });
  }
  return results;
}
