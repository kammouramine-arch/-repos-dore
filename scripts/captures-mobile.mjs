/**
 * Galerie de captures du produit mobile.
 *
 * Le typage et les tests ne montrent pas ce que voit un artisan. Ce script sert
 * le bundle web d'Expo, place chaque écran dans l'état où on veut le juger —
 * y compris les états vides, chargés, en erreur et hors ligne — puis capture au
 * format iPhone 15 Pro.
 *
 *   (dans mobile/) npx expo export --platform web
 *   node scripts/captures-mobile.mjs      → /tmp/captures
 *
 * Les données sont créées par l'API sur le backend visé par API : à lancer sur
 * une base de développement, pas en production. Les comptes créés portent le
 * préfixe « ZZ » et sont destinés à être supprimés après coup.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const API = process.env.API ?? 'http://127.0.0.1:3000';
const OUT = process.env.OUT ?? '/tmp/captures';
const PORT = 4610;
const root = path.resolve('mobile/dist');

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

/* --------------------------------------------------------- serveur statique */
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
};
const srv = createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  for (const p of [path.join(root, u), path.join(root, u, 'index.html'), path.join(root, 'index.html')]) {
    try {
      const d = await readFile(p);
      res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' });
      return res.end(d);
    } catch {}
  }
  res.writeHead(404).end();
});
await new Promise((r) => srv.listen(PORT, r));

/* ------------------------------------------------------------- API (semis) */
async function call(pathname, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['content-type'] = 'application/json';
  const res = await fetch(`${API}${pathname}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  if (!res.ok) throw new Error(`${method} ${pathname} -> ${res.status} ${text.slice(0, 200)}`);
  return parsed?.data ?? parsed;
}

async function creerCompte(nom) {
  const email = `zz-capture-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@devisia-verif.test`;
  const out = await call('/api/auth/inscription', {
    method: 'POST',
    body: { email, password: 'MotDePasse!2026', companyName: nom, firstName: 'Karim' },
  });
  return { email, token: out.token, organizationId: out.session.organization.id };
}

/** Compte « actif » : catalogue, clients et devis envoyés. */
async function semer(token) {
  const catalogue = [
    { name: 'Main-d’œuvre plombier', category: 'MAIN_OEUVRE', unit: 'h', salePriceCents: 5500, vatRate: 10 },
    { name: 'Chauffe-eau 200 L', category: 'MATERIAU', unit: 'u', salePriceCents: 74900, vatRate: 10 },
    { name: 'Mitigeur thermostatique', category: 'MATERIAU', unit: 'u', salePriceCents: 12900, vatRate: 10 },
    { name: 'Siphon laiton', category: 'MATERIAU', unit: 'u', salePriceCents: 3200, vatRate: 10 },
    { name: 'Déplacement agglomération', category: 'SERVICE', unit: 'u', salePriceCents: 4500, vatRate: 20 },
  ];
  for (const item of catalogue) await call('/api/pricebook', { method: 'POST', token, body: item });

  const clients = [
    { lastName: 'Bernard', firstName: 'Sylvie', phone: '0612345678', email: 'sylvie.bernard@exemple.fr', city: 'Lyon' },
    { companyName: 'SCI des Lilas', lastName: 'Moreau', phone: '0623456789', email: 'gestion@sci-lilas.fr', city: 'Villeurbanne' },
    { lastName: 'Nguyen', firstName: 'Thanh', phone: '0634567890', email: 'thanh.nguyen@exemple.fr', city: 'Bron' },
  ];
  const crees = [];
  for (const c of clients) crees.push(await call('/api/customers', { method: 'POST', token, body: c }));

  const devis = [
    {
      customerId: crees[0].id, title: 'Remplacement du chauffe-eau',
      items: [
        { kind: 'MATERIAU', label: 'Chauffe-eau 200 L', unit: 'u', quantity: 1, unitPriceCents: 74900, vatRate: 10 },
        { kind: 'MAIN_OEUVRE', label: 'Main-d’œuvre plombier', unit: 'h', quantity: 3, unitPriceCents: 5500, vatRate: 10 },
      ],
    },
    {
      customerId: crees[1].id, title: 'Réfection salle de bain',
      items: [
        { kind: 'MAIN_OEUVRE', label: 'Main-d’œuvre plombier', unit: 'h', quantity: 16, unitPriceCents: 5500, vatRate: 10 },
        { kind: 'MATERIAU', label: 'Mitigeur thermostatique', unit: 'u', quantity: 2, unitPriceCents: 12900, vatRate: 10 },
      ],
    },
    {
      customerId: crees[2].id, title: 'Fuite sous évier',
      items: [
        { kind: 'MATERIAU', label: 'Siphon laiton', unit: 'u', quantity: 1, unitPriceCents: 3200, vatRate: 10 },
        { kind: 'MAIN_OEUVRE', label: 'Main-d’œuvre plombier', unit: 'h', quantity: 1, unitPriceCents: 5500, vatRate: 10 },
      ],
    },
  ];

  let premier = null;
  for (const d of devis) {
    const quote = await call('/api/quotes', {
      method: 'POST', token,
      body: { customerId: d.customerId, title: d.title, items: d.items, aiGenerated: true, aiConfidence: 78 },
    });
    premier ??= quote;
    await call(`/api/quotes/${quote.id}/envoi`, { method: 'POST', token, body: {} });
  }
  return premier;
}

/* ------------------------------------------------------------- navigateur */
const browser = await chromium.launch();
const shots = [];

async function contexte({ token, onboardingVu = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(
    ([t, vu]) => {
      try {
        if (t) localStorage.setItem('devisia.session.token', t);
        else localStorage.removeItem('devisia.session.token');
        if (vu) localStorage.setItem('devisia.onboarding.vu', '1');
        else localStorage.removeItem('devisia.onboarding.vu');
      } catch {}
    },
    [token ?? null, onboardingVu],
  );
  return ctx;
}

async function shot(page, nom, { wait = 1100 } = {}) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${nom}.png` });
  shots.push(nom);
  console.info('  ', nom);
}

