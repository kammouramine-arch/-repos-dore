import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, rm } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

const API = 'http://127.0.0.1:3000';
const OUT = process.env.OUT ?? '/tmp/claude-0/captures';
const PORT = 4610;
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
const email = process.env.CAPTURE_EMAIL ?? 'zz-capture-devisera@devisera-verif.test';
const password = 'MotDePasse!2026';
// Un seul compte de capture, réutilisé : l'inscription est limitée en débit et
// le fournisseur email local ne délivre rien (503 après création du compte).
let out = await call('/api/auth/session', { method: 'POST', body: { email, password } }).catch(() => null);
if (!out) {
  await call('/api/auth/inscription', { method: 'POST', body: { email, password, companyName: 'Plomberie Martin', firstName: 'Amine' } }).catch(() => null);
  execSync(`psql "postgresql://devisia:devisia@127.0.0.1:5432/devisia" -q -c ${JSON.stringify(`UPDATE users SET "emailVerifiedAt" = now() WHERE email = '${email}'`)}`);
  out = await call('/api/auth/session', { method: 'POST', body: { email, password } });
}
const token = out.token;
const existing = await call('/api/customers', { token });
if (existing.total === 0) {
  const clients = [];
  for (const c of [
    { lastName: 'Bernard', firstName: 'Sylvie', phone: '0612345678', email: 'sylvie.bernard@exemple.fr', city: 'Lyon' },
    { companyName: 'SCI des Lilas', lastName: 'Moreau', phone: '0623456789', email: 'gestion@sci-lilas.fr', city: 'Villeurbanne' },
  ]) clients.push(await call('/api/customers', { method: 'POST', token, body: c }));
  for (const [i, title] of ['Remplacement du chauffe-eau', 'Réfection salle de bain', 'Fuite sous évier'].entries()) {
    const q = await call('/api/quotes', { method: 'POST', token, body: { customerId: clients[i % 2].id, title, items: [
      { kind: 'MAIN_OEUVRE', label: 'Main-d’œuvre plombier', unit: 'h', quantity: 3 + i, unitPriceCents: 5500, vatRate: 10 },
      { kind: 'MATERIAU', label: 'Fourniture', unit: 'u', quantity: 1, unitPriceCents: 74900, vatRate: 10 } ] } });
    await call(`/api/quotes/${q.id}/envoi`, { method: 'POST', token, body: {} }).catch(() => {});
  }
}
console.info('compte prêt', email);
// `next dev` compile chaque route au premier appel : on réchauffe celles du
// démarrage pour mesurer la séquence, pas le compilateur.
for (const p of ['/api/auth/session', '/api/dashboard?periode=30', '/api/customers', '/api/quotes?take=5']) {
  const started = Date.now();
  await call(p, { token }).catch(() => {});
  console.info('  réchauffé', p, `${Date.now() - started} ms`);
}


const browser = await chromium.launch();
async function contexte({ token: t = null, vu = true, viewport = { width: 393, height: 852 }, reduced = false, launched = false } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([tok, vuFlag, launchedFlag]) => {
    try {
      if (tok) localStorage.setItem('devisia.session.token', tok); else localStorage.removeItem('devisia.session.token');
      if (vuFlag) localStorage.setItem('devisia.onboarding.vu', '1'); else localStorage.removeItem('devisia.onboarding.vu');
      if (launchedFlag) localStorage.setItem('devisera.lancement.vu', '1'); else localStorage.removeItem('devisera.lancement.vu');
    } catch {}
  }, [t, vu, launched]);
  // Le bundle exporté est en mode production : `api.ts` remplace toute URL
  // locale par l'alias de production. On redirige ces appels vers l'API locale.
  await ctx.route('https://devisia-bice.vercel.app/**', async (route) => {
    const response = await route.fetch({ url: route.request().url().replace('https://devisia-bice.vercel.app', API) });
    await route.fulfill({ response });
  });
  return ctx;
}
const url = (p) => `http://127.0.0.1:${PORT}${p}`;

