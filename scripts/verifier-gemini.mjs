#!/usr/bin/env node
/**
 * Vérification du fournisseur Gemini.
 *
 * Choisir un modèle de mémoire est le meilleur moyen de déployer un nom qui
 * n'existe plus. Ce script interroge l'API : il énumère les modèles réellement
 * accessibles à la clé, puis fait passer au modèle retenu un vrai appel de
 * préparation de devis — schéma structuré compris — et affiche le résultat.
 *
 *   GEMINI_API_KEY=… node scripts/verifier-gemini.mjs
 *   GEMINI_API_KEY=… node scripts/verifier-gemini.mjs --modele gemini-2.5-flash
 *
 * La clé est lue dans l'environnement, transmise en en-tête, et n'est jamais
 * affichée ni écrite.
 */
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

const cle = process.env.GEMINI_API_KEY?.trim();
if (!cle) {
  console.error('\n✖ GEMINI_API_KEY est absente.');
  console.error('\n  Créez une clé sur https://aistudio.google.com/apikey\n');
  process.exit(1);
}

const iModele = process.argv.indexOf('--modele');
const demande = iModele === -1 ? undefined : process.argv[iModele + 1];

async function api(chemin, options = {}) {
  const reponse = await fetch(`${BASE}${chemin}`, {
    ...options,
    headers: { 'content-type': 'application/json', 'x-goog-api-key': cle, ...(options.headers ?? {}) },
    signal: AbortSignal.timeout(90_000),
  });
  const texte = await reponse.text();
  let corps = null;
  try {
    corps = JSON.parse(texte);
  } catch {
    /* laissé brut pour le message d'erreur */
  }
  if (!reponse.ok) {
    // Ni la clé ni l'URL complète ne sont rendues.
    console.error(`\n✖ L'API Gemini a répondu ${reponse.status} : ${corps?.error?.message ?? texte.slice(0, 200)}\n`);
    process.exit(1);
  }
  return corps;
}

/* ───────────────────────────────────────────── 1. modèles accessibles */
const { models = [] } = await api('/models');
const utilisables = models
  .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
  .map((m) => ({
    id: m.name.replace(/^models\//, ''),
    nom: m.displayName,
    entree: m.inputTokenLimit,
    sortie: m.outputTokenLimit,
  }))
  .filter((m) => !/embedding|aqa|imagen|veo|tts|image-generation/i.test(m.id));

console.info(`\n${utilisables.length} modèle(s) de génération accessibles à cette clé :\n`);
for (const m of utilisables) {
  console.info(`  ${m.id.padEnd(42)} ${String(m.entree ?? '—').padStart(9)} entrée / ${String(m.sortie ?? '—').padStart(7)} sortie`);
}

/* ───────────────────────────────────────────── 2. modèle retenu */
// Ordre de préférence : les modèles « flash » couvrent le palier gratuit avec
// les quotas les plus larges, et acceptent texte comme images.
const PREFERENCES = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
];
const dispo = new Set(utilisables.map((m) => m.id));
const modele = demande ?? PREFERENCES.find((p) => dispo.has(p)) ?? utilisables[0]?.id;

if (!modele) {
  console.error('\n✖ Aucun modèle utilisable.\n');
  process.exit(1);
}
if (demande && !dispo.has(demande)) {
  console.error(`\n✖ Le modèle « ${demande} » n'est pas accessible à cette clé.\n`);
  process.exit(1);
}
console.info(`\nModèle retenu : ${modele}\n`);

/* ───────────────────────────────────────────── 3. vrai appel de devis */
const schema = {
  type: 'object',
  properties: {
    titre: { type: 'string' },
    resume: { type: 'string' },
    materiaux: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          designation: { type: 'string' },
          quantite: { type: 'number' },
          unite: { type: 'string' },
          prixUnitaireHT: { type: 'number' },
          tauxTVA: { type: 'number' },
        },
        required: ['designation', 'quantite', 'unite', 'prixUnitaireHT'],
      },
    },
    mainOeuvre: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          designation: { type: 'string' },
          heures: { type: 'number' },
          tauxHoraire: { type: 'number' },
        },
        required: ['designation', 'heures', 'tauxHoraire'],
      },
    },
    questions: { type: 'array', items: { type: 'string' } },
  },
  required: ['titre', 'resume', 'materiaux', 'mainOeuvre', 'questions'],
};

const description =
  "Remplacement d'un chauffe-eau électrique 200 litres chez un particulier à Lyon, " +
  "dépose et évacuation de l'ancien appareil, raccordement sur l'arrivée existante, " +
  "mise en service et vérification de l'étanchéité. Environ trois heures sur place.";

const debut = Date.now();
const reponse = await api(`/models/${modele}:generateContent`, {
  method: 'POST',
  body: JSON.stringify({
    systemInstruction: {
      parts: [{
        text:
          'Tu prépares des devis pour un artisan plombier en France. Taux horaire 55 € HT. ' +
          'TVA 10 % pour la rénovation de logement de plus de deux ans. ' +
          'Chiffre les matériaux au prix du marché français. Réponds en français.',
      }],
    },
    contents: [{ role: 'user', parts: [{ text: description }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      maxOutputTokens: 4096,
      temperature: 0.2,
    },
  }),
});
const ms = Date.now() - debut;

const texte = (reponse.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
let devis;
try {
  devis = JSON.parse(texte);
} catch {
  console.error('\n✖ La réponse n’était pas du JSON exploitable :\n', texte.slice(0, 400), '\n');
  process.exit(1);
}

console.info('═══ DEVIS PRÉPARÉ PAR GEMINI ══════════════════════════');
console.info(`  temps de réponse : ${(ms / 1000).toFixed(1)} s`);
console.info(`  jetons           : ${reponse.usageMetadata?.promptTokenCount ?? '?'} entrée / ${reponse.usageMetadata?.candidatesTokenCount ?? '?'} sortie`);
console.info(`  objet            : ${JSON.stringify(devis.titre)}`);
console.info(`\n  matériaux (${devis.materiaux?.length ?? 0}) :`);
for (const m of devis.materiaux ?? []) {
  console.info(`    · ${String(m.designation).slice(0, 44).padEnd(45)}${String(m.quantite).padStart(5)} ${String(m.unite).padEnd(4)}${Number(m.prixUnitaireHT).toFixed(2).padStart(9)} € HT   TVA ${m.tauxTVA ?? '—'} %`);
}
console.info(`\n  main-d'œuvre (${devis.mainOeuvre?.length ?? 0}) :`);
for (const o of devis.mainOeuvre ?? []) {
  console.info(`    · ${String(o.designation).slice(0, 44).padEnd(45)}${String(o.heures).padStart(5)} h  ${Number(o.tauxHoraire).toFixed(2).padStart(9)} € HT`);
}
console.info(`\n  questions (${devis.questions?.length ?? 0}) :`);
for (const q of devis.questions ?? []) console.info(`    · ${q}`);

const total =
  (devis.materiaux ?? []).reduce((a, m) => a + Number(m.quantite) * Number(m.prixUnitaireHT), 0) +
  (devis.mainOeuvre ?? []).reduce((a, o) => a + Number(o.heures) * Number(o.tauxHoraire), 0);
console.info(`\n  total HT estimé  : ${total.toFixed(2)} €`);
console.info(`\n✔ ${modele} répond, en français, avec un schéma respecté.\n`);