const vis = (page, rx) => page.getByText(rx).filter({ visible: true }).first();
const tap = async (page, rx, t = 8000) => {
  const e = vis(page, rx);
  await e.waitFor({ timeout: t });
  await e.click();
};
const url = (p) => `http://127.0.0.1:${PORT}${p}`;

console.info('\nPréparation des comptes…');
const vierge = await creerCompte('Plomberie Martin');
const actif = await creerCompte('Plomberie Martin');
const devisActif = await semer(actif.token);
console.info('  compte vierge et compte actif prêts');

/* ═══════════════════════════════════════════ 1. Avant authentification */
console.info('\nAvant authentification');
{
  const ctx = await contexte({ onboardingVu: false });
  const page = await ctx.newPage();
  await page.goto(url('/'), { waitUntil: 'commit' });
  // L'écran de lancement ne dure qu'un instant : on le saisit à pleine opacité,
  // avant qu'il ne cède la place à la découverte.
  await shot(page, '00-lancement', { wait: 200 });
  await page.waitForTimeout(2300);
  await shot(page, '01-decouverte-1', { wait: 400 });
  for (const n of [2, 3, 4]) {
    await tap(page, /^Suivant$/).catch(() => {});
    await shot(page, `0${n + 1}-decouverte-${n}`, { wait: 900 });
  }
  await tap(page, /^Suivant$/).catch(() => {});
  await shot(page, '06-essai-formules', { wait: 1000 });
  await tap(page, /Essayer gratuitement/i).catch(() => {});
  await shot(page, '07-inscription', { wait: 1400 });
  await tap(page, /J.ai déjà un compte/i).catch(() => {});
  await shot(page, '08-connexion', { wait: 1400 });
  // Erreur d'authentification : identifiants refusés, message lisible.
  await page.getByLabel('Adresse email').first().fill('karim@plomberie-martin.fr').catch(() => {});
  await page.getByLabel('Mot de passe').first().fill('MauvaisMotDePasse!9').catch(() => {});
  await tap(page, /Se connecter/i).catch(() => {});
  await shot(page, '09-connexion-erreur', { wait: 2600 });
  await ctx.close();
}