// 1. Séquence de lancement, connecté, premier lancement : une image toutes les 100 ms.
{
  const ctx = await contexte({ token });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.info('  console:', m.text().slice(0, 120)); });
  await page.goto(url('/'), { waitUntil: 'commit' });
  const t0 = Date.now();
  for (let i = 0; i <= 26; i += 1) {
    const target = t0 + i * 100;
    const wait = target - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
    await page.screenshot({ path: `${OUT}/launch-${String(i * 100).padStart(4, '0')}.png` });
  }
  await page.getByText(/Bonjour|Hello/).first().waitFor({ timeout: 20000 }).catch(() => console.info('  accueil non affiché'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/home-393.png` });
  await page.screenshot({ path: `${OUT}/home-393-full.png`, fullPage: true });
  await ctx.close();
}
// 2. Lancement répété (plus vif) — quelques images.
{
  const ctx = await contexte({ token, launched: true });
  const page = await ctx.newPage();
  await page.goto(url('/'), { waitUntil: 'commit' });
  const t0 = Date.now();
  for (const ms of [300, 700, 1000, 1200, 1500]) { const w = t0 + ms - Date.now(); if (w > 0) await page.waitForTimeout(w); await page.screenshot({ path: `${OUT}/repeat-${ms}.png` }); }
  await ctx.close();
}
// 3. Réduire les animations.
{
  const ctx = await contexte({ token, reduced: true });
  const page = await ctx.newPage();
  await page.goto(url('/'), { waitUntil: 'commit' });
  const t0 = Date.now();
  for (const ms of [300, 700, 1100]) { const w = t0 + ms - Date.now(); if (w > 0) await page.waitForTimeout(w); await page.screenshot({ path: `${OUT}/reduced-${ms}.png` }); }
  await ctx.close();
}
// 4. Autres tailles d'écran : accueil.
for (const [name, viewport] of [['home-375x667', { width: 375, height: 667 }], ['home-430x932', { width: 430, height: 932 }]]) {
  const ctx = await contexte({ token, launched: true, viewport });
  const page = await ctx.newPage();
  await page.goto(url('/'), { waitUntil: 'commit' });
  await page.getByText(/Bonjour|Hello/).first().waitFor({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await ctx.close();
}
// 5. Déconnecté : connexion, puis erreur d'identifiants.
{
  const ctx = await contexte({ launched: true });
  const page = await ctx.newPage();
  await page.goto(url('/'), { waitUntil: 'commit' });
  await page.waitForTimeout(3200);
  await page.screenshot({ path: `${OUT}/auth-connexion.png` });
  await page.getByLabel(/Adresse email|Email address/).first().fill('karim@plomberie-martin.fr').catch(() => {});
  await page.getByLabel(/Mot de passe|Password/).first().fill('MauvaisMotDePasse!9').catch(() => {});
  await page.getByText(/^Se connecter$|^Sign in$/).filter({ visible: true }).first().click().catch(() => {});
  await page.getByText(/incorrect/i).first().waitFor({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/auth-connexion-erreur.png` });
  await ctx.close();
}
// 6. Panne serveur au démarrage : session locale présente, API répond 500.
{
  const ctx = await contexte({ token, launched: true });
  await ctx.route('**/api/auth/session**', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'INTERNAL', message: 'x', retryable: true, requestId: 'a1b2c3d4' } }) }));
  await ctx.addInitScript(() => { try { localStorage.removeItem('devisia.session.snapshot'); } catch {} });
  const page = await ctx.newPage();
  await page.goto(url('/'), { waitUntil: 'commit' });
  await page.waitForTimeout(6500);
  await page.screenshot({ path: `${OUT}/startup-server-failure.png` });
  await ctx.close();
}
// 7. Hors ligne au démarrage.
{
  const ctx = await contexte({ token, launched: true });
  await ctx.route('**/api/**', (route) => route.abort('connectionfailed'));
  const page = await ctx.newPage();
  await page.goto(url('/'), { waitUntil: 'commit' });
  await page.waitForTimeout(6500);
  await page.screenshot({ path: `${OUT}/startup-offline.png` });
  await ctx.close();
}
// 8. Espace, compte, paiements, suppression — écrans de réglages.
for (const [name, route] of [['espace', '/plus'], ['compte', '/compte'], ['paiements', '/paiements'], ['suppression', '/suppression'], ['clients', '/clients']]) {
  const ctx = await contexte({ token, launched: true });
  const page = await ctx.newPage();
  await page.goto(url(route), { waitUntil: 'commit' });
  await page.waitForTimeout(3600);
  await page.screenshot({ path: `${OUT}/settings-${name}.png` });
  await page.screenshot({ path: `${OUT}/settings-${name}-full.png`, fullPage: true });
  await ctx.close();
}
// 9. Mon compte atteint depuis Mon espace : l'en-tête porte le bouton retour.
{
  const ctx = await contexte({ token, launched: true });
  const page = await ctx.newPage();
  await page.goto(url('/plus'), { waitUntil: 'commit' });
  await page.getByText(/Informations personnelles|Personal information/).first().click({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/settings-compte-pushed.png` });
  await ctx.close();
}
await browser.close();
srv.close();
console.info('captures dans', OUT);
