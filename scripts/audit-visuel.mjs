/**
 * Audit visuel du parcours mobile.
 *
 * Le typage et les tests ne disent rien de ce que voit un artisan : ils ne
 * repèrent ni un écran collé en haut, ni une phrase en capitales, ni un champ
 * qui reste vide. Ce script sert le bundle web d'Expo, joue le parcours réel
 * (découverte, essai, inscription, accueil, écrans natifs, création de devis)
 * au format iPhone 15 Pro, capture chaque étape et signale toute erreur de
 * console.
 *
 *   npx expo export --platform web   (dans mobile/)
 *   node scripts/audit-visuel.mjs    (les captures vont dans /tmp/audit)
 *
 * Il crée un compte de test « ZZ AUDIT » sur le backend visé par
 * EXPO_PUBLIC_API_URL : à lancer sur une base de développement, pas en
 * production.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('mobile/dist');
const out = '/tmp/audit';
await mkdir(out, { recursive: true });
const types = { '.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.ttf':'font/ttf','.woff2':'font/woff2' };
const srv = createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  for (const p of [path.join(root, u), path.join(root, u, 'index.html'), path.join(root, 'index.html')]) {
    try { const d = await readFile(p); res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' }); return res.end(d); } catch {}
  }
  res.writeHead(404).end();
});
await new Promise((r) => srv.listen(4600, r));

const browser = await chromium.launch();
// iPhone 15 Pro : c'est l'appareil dont proviennent les captures.
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 130)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e).slice(0, 130)));

const shot = async (name) => { await page.waitForTimeout(900); await page.screenshot({ path: `${out}/${name}.png` }); console.log('  capture', name); };
const vis = (rx) => page.getByText(rx).filter({ visible: true }).first();
const seen = (rx, t=9000) => vis(rx).waitFor({ timeout: t }).then(()=>true).catch(()=>false);

await page.goto('http://127.0.0.1:4600/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
console.log('découverte affichée :', await seen(/Dictez, le devis s.écrit|DEVISIA/i));
await shot('01-decouverte');

// Parcourir les piliers
for (let i = 0; i < 4; i++) {
  const next = vis(/^Suivant$/); 
  if (await next.count().catch(()=>0)) { await next.click().catch(()=>{}); await page.waitForTimeout(700); }
}
await shot('02-essai');
console.log('écran essai :', await seen(/Essayez sans engagement|jours d.essai/i));

await vis(/Essayer gratuitement/i).click().catch(()=>{});
await page.waitForTimeout(1600);
await shot('03-inscription');

const email = `zz-audit-${Date.now()}@devisia-verif.test`;
const fill = async (l, v) => { const e = page.getByLabel(l).filter({visible:true}).first(); await e.waitFor({timeout:6000}); await e.fill(v); };
await fill('Nom de votre entreprise', 'ZZ AUDIT (a supprimer)').catch(()=>{});
await fill('Votre prénom', 'Audit').catch(()=>{});
await fill('Adresse email', email).catch(()=>{});
await fill('Mot de passe', 'MotDePasse!2026').catch(()=>{});
await vis(/Créer mon compte|Commencer/i).click().catch(()=>{});
await page.waitForTimeout(6500);
await shot('04-accueil');
console.log('accueil :', await seen(/Bonjour|premier devis|récupérer/i, 12000));

// Plus
await page.getByText('Plus', { exact: true }).filter({visible:true}).last().click().catch(()=>{});
await page.waitForTimeout(1600);
await shot('05-plus');
const plusText = await page.locator('body').innerText();
console.log('« Sur le web » présent :', /Sur le web/i.test(plusText));

for (const [label, name] of [['Abonnement','06-abonnement'], ['Catalogue de prix','07-catalogue'], ['Mon entreprise','08-entreprise'], ['Activité','09-activite']]) {
  await page.getByText(label, { exact: false }).filter({visible:true}).first().click().catch(()=>{});
  await page.waitForTimeout(2200);
  await shot(name);
  await page.goBack().catch(()=>{});
  await page.waitForTimeout(1200);
}

// Création de devis
await page.getByLabel('Créer un devis').filter({visible:true}).first().click().catch(()=>{});
await page.waitForTimeout(2000);
await shot('10-nouveau-devis');
const zone = page.locator('textarea').filter({visible:true}).first();
await zone.fill("Le client a une fuite sous l'evier. Remplacer le siphon, verifier les raccordements.").catch(()=>{});
await page.waitForTimeout(400);
await shot('11-description');
await vis(/Préparer le devis/i).click().catch(()=>{});
await page.waitForTimeout(9000);
await shot('12-etape-suivante');
console.log('questions ou vérification :', await seen(/Il me manque|Vérifiez votre devis/i, 12000));

console.log('\nERREURS CONSOLE (' + errors.length + ')');
[...new Set(errors)].slice(0,6).forEach(e => console.log('  ' + e));
console.log('compte créé :', email);
await browser.close(); srv.close();