/* ═══════════════════════════════════════════ 2. Compte neuf */
console.info('\nCompte neuf');
{
  const ctx = await contexte({ token: vierge.token });
  const page = await ctx.newPage();
  await page.goto(url('/'), { waitUntil: 'networkidle' });
  await shot(page, '10-accueil-premiere-utilisation', { wait: 2600 });

  await page.goto(url('/clients'), { waitUntil: 'networkidle' });
  await shot(page, '11-clients-vide', { wait: 2000 });

  await page.goto(url('/prospects'), { waitUntil: 'networkidle' });
  await shot(page, '12-prospects-vide', { wait: 2200 });

  await page.goto(url('/plus'), { waitUntil: 'networkidle' });
  await shot(page, '13-plus', { wait: 1800 });

  await page.goto(url('/abonnement'), { waitUntil: 'networkidle' });
  await shot(page, '14-abonnement', { wait: 2200 });
  await page.mouse.wheel(0, 900);
  await shot(page, '15-abonnement-bas', { wait: 900 });

  await page.goto(url('/catalogue'), { waitUntil: 'networkidle' });
  await shot(page, '16-catalogue-vide', { wait: 2000 });
  await tap(page, /Ajouter une prestation/i).catch(() => {});
  await shot(page, '17-catalogue-nouvelle-prestation', { wait: 1200 });

  await page.goto(url('/entreprise'), { waitUntil: 'networkidle' });
  await shot(page, '18-entreprise', { wait: 2200 });
  await page.mouse.wheel(0, 1200);
  await shot(page, '19-entreprise-bas', { wait: 900 });

  await page.goto(url('/analytique'), { waitUntil: 'networkidle' });
  await shot(page, '20-activite-vide', { wait: 2200 });

  /* --- création de devis --- */
  await page.goto(url('/devis/nouveau'), { waitUntil: 'networkidle' });
  await shot(page, '21-devis-saisie-vide', { wait: 2000 });

  const zone = page.locator('textarea').filter({ visible: true }).first();
  await zone.fill(
    "Remplacement d'un chauffe-eau 200 litres chez un particulier, evacuation de l'ancien appareil, deux heures sur place.",
  );
  await shot(page, '22-devis-saisie-remplie', { wait: 700 });

  // État de génération : la réponse est retenue le temps de la photographier.
  // Le délai est une variable, pas un `unroute` : retirer la route pendant
  // qu'une requête est en vol la laisserait sans gestionnaire.
  let retard = 9000;
  await page.route('**/api/ai/quote', async (route) => {
    if (retard > 0) await new Promise((r) => setTimeout(r, retard));
    await route.continue();
  });
  await tap(page, /Préparer le devis/i).catch(() => {});
  await shot(page, '23-devis-generation', { wait: 2200 });
  retard = 0;
  await page.waitForTimeout(11000);
  await shot(page, '24-devis-questions', { wait: 2500 });

  await tap(page, /^2 h$/).catch(() => {});
  await shot(page, '25-devis-questions-repondu', { wait: 700 });
  await tap(page, /^Préparer le devis$/).catch(() => {});
  await page.waitForTimeout(12000);
  await shot(page, '26-devis-verification', { wait: 2500 });
  await page.mouse.wheel(0, 900);
  await shot(page, '27-devis-verification-bas', { wait: 900 });

  await tap(page, /Choisir le client/i).catch(() => {});
  await shot(page, '28-client-selection-vide', { wait: 2000 });
  await tap(page, /Créer un client/i).catch(() => {});
  await shot(page, '29-client-creation', { wait: 1400 });
  await ctx.close();
}

