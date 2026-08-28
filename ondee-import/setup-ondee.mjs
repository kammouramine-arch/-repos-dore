#!/usr/bin/env node
/**
 * ONDÉE — paramétrage complet du store Shopify.
 *
 * Crée : produits + variantes + prix barrés, collections, pages, menus,
 * et publie tout sur la boutique en ligne.
 *
 * Utilisation :
 *   SHOP=ondee.myshopify.com TOKEN=shpat_xxx node setup-ondee.mjs
 *   SHOP=... TOKEN=... node setup-ondee.mjs --dry-run   (n'écrit rien)
 *
 * Toutes les opérations GraphQL ont été validées contre le schéma Admin.
 * Le script est idempotent : relancé, il met à jour au lieu de dupliquer.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..');
const PAGES = path.join(RACINE, 'ondee-pages');

const SHOP = process.env.SHOP;
const TOKEN = process.env.TOKEN;
const API = process.env.API_VERSION || '2025-07';
const DRY = process.argv.includes('--dry-run');

if (!SHOP || !TOKEN) {
  console.error(`
  Il manque SHOP ou TOKEN.

    SHOP=ondee.myshopify.com TOKEN=shpat_xxxxx node setup-ondee.mjs

  Pour obtenir le token :
    Admin Shopify → Paramètres → Applications et canaux de vente
    → Développer des applications → Créer une application
    → Configurer les champs d'application Admin API
    → cocher : write_products, write_publications, write_content,
               write_online_store_pages, write_online_store_navigation,
               read_locations, write_inventory
    → Installer l'application → copier le jeton d'accès Admin API
  `);
  process.exit(1);
}

/* ── Client GraphQL ─────────────────────────────────────────── */
let appels = 0;
async function gql (query, variables = {}) {
  appels++;
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) {
    const corps = (await r.text()).slice(0, 300);
    if (r.status === 401 || r.status === 403)
      throw new Error(`Jeton refusé (HTTP ${r.status}). Vérifiez TOKEN et les droits de l'application.`);
    if (r.status === 404)
      throw new Error(`Store introuvable (HTTP 404). Vérifiez SHOP — il doit finir par .myshopify.com`);
    throw new Error(`HTTP ${r.status} — ${corps}`);
  }
  const j = await r.json();
  if (j.errors) throw new Error('GraphQL : ' + JSON.stringify(j.errors).slice(0, 500));
  const cle = Object.keys(j.data)[0];
  const ue = j.data[cle]?.userErrors;
  if (ue?.length) throw new Error(`${cle} → ` + ue.map(e => `${(e.field || []).join('.')}: ${e.message}`).join(' | '));
  // throttle courtois : Shopify limite à 2 req/s en REST, GraphQL en points
  await new Promise(res => setTimeout(res, 250));
  return j.data;
}

const ok  = m => console.log('  \x1b[32m✓\x1b[0m ' + m);
const inf = m => console.log('  \x1b[36m·\x1b[0m ' + m);
const av  = m => console.log('  \x1b[33m!\x1b[0m ' + m);

