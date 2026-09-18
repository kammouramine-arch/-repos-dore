import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

/**
 * Captures de l'espace web DEVISERA à plusieurs tailles d'écran.
 *
 *   BASE_URL=http://127.0.0.1:3000 CAPTURE_EMAIL=demo@devisera.fr CAPTURE_PASSWORD=… \
 *   node scripts/captures-web.mjs
 *
 * Écrit `<OUT>/<taille>/<écran>.png` et affiche les erreurs console rencontrées.
 * Aucune donnée n'est créée : le compte doit exister.
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = process.env.OUT ?? '/tmp/claude-0/captures-web';
const EMAIL = process.env.CAPTURE_EMAIL ?? 'demo@devisera.fr';
const PASSWORD = process.env.CAPTURE_PASSWORD ?? 'devisera-demo-2026';
const ONLY = process.env.ONLY?.split(',').filter(Boolean);

const SIZES = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

const SCREENS = [
  ['accueil', '/app'],
  ['devis', '/app/devis'],
  ['devis-nouveau', '/app/devis/nouveau'],
  ['clients', '/app/clients'],
  ['relances', '/app/relances'],
  ['prospects', '/app/prospects'],
  ['catalogue', '/app/catalogue'],
  ['analytique', '/app/analytique'],
  ['assistant', '/app/assistant'],
  ['parametres', '/app/parametres'],
  ['parametres-profil', '/app/parametres/profil'],
  ['parametres-entreprise', '/app/parametres/entreprise'],
  ['parametres-equipe', '/app/parametres/equipe'],
  ['abonnement', '/app/parametres/abonnement'],
  ['aide', '/app/aide'],
  ['plus', '/app/plus'],
  ['connexion', '/connexion', { anonymous: true }],
  ['inscription', '/inscription', { anonymous: true }],
];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const problems = [];

/**
 * Une seule connexion pour toutes les tailles : l'état de session est
 * réutilisé, ce qui évite de déclencher la limite de tentatives de connexion.
 */
async function signIn() {
  const context = await browser.newContext({ viewport: SIZES.desktop, locale: 'fr-FR' });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90_000);
  await page.goto(`${BASE}/connexion`, { waitUntil: 'networkidle' });
  await page.getByLabel(/Adresse email/i).fill(EMAIL);
  await page.getByLabel(/Mot de passe/i).fill(PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await page.waitForURL(/\/app/, { timeout: 90_000 });
  const state = await context.storageState();
  await context.close();
  return state;
}
const storageState = await signIn();

for (const [sizeName, viewport] of Object.entries(SIZES)) {
  if (ONLY && !ONLY.includes(sizeName)) continue;
  const context = await browser.newContext({ viewport, locale: 'fr-FR', deviceScaleFactor: 1, storageState });
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);
  page.setDefaultNavigationTimeout(90_000);
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`${sizeName} ${page.url()} console: ${message.text().slice(0, 200)}`);
  });
  page.on('pageerror', (error) => problems.push(`${sizeName} ${page.url()} pageerror: ${String(error).slice(0, 200)}`));

  await mkdir(path.join(OUT, sizeName), { recursive: true });
  for (const [name, route, options = {}] of SCREENS) {
    if (options.anonymous) continue;
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) problems.push(`${sizeName} ${route} horizontal overflow ${overflow}px`);
    await page.screenshot({ path: path.join(OUT, sizeName, `${name}.png`), fullPage: true });
  }

  // Écrans anonymes : nouvelle session sans cookie.
  const anonymous = await browser.newContext({ viewport, locale: 'fr-FR', deviceScaleFactor: 1 });
  const anonymousPage = await anonymous.newPage();
  anonymousPage.setDefaultNavigationTimeout(90_000);
  for (const [name, route, options = {}] of SCREENS) {
    if (!options.anonymous) continue;
    await anonymousPage.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await anonymousPage.screenshot({ path: path.join(OUT, sizeName, `${name}.png`), fullPage: true });
  }
  await anonymous.close();
  await context.close();
}

await browser.close();
console.log(`Captures dans ${OUT}`);
if (problems.length) {
  console.log('Problèmes relevés :');
  for (const problem of problems) console.log(` - ${problem}`);
} else {
  console.log('Aucune erreur console ni débordement horizontal.');
}