/* ═══════════════════════════════════════════ 3. Compte actif */
console.info('\nCompte avec activité');
{
  const ctx = await contexte({ token: actif.token });
  const page = await ctx.newPage();
  await page.goto(url('/'), { waitUntil: 'networkidle' });
  await shot(page, '30-accueil-actif', { wait: 3200 });
  await page.mouse.wheel(0, 700);
  await shot(page, '31-accueil-actif-bas', { wait: 900 });

  await page.goto(url('/clients'), { waitUntil: 'networkidle' });
  await shot(page, '32-clients-remplis', { wait: 2400 });

  await page.goto(url('/devis'), { waitUntil: 'networkidle' });
  await shot(page, '33-devis-liste', { wait: 2400 });

  if (devisActif) {
    await page.goto(url(`/devis/${devisActif.id}`), { waitUntil: 'networkidle' });
    await shot(page, '34-devis-detail', { wait: 2600 });
  }

  await page.goto(url('/catalogue'), { waitUntil: 'networkidle' });
  await shot(page, '35-catalogue-rempli', { wait: 2400 });
  await tap(page, /Main-d.œuvre plombier/i).catch(() => {});
  await shot(page, '36-catalogue-modification', { wait: 1400 });

  await page.goto(url('/analytique'), { waitUntil: 'networkidle' });
  await shot(page, '37-activite-remplie', { wait: 2800 });

  await page.goto(url('/devis/nouveau'), { waitUntil: 'networkidle' });
  await page.locator('textarea').filter({ visible: true }).first().fill('Pose d’un mitigeur thermostatique.');
  await tap(page, /Préparer le devis/i).catch(() => {});
  await page.waitForTimeout(13000);
  if (await vis(page, /Il me manque/i).count().catch(() => 0)) {
    await tap(page, /Préparer sans ces précisions/i).catch(() => {});
    await page.waitForTimeout(13000);
  }
  await tap(page, /Choisir le client/i).catch(() => {});
  await shot(page, '38-client-selection-liste', { wait: 2400 });
  await ctx.close();
}

/* ═══════════════════════════════════════════ 4. États d'erreur */
console.info('\nÉtats d’erreur');
{
  const ctx = await contexte({ token: actif.token });
  const page = await ctx.newPage();

  // Serveur en panne au chargement de l'accueil.
  await page.route('**/api/dashboard**', (route) => route.fulfill({ status: 500, body: '{}' }));
  await page.goto(url('/'), { waitUntil: 'networkidle' });
  await shot(page, '39-accueil-erreur-serveur', { wait: 2600 });
  await page.unroute('**/api/dashboard**');

  // Catalogue injoignable.
  await page.route('**/api/pricebook**', (route) => route.abort('failed'));
  await page.goto(url('/catalogue'), { waitUntil: 'networkidle' });
  await shot(page, '40-catalogue-erreur-reseau', { wait: 2600 });
  await page.unroute('**/api/pricebook**');

  // Coupure réseau pendant la préparation d'un devis.
  await page.goto(url('/devis/nouveau'), { waitUntil: 'networkidle' });
  await page.locator('textarea').filter({ visible: true }).first()
    .fill("Remplacement du siphon sous l'evier et verification des raccordements.");
  await ctx.setOffline(true);
  await tap(page, /Préparer le devis/i).catch(() => {});
  await shot(page, '41-devis-erreur-reseau', { wait: 9000 });
  await ctx.setOffline(false);

  // Session valide mais serveur injoignable au démarrage.
  const ctx2 = await contexte({ token: actif.token });
  await ctx2.route('**/api/auth/session', (route) => route.abort('failed'));
  const page2 = await ctx2.newPage();
  await page2.goto(url('/'), { waitUntil: 'commit' });
  await shot(page2, '42-demarrage-hors-ligne', { wait: 6000 });
  await ctx2.close();
  await ctx.close();
}

await browser.close();
srv.close();
console.info(`\n${shots.length} captures dans ${OUT}\n`);
