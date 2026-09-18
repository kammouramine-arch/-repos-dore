import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, rm } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

/**
 * Captures iPhone (393×852) des états retravaillés par la passe premium :
 * Clients vide/peuplé, Activité vide/peuplée, appui sur le « + », création
 * initiale, préparation IA, confirmation de rétrogradation, changement en
 * attente. Deux comptes : un vide, un peuplé. Le bundle web est exporté avec
 * `EXPO_PUBLIC_CAPTURE_HARNESS=1` pour la route d'aperçu abonnement.
 */
const API = 'http://127.0.0.1:3000';
const OUT = process.env.OUT ?? '/tmp/claude-0/captures-premium';
const PORT = 4611;
const root = path.resolve('/home/user/-repos-dore/mobile/dist');
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const srv = createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  for (const p of [path.join(root, u), path.join(root, u, 'index.html'), path.join(root, 'index.html')]) {
    try { const d = await readFile(p); res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' }); return res.end(d); } catch {}
  }
  res.writeHead(404).end();
});
await new Promise((r) => srv.listen(PORT, r));

async function call(pathname, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['content-type'] = 'application/json';
  const res = await fetch(`${API}${pathname}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text(); let parsed = null; try { parsed = JSON.parse(text); } catch {}
  if (!res.ok) throw new Error(`${method} ${pathname} -> ${res.status} ${text.slice(0, 200)}`);
  return parsed?.data ?? parsed;
}
const password = 'MotDePasse!2026';
async function account(email, companyName) {
  let out = await call('/api/auth/session', { method: 'POST', body: { email, password } }).catch(() => null);
  if (!out) {
    await call('/api/auth/inscription', { method: 'POST', body: { email, password, companyName, firstName: 'Amine' } }).catch(() => null);
    execSync(`psql "postgresql://devisia:devisia@127.0.0.1:5432/devisia" -q -c ${JSON.stringify(`UPDATE users SET "emailVerifiedAt" = now() WHERE email = '${email}'`)}`);
    out = await call('/api/auth/session', { method: 'POST', body: { email, password } });
  }
  // Comptes de capture réutilisés d'une passe à l'autre : on prolonge leur
  // essai local pour que l'API n'oppose pas « abonnement inactif ».
  execSync(`psql "postgresql://devisia:devisia@127.0.0.1:5432/devisia" -q -c ${JSON.stringify(`UPDATE subscriptions SET status = 'trialing', "trialEndsAt" = now() + interval '30 days', "currentPeriodEnd" = now() + interval '30 days' WHERE "organizationId" IN (SELECT om."organizationId" FROM organization_members om JOIN users u ON u.id = om."userId" WHERE u.email = '${email}')`)}`);
  return out.token;
}
const full = await account(process.env.CAPTURE_EMAIL ?? 'zz-capture-devisera@devisera-verif.test', 'Plomberie Martin');
const empty = await account(process.env.CAPTURE_EMPTY_EMAIL ?? 'zz-capture-vide@devisera-verif.test', 'Atelier Neuf');
{
  const existing = await call('/api/customers', { token: full });
  if (existing.total === 0) {
    for (const c of [
      { lastName: 'Bernard', firstName: 'Sylvie', phone: '0612345678', email: 'sylvie.bernard@exemple.fr', city: 'Lyon' },
      { companyName: 'SCI des Lilas', lastName: 'Moreau', phone: '0623456789', email: 'gestion@sci-lilas.fr', city: 'Villeurbanne' },
      { lastName: 'Garnier', firstName: 'Paul', phone: '0634567890', city: 'Bron' },
    ]) await call('/api/customers', { method: 'POST', token: full, body: c });
  }
  const quotes = await call('/api/quotes', { token: full });
  if (quotes.total === 0) {
    const customers = (await call('/api/customers', { token: full })).items;
    for (const [i, title] of ['Remplacement du chauffe-eau', 'Réfection salle de bain', 'Fuite sous évier'].entries()) {
      const q = await call('/api/quotes', { method: 'POST', token: full, body: { customerId: customers[i % customers.length].id, title, items: [
        { kind: 'MAIN_OEUVRE', label: 'Main-d’œuvre plombier', unit: 'h', quantity: 3 + i, unitPriceCents: 5500, vatRate: 10 },
        { kind: 'MATERIAU', label: 'Fourniture', unit: 'u', quantity: 1, unitPriceCents: 74900 + i * 20000, vatRate: 10 } ] } });
      if (i < 2) await call(`/api/quotes/${q.id}/envoi`, { method: 'POST', token: full, body: {} }).catch(() => {});
    }
  }
  const leads = await call('/api/leads', { token: full });
  if (!leads.length) {
    const now = Date.now();
    for (const l of [
      { contactName: 'Nadia Roux', title: 'Remplacement chaudière gaz', description: 'Chaudière de 2009 en panne, maison 110 m².', city: 'Lyon', phone: '0645678901', estimatedCents: 420000, status: 'NOUVEAU', source: 'FORMULAIRE_WEB' },
      { contactName: 'Karim Benali', title: 'Fuite salle de bain', description: 'Trace d’humidité sous la baignoire.', city: 'Vénissieux', phone: '0656789012', status: 'CONTACTE', source: 'TELEPHONE' },
      { contactName: 'Copropriété Les Érables', title: 'Entretien annuel VMC', city: 'Lyon', estimatedCents: 89000, status: 'DEVIS_ENVOYE', source: 'EMAIL' },
      { contactName: 'Julie Fontaine', title: 'Création salle d’eau', description: 'Combles aménagés, arrivée d’eau à créer.', city: 'Caluire', estimatedCents: 780000, status: 'GAGNE', source: 'FORMULAIRE_WEB' },
    ]) await call('/api/leads', { method: 'POST', token: full, body: l });
    // Étale les dates pour peupler « Aujourd’hui », « Cette semaine », « Plus tôt ».
    execSync(`psql "postgresql://devisia:devisia@127.0.0.1:5432/devisia" -q -c ${JSON.stringify(`UPDATE leads SET "lastActivityAt" = now() - interval '3 days', "createdAt" = now() - interval '3 days' WHERE "contactName" IN ('Karim Benali')`)}`);
    execSync(`psql "postgresql://devisia:devisia@127.0.0.1:5432/devisia" -q -c ${JSON.stringify(`UPDATE leads SET "lastActivityAt" = now() - interval '12 days', "createdAt" = now() - interval '12 days' WHERE "contactName" IN ('Copropriété Les Érables', 'Julie Fontaine')`)}`);
    void now;
  }
}
console.info('comptes prêts');

const browser = await chromium.launch();
async function contexte({ token, reduced = false, bare = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, reducedMotion: reduced ? 'reduce' : 'no-preference', hasTouch: true, isMobile: true, locale: 'fr-FR' });
  if (!bare) await ctx.addInitScript(([tok]) => {
    try {
      if (tok) localStorage.setItem('devisia.session.token', tok); else localStorage.removeItem('devisia.session.token');
      localStorage.setItem('devisia.onboarding.vu', '1');
      localStorage.setItem('devisera.lancement.vu', '1');
    } catch {}
  }, [token]);
  await ctx.route('https://devisia-bice.vercel.app/**', async (route) => {
    const response = await route.fetch({ url: route.request().url().replace('https://devisia-bice.vercel.app', API) });
    await route.fulfill({ response });
  });
  return ctx;
}
const url = (p) => `http://127.0.0.1:${PORT}${p}`;
async function shot(page, name, settle = 900) { await page.waitForTimeout(settle); await page.screenshot({ path: `${OUT}/${name}.png` }); console.info('  •', name); }
async function open(ctx, p, waitFor) {
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.info('  console:', m.text().slice(0, 140)); });
  await page.goto(url(p), { waitUntil: 'commit' });
  if (waitFor) await page.getByText(waitFor).first().waitFor({ timeout: 20000 }).catch(() => console.info('  attendu non trouvé :', waitFor));
  return page;
}

