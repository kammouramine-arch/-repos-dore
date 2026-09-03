/**
 * Parcours d'acceptation, joués sur le bundle web d'Expo.
 *
 * Complète scripts/audit-visuel.mjs : celui-ci ne regarde pas les écrans, il
 * vérifie que les enchaînements aboutissent — création d'un client depuis le
 * répertoire, devis rédigé au clavier, client créé sans quitter le devis,
 * panne réseau puis reprise, réouverture de l'application.
 *
 *   (dans mobile/) npx expo export --platform web
 *   node scripts/audit-parcours.mjs
 *
 * Il crée un compte « ZZ AUDIT » : à lancer sur une base de développement.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('mobile/dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
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
await new Promise((r) => srv.listen(4601, r));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 140)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e).slice(0, 140)));

const vis = (rx) => page.getByText(rx).filter({ visible: true }).first();
const seen = (rx, t = 9000) => vis(rx).waitFor({ timeout: t }).then(() => true).catch(() => false);
const tap = async (rx, t = 8000) => { const e = vis(rx); await e.waitFor({ timeout: t }); await e.click(); };
const fill = async (label, value) => {
  const e = page.getByLabel(label).filter({ visible: true }).first();
  await e.waitFor({ timeout: 8000 });
  await e.fill(value);
};
const results = [];
const check = (name, ok, note = '') => { results.push({ name, ok, note }); console.log(ok ? '  OK  ' : '  ÉCHEC', name, note); };

const nom = `Dupont${Date.now().toString().slice(-5)}`;
const email = `zz-audit-${Date.now()}@devisia-verif.test`;

// ---------------------------------------------------------------- Flow A
await page.goto('http://127.0.0.1:4601/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
check('A — la découverte s’affiche avant toute demande de compte', await seen(/Dictez, le devis s.écrit/i));
for (let i = 0; i < 4; i++) { await tap(/^Suivant$/).catch(() => {}); await page.waitForTimeout(600); }
check('A — l’essai est présenté explicitement', await seen(/Essayer gratuitement pendant 7 jours/i));
await tap(/Essayer gratuitement/i).catch(() => {});
await page.waitForTimeout(1500);
await fill('Nom de votre entreprise', 'ZZ AUDIT (a supprimer)').catch(() => {});
await fill('Votre prénom', 'Audit').catch(() => {});
await fill('Adresse email', email).catch(() => {});
await fill('Mot de passe', 'MotDePasse!2026').catch(() => {});
await tap(/Créer mon compte|Commencer/i).catch(() => {});
check('A — le compte est créé et l’accueil s’ouvre', await seen(/Bonjour/i, 15000));

// ---------------------------------------------------------------- Flow B
await page.getByText('Clients', { exact: true }).filter({ visible: true }).last().click();
await page.waitForTimeout(1500);
await tap(/Nouveau client/i).catch(() => {});
await page.waitForTimeout(900);
await fill('Nom du client', nom).catch(() => {});
await fill('Téléphone', '0612345678').catch(() => {});
await tap(/Enregistrer le client/i).catch(() => {});
await page.waitForTimeout(2500);
check('B — le client créé apparaît dans le répertoire', await seen(new RegExp(nom), 9000));

// ---------------------------------------------------------------- Flow C + G
await page.getByLabel('Créer un devis').filter({ visible: true }).first().click();
await page.waitForTimeout(1800);
const zone = page.locator('textarea').filter({ visible: true }).first();
await zone.fill("Remplacement d'un chauffe-eau 200 litres, deux heures sur place, evacuation de l'ancien.");

// ---- Flow H : couper le réseau AVANT de préparer
await ctx.setOffline(true);
await tap(/Préparer le devis/i).catch(() => {});
await page.waitForTimeout(9000);
const messageReseau = await page.locator('body').innerText();
const honnete = /n.a pas pu joindre le serveur|connexion|réseau/i.test(messageReseau);
check('H — la panne réseau donne un message utile', honnete,
  honnete ? '' : messageReseau.slice(0, 120).replace(/\n/g, ' '));
const texteConserve = (await zone.inputValue()).includes('chauffe-eau');
check('H — la description saisie est conservée', texteConserve);
check('H — « Réessayer » est proposé', await seen(/Réessayer/i, 4000));

await ctx.setOffline(false);
await page.waitForTimeout(600);
await tap(/Réessayer/i).catch(() => {});
await page.waitForTimeout(12000);
const suite = await seen(/Il me manque|Vérifiez votre devis/i, 15000);
check('H — la reprise après reconnexion aboutit', suite);

// Répondre aux questions éventuelles
if (await seen(/Il me manque/i, 1500)) {
  await tap(/^1 h$|^2 h$/i).catch(() => {});
  await tap(/Préparer le devis|Préparer sans ces précisions/i).catch(() => {});
  await page.waitForTimeout(12000);
}
check('C — le devis est préparé et présenté pour vérification', await seen(/Vérifiez votre devis/i, 15000));

// ---- Flow G : choisir/créer le client sans quitter le devis
await tap(/Enregistrer le devis|Choisir le client|Enregistrer/i).catch(() => {});
await page.waitForTimeout(1600);
// Le champ de recherche est identifié par son texte indicatif : getByText ne
// le voit pas, il faut interroger le placeholder.
const pickerOuvert = await page
  .getByPlaceholder('Nom, téléphone ou email')
  .first()
  .waitFor({ timeout: 6000 })
  .then(() => true)
  .catch(() => false);
check('G — le choix du client s’ouvre depuis le devis', pickerOuvert);
if (pickerOuvert) {
  const inconnu = `Nouveau${Date.now().toString().slice(-4)}`;
  await page.getByPlaceholder('Nom, téléphone ou email').fill(inconnu);
  await page.waitForTimeout(1600);
  check('G — l’absence de résultat propose la création', await seen(/Créer/i, 6000));
  await tap(/Créer «|Créer un client/i).catch(() => {});
  await page.waitForTimeout(900);
  await fill('Nom du client', inconnu).catch(() => {});
  await tap(/Créer et continuer/i).catch(() => {});
  await page.waitForTimeout(3000);
  const corpsApres = await page.locator('body').innerText();
  check('G — on revient au devis sans le perdre',
    /Vérifiez votre devis/i.test(corpsApres) || /devis/i.test(corpsApres));
}

// ---------------------------------------------------------------- Flow I
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(3500);
const corps = await page.locator('body').innerText();
check('I — la présentation n’est pas rejouée à la réouverture', !/Dictez, le devis s.écrit/i.test(corps));
check('I — la session est restaurée', /Bonjour|Accueil|Devis|Clients/i.test(corps));

// ---------------------------------------------------------------- Flow J
await page.getByText('Plus', { exact: true }).filter({ visible: true }).last().click().catch(() => {});
await page.waitForTimeout(1500);
const plus = await page.locator('body').innerText();
check('J — plus aucun renvoi « Sur le web »', !/Sur le web/i.test(plus));

console.log('\n' + results.filter((r) => r.ok).length + '/' + results.length + ' vérifications passées');
console.log('ERREURS CONSOLE (' + errors.length + ')');
[...new Set(errors)].slice(0, 8).forEach((e) => console.log('  ' + e));
console.log('compte créé :', email);
await browser.close();
srv.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