try {

/* ══ 0. GARDE-FOU : on refuse de toucher à autre chose qu'ONDÉE ══ */
console.log('\n═══ ONDÉE — paramétrage du store ' + (DRY ? '(SIMULATION)' : '') + ' ═══\n');
console.log('▸ Vérification du store');
const { shop } = await gql(`query { shop { name myshopifyDomain currencyCode ianaTimezone shopAddress { countryCodeV2 } } }`);
inf(`${shop.name} — ${shop.myshopifyDomain} — ${shop.currencyCode} — ${shop.shopAddress?.countryCodeV2 || '?'}`);

const interdit = /r[ée]va|maisonreva/i;
if (interdit.test(shop.name) || interdit.test(shop.myshopifyDomain)) {
  console.error(`\n  ⛔ ARRÊT : ce store ressemble à RÉVA ("${shop.name}"). Le script refuse d'écrire.\n`);
  process.exit(2);
}
if (shop.currencyCode !== 'EUR') av(`La devise est ${shop.currencyCode} et non EUR — les prix seront interprétés dans cette devise.`);
ok('Store validé, ce n\'est pas RÉVA');

/* ══ Publication « Boutique en ligne » ══ */
const { publications } = await gql(`query { publications(first: 25) { nodes { id name } } }`);
const online = publications.nodes.find(p => /online store|boutique en ligne/i.test(p.name)) || publications.nodes[0];
if (online) inf(`Publication cible : ${online.name}`);
else av('Aucune publication trouvée — les éléments resteront non publiés.');

async function publier (id) {
  if (!online || DRY) return;
  try { await gql(`mutation p($id: ID!, $in: [PublicationInput!]!) { publishablePublish(id: $id, input: $in) { userErrors { field message } } }`,
                  { id, in: [{ publicationId: online.id }] }); } catch (e) { av(`publication ${id} : ${e.message.slice(0,90)}`); }
}

/* ══ 1. PRODUITS ══ */
console.log('\n▸ Produits et variantes');
const produits = JSON.parse(fs.readFileSync(path.join(ICI, 'produits-shopify.json'), 'utf8'));
const idsProduits = {};

for (const p of produits) {
  const { productByIdentifier } = await gql(
    `query($h: ProductIdentifierInput!) { productByIdentifier(identifier: $h) { id title } }`,
    { h: { handle: p.handle } });
  const existant = productByIdentifier?.id || null;

  const input = {
    ...(existant ? { id: existant } : {}),
    handle: p.handle,
    title: p.title,
    descriptionHtml: p.descriptionHtml,
    vendor: 'ONDÉE',
    productType: p.productType,
    tags: p.tags,
    status: 'ACTIVE',
    seo: { title: p.seoTitle, description: p.seoDescription },
    productOptions: [{ name: p.optionName, position: 1, values: p.variants.map(v => ({ name: v.option })) }],
    variants: p.variants.map(v => ({
      sku: v.sku,
      price: v.price,
      ...(v.compareAtPrice ? { compareAtPrice: v.compareAtPrice } : {}),
      taxable: true,
      inventoryPolicy: 'DENY',
      inventoryItem: { tracked: true, requiresShipping: true,
        measurement: { weight: { value: v.grams, unit: 'GRAMS' } } },
      optionValues: [{ optionName: p.optionName, name: v.option }],
    })),
  };

  if (DRY) { inf(`(simulation) ${p.title} — ${p.variants.length} variantes`); continue; }
  const { productSet } = await gql(
    `mutation s($input: ProductSetInput!) { productSet(input: $input, synchronous: true) {
       product { id handle title variants(first: 20) { nodes { id sku price compareAtPrice } } }
       userErrors { field message } } }`, { input });
  idsProduits[p.handle] = productSet.product.id;
  await publier(productSet.product.id);
  ok(`${existant ? 'mis à jour' : 'créé'} — ${p.title} (${productSet.product.variants.nodes.length} variantes)`);
  for (const v of productSet.product.variants.nodes)
    inf(`   ${String(v.sku).padEnd(14)} ${String(v.price).padStart(7)} €${v.compareAtPrice ? '  barré ' + v.compareAtPrice : ''}`);
}

/* ══ 2. COLLECTIONS ══ */
console.log('\n▸ Collections');
const collections = [
  { handle: 'filtres', title: 'Filtres de douche',
    descriptionHtml: "<p>Le filtre ONDÉE et ses formules. Cinq étages de filtration, cartouche remplaçable, deux bandelettes de test dans la boîte.</p>",
    produits: ['ondee-filtre-de-douche'] },
  { handle: 'cartouches', title: 'Cartouches & recharges',
    descriptionHtml: "<p>Les cartouches C90 et l'abonnement. La cartouche dure 90 jours ; c'est elle, et pas le corps du filtre, qui fait le travail.</p>",
    produits: ['ondee-cartouche-c90', 'ondee-bandelettes-test-chlore'] },
  { handle: 'tout', title: 'Tout ONDÉE',
    descriptionHtml: "<p>L'intégralité de la gamme.</p>",
    produits: ['ondee-filtre-de-douche', 'ondee-cartouche-c90', 'ondee-bandelettes-test-chlore'] },
];
const idsCollections = {};
for (const c of collections) {
  if (DRY) { inf(`(simulation) collection ${c.title}`); continue; }
  const { collections: trouvees } = await gql(
    `query($q: String!) { collections(first: 1, query: $q) { nodes { id handle } } }`, { q: `handle:${c.handle}` });
  const ids = c.produits.map(h => idsProduits[h]).filter(Boolean);
  let id;
  if (trouvees.nodes[0]) {
    id = trouvees.nodes[0].id;
    await gql(`mutation u($input: CollectionInput!) { collectionUpdate(input: $input) { collection { id } userErrors { field message } } }`,
              { input: { id, title: c.title, descriptionHtml: c.descriptionHtml, products: ids } });
    ok(`mise à jour — ${c.title}`);
  } else {
    const r = await gql(`mutation c($input: CollectionInput!) { collectionCreate(input: $input) { collection { id handle } userErrors { field message } } }`,
              { input: { handle: c.handle, title: c.title, descriptionHtml: c.descriptionHtml, products: ids, sortOrder: 'MANUAL' } });
    id = r.collectionCreate.collection.id;
    ok(`créée — ${c.title} (${ids.length} produits)`);
  }
  idsCollections[c.handle] = id;
  await publier(id);
}

/* ══ 3. PAGES ══ */
console.log('\n▸ Pages');
const pages = [
  { f: 'mon-eau.html',                  titre: 'Mon eau',                     handle: 'mon-eau' },
  { f: 'ce-que-ondee-ne-fait-pas.html', titre: "Ce qu'ONDÉE ne fait pas",     handle: 'ce-que-ondee-ne-fait-pas' },
  { f: 'la-maison.html',                titre: 'La maison ONDÉE',             handle: 'la-maison' },
  { f: 'livraison-retours.html',        titre: 'Livraison & retours',         handle: 'livraison-retours' },
  { f: 'contact.html',                  titre: 'Contact',                     handle: 'contact', suffix: 'contact' },
  { f: 'cgv.html',                      titre: 'Conditions générales de vente', handle: 'cgv' },
  { f: 'mentions-legales.html',         titre: 'Mentions légales',            handle: 'mentions-legales' },
  { f: 'confidentialite.html',          titre: 'Confidentialité & cookies',   handle: 'confidentialite' },
];
const idsPages = {};
let marqueursRestants = 0;
for (const pg of pages) {
  const chemin = path.join(PAGES, pg.f);
  if (!fs.existsSync(chemin)) { av(`fichier absent : ${pg.f}`); continue; }
  const corps = fs.readFileSync(chemin, 'utf8');
  const nb = (corps.match(/\[\[[A-Z_]+\]\]/g) || []).length;
  marqueursRestants += nb;

  if (DRY) { inf(`(simulation) page ${pg.titre}${nb ? ` — ${nb} marqueurs` : ''}`); continue; }
  const { pages: trouvees } = await gql(`query($q: String!) { pages(first: 1, query: $q) { nodes { id handle } } }`, { q: `handle:${pg.handle}` });
  if (trouvees.nodes[0]) {
    const r = await gql(`mutation u($id: ID!, $page: PageUpdateInput!) { pageUpdate(id: $id, page: $page) { page { id handle } userErrors { field message code } } }`,
      { id: trouvees.nodes[0].id, page: { title: pg.titre, body: corps, isPublished: nb === 0, ...(pg.suffix ? { templateSuffix: pg.suffix } : {}) } });
    idsPages[pg.handle] = r.pageUpdate.page.id;
    ok(`mise à jour — ${pg.titre}${nb ? `  \x1b[33m(${nb} marqueurs → laissée en brouillon)\x1b[0m` : ''}`);
  } else {
    const r = await gql(`mutation c($page: PageCreateInput!) { pageCreate(page: $page) { page { id handle } userErrors { field message code } } }`,
      { page: { title: pg.titre, handle: pg.handle, body: corps, isPublished: nb === 0, ...(pg.suffix ? { templateSuffix: pg.suffix } : {}) } });
    idsPages[pg.handle] = r.pageCreate.page.id;
    ok(`créée — ${pg.titre}${nb ? `  \x1b[33m(${nb} marqueurs → laissée en brouillon)\x1b[0m` : ''}`);
  }
}

/* ══ 4. MENUS ══ */
console.log('\n▸ Navigation');
const pageItem = (titre, h) => idsPages[h] ? { title: titre, type: 'PAGE', resourceId: idsPages[h] } : null;
const collItem = (titre, h) => idsCollections[h] ? { title: titre, type: 'COLLECTION', resourceId: idsCollections[h] } : null;

const menus = [
  { handle: 'main-menu', titre: 'Menu principal', items: [
      pageItem('Mon eau', 'mon-eau'),
      collItem('Le filtre', 'filtres'),
      collItem('Cartouches', 'cartouches'),
      pageItem("Ce qu'on ne fait pas", 'ce-que-ondee-ne-fait-pas'),
    ] },
  { handle: 'footer', titre: 'Pied de page', items: [
      collItem('Le filtre ONDÉE', 'filtres'),
      collItem('Cartouches C90', 'cartouches'),
      pageItem('Rapport d\'eau', 'mon-eau'),
      pageItem("Ce qu'ONDÉE ne fait pas", 'ce-que-ondee-ne-fait-pas'),
      pageItem('La maison', 'la-maison'),
      pageItem('Livraison & retours', 'livraison-retours'),
      pageItem('Contact', 'contact'),
      pageItem('CGV', 'cgv'),
      pageItem('Mentions légales', 'mentions-legales'),
      pageItem('Confidentialité', 'confidentialite'),
    ] },
];
for (const m of menus) {
  const items = m.items.filter(Boolean);
  if (DRY) { inf(`(simulation) menu ${m.handle} — ${items.length} entrées`); continue; }
  const { menus: trouves } = await gql(`query($q: String!) { menus(first: 1, query: $q) { nodes { id handle } } }`, { q: `handle:${m.handle}` });
  if (trouves.nodes[0]) {
    await gql(`mutation u($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) { menuUpdate(id: $id, title: $title, handle: $handle, items: $items) { menu { id } userErrors { field message } } }`,
              { id: trouves.nodes[0].id, title: m.titre, handle: m.handle, items });
    ok(`mis à jour — ${m.handle} (${items.length} entrées)`);
  } else {
    await gql(`mutation c($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) { menuCreate(title: $title, handle: $handle, items: $items) { menu { id } userErrors { field message } } }`,
              { title: m.titre, handle: m.handle, items });
    ok(`créé — ${m.handle} (${items.length} entrées)`);
  }
}

/* ══ 5. STOCK ══ */
if (!DRY && process.env.STOCK) {
  console.log('\n▸ Stock initial');
  const qte = parseInt(process.env.STOCK, 10);
  const { locations } = await gql(`query { locations(first: 1) { nodes { id name } } }`);
  const loc = locations.nodes[0];
  if (loc) {
    const { products } = await gql(`query { products(first: 10, query: "vendor:ONDÉE") { nodes { variants(first: 20) { nodes { sku inventoryItem { id } } } } } }`);
    const items = products.nodes.flatMap(p => p.variants.nodes).filter(v => v.inventoryItem?.id);
    await gql(`mutation s($input: InventorySetQuantitiesInput!) { inventorySetQuantities(input: $input) { userErrors { field message } } }`,
      { input: { name: 'available', reason: 'correction', ignoreCompareQuantity: true,
                 quantities: items.map(v => ({ inventoryItemId: v.inventoryItem.id, locationId: loc.id, quantity: qte })) } });
    ok(`${items.length} variantes mises à ${qte} unités sur « ${loc.name} »`);
  }
}

/* ══ RÉSUMÉ ══ */
console.log(`\n═══ Terminé — ${appels} appels API ═══`);
if (DRY) { console.log('\n  Simulation : rien n\'a été écrit. Relancez sans --dry-run.\n'); process.exit(0); }
console.log(`
  Produits    ${Object.keys(idsProduits).length}
  Collections ${Object.keys(idsCollections).length}
  Pages       ${Object.keys(idsPages).length}
  Menus       ${menus.length}
`);
if (marqueursRestants) {
  console.log(`  \x1b[33m⚠ ${marqueursRestants} marqueurs [[…]] restent dans les pages légales.\x1b[0m`);
  console.log(`    Ces pages ont été laissées EN BROUILLON. Complétez-les dans`);
  console.log(`    ondee-pages/, relancez ce script, elles seront publiées.\n`);
}
console.log(`  Il reste à faire à la main (impossible par API) :`);
console.log(`    · Importer le thème : ondee-theme.zip → Thèmes → Importer`);
console.log(`    · Assigner le produit « filtre » à la section « L'offre » de l'accueil`);
console.log(`    · Réglages → Taxes : cocher « tous les prix incluent la taxe »`);
console.log(`    · Réglages → Expédition : port offert dès 49 €, 4,90 € en dessous`);
console.log(`    · Réglages → Paiements : activer Shopify Payments\n`);

} catch (e) {
  console.error('\n  \x1b[31m⛔ ' + (e?.message || e) + '\x1b[0m');
  console.error('  Rien de plus n\'a été écrit. Corrigez et relancez : le script est idempotent.\n');
  process.exit(1);
}