// Clients et Activité : vide puis peuplé.
for (const [label, token] of [['vide', empty], ['peuple', full]]) {
  const ctx = await contexte({ token });
  let page = await open(ctx, '/clients', /Vos clients|Your clients/);
  await shot(page, `clients-${label}`, 1200);
  if (label === 'peuple') { await page.getByText('Sylvie').first().waitFor({ timeout: 8000 }).catch(() => {}); await shot(page, 'clients-peuple-charge', 800); }
  await page.close();
  page = await open(ctx, '/prospects', /Vos prospects|Your leads/);
  await shot(page, `activite-${label}`, 1800);
  if (label === 'peuple') {
    await page.getByText('Nadia').first().waitFor({ timeout: 8000 }).catch(() => {});
    await shot(page, 'activite-peuple-charge', 800);
    await page.getByRole('tab', { name: /À suivre/ }).first().click().catch(() => console.info('  filtre non cliquable'));
    await shot(page, 'activite-filtre-a-suivre', 700);
    await page.getByRole('tab', { name: /Gagnés/ }).first().click().catch(() => {});
    await shot(page, 'activite-filtre-gagnes', 700);
  }
  await page.close();
  await ctx.close();
}
// Accueil : salutation contextuelle, carrousel « Vos devis », « À compléter » ; Mon espace centré.
for (const [label, token] of [['vide', empty], ['peuple', full]]) {
  const ctx = await contexte({ token });
  let page = await open(ctx, '/', /Bonjour|Hello/);
  await shot(page, `home-${label}`, 1800);
  await page.screenshot({ path: `${OUT}/home-${label}-full.png`, fullPage: true });
  if (label === 'peuple') {
    const card = page.getByText('Sylvie').first();
    const box = await card.boundingBox().catch(() => null);
    if (box) { await page.mouse.move(box.x + box.width - 20, box.y + 40); await page.mouse.down(); await page.mouse.move(box.x + 20, box.y + 40, { steps: 12 }); await page.mouse.up(); await shot(page, 'home-carrousel-swipe', 700); }
  }
  await page.close();
  page = await open(ctx, '/plus', /Bienvenue|Welcome/);
  await shot(page, `espace-${label}`, 1200);
  await page.close();
  await ctx.close();
}
// Onglet Devis : archive avec recherche et filtres ; vide et peuplé.
for (const [label, token] of [['vide', empty], ['peuple', full]]) {
  const ctx = await contexte({ token });
  const page = await open(ctx, '/devis', /Vos devis|Your quotes/);
  await shot(page, `devis-${label}`, 1500);
  if (label === 'peuple') {
    await page.getByRole('tab', { name: /Envoyés|Sent/ }).first().click().catch(() => {});
    await shot(page, 'devis-filtre-envoyes', 700);
    await page.getByRole('tab', { name: /Tous|All/ }).first().click().catch(() => {});
    await page.getByRole('textbox').first().fill('Sylvie').catch(() => {});
    await shot(page, 'devis-recherche', 700);
  }
  await page.close();
  await ctx.close();
}
// Retour depuis un devis ouvert sans pile derrière (lien direct).
{
  const ctx = await contexte({ token: full });
  const page = await open(ctx, '/devis', /Vos devis/);
  await page.getByText('Sylvie').first().click().catch(() => {});
  await shot(page, 'devis-detail-retour', 1200);
  await page.close();
  await ctx.close();
}
// Bouton « + » : état enfoncé, puis arrivée de la création.
{
  const ctx = await contexte({ token: full });
  const page = await open(ctx, '/', /Bonjour|Hello/);
  await page.waitForTimeout(900);
  const plus = page.getByRole('button', { name: /Créer|Create/ }).first();
  const box = await plus.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(140);
    await page.screenshot({ path: `${OUT}/plus-enfonce.png` }); console.info('  • plus-enfonce');
    await page.mouse.up();
    const t0 = Date.now();
    for (const ms of [120, 260, 420, 620, 900]) { const w = t0 + ms - Date.now(); if (w > 0) await page.waitForTimeout(w); await page.screenshot({ path: `${OUT}/creation-arrivee-${ms}.png` }); }
    console.info('  • creation-arrivee-*');
  } else console.info('  bouton + introuvable');
  await shot(page, 'creation-initiale', 600);
  // Préparation IA : description saisie, puis l'écran de préparation.
  const zone = page.getByRole('textbox').first();
  await zone.fill('Le client a une fuite sous l’évier. Remplacer le siphon, vérifier les raccordements, environ une heure sur place.').catch(() => {});
  await shot(page, 'creation-saisie', 400);
  await page.getByRole('button', { name: /Préparer le devis|Prepare the quote/ }).first().click().catch(() => console.info('  préparer non cliquable'));
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/ia-preparation.png` }); console.info('  • ia-preparation');
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/ia-preparation-suite.png` }); console.info('  • ia-preparation-suite');
  await ctx.close();
}
// Réduire les animations : Clients peuplé.
{
  const ctx = await contexte({ token: full, reduced: true });
  const page = await open(ctx, '/clients', /Vos clients|Your clients/);
  await shot(page, 'clients-reduced-motion', 1800);
  await ctx.close();
}
// Abonnement : confirmation de rétrogradation et changement en attente (banc de capture).
{
  // Contexte nu : ni jeton ni drapeau d'accueil, sinon la garde d'authentification
  // renvoie vers la connexion avant que la route publique ne se rende.
  const ctx = await contexte({ token: null, bare: true });
  const page = await open(ctx, '/apercu-abonnement', /Passer à Essentiel/);
  await shot(page, 'abonnement-confirmation-retrogradation', 900);
  await page.getByRole('button', { name: /Annuler|Cancel/ }).last().click().catch(() => {});
  await shot(page, 'abonnement-changement-en-attente', 600);
  await ctx.close();
}
await browser.close();
srv.close();
console.info('captures dans', OUT);
