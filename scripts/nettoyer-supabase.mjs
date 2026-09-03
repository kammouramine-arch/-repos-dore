#!/usr/bin/env node
/**
 * Suppression des organisations de test sur une base Supabase.
 *
 * Les sondages successifs de la production ont laissé des comptes « ZZ … »
 * qu'aucune route d'API ne sait supprimer — DEVISIA n'expose pas la suppression
 * d'une organisation, et c'est voulu. Ce script passe par l'API de gestion,
 * donc sans mot de passe de base.
 *
 *   SUPABASE_ACCESS_TOKEN=… node scripts/nettoyer-supabase.mjs --projet <ref>
 *   SUPABASE_ACCESS_TOKEN=… node scripts/nettoyer-supabase.mjs --projet <ref> --supprimer
 */
import { argument, client, echec, jetonRequis, projetCible } from './lib/supabase-api.mjs';

/** Le préfixe est la seule porte d'entrée : rien d'autre n'est touché. */
const PREFIXE = 'ZZ ';

const api = client(jetonRequis());
const projet = await projetCible(api, argument('--projet'));
const supprimer = process.argv.includes('--supprimer');

const organisations = await api.sql(
  projet.id,
  `SELECT o.id, o.name, o."createdAt"::text AS creee,
          (SELECT count(*)::int FROM quotes q WHERE q."organizationId" = o.id) AS devis,
          (SELECT count(*)::int FROM customers c WHERE c."organizationId" = o.id) AS clients
     FROM organizations o
    WHERE o.name LIKE '${PREFIXE}%'
    ORDER BY o."createdAt"`,
);

if (organisations.length === 0) {
  console.info('✔ Aucune organisation de test. Rien à faire.\n');
  process.exit(0);
}

console.info(`${organisations.length} organisation(s) de test :\n`);
for (const o of organisations) {
  console.info(`  ${o.name}  ·  créée le ${o.creee.slice(0, 10)}  ·  ${o.devis} devis, ${o.clients} clients`);
}

// Garde-fou : une organisation de test qui porte de vraies données n'en est
// probablement pas une. On s'arrête et on laisse un humain regarder.
const suspectes = organisations.filter((o) => o.devis > 3 || o.clients > 3);
if (suspectes.length > 0) {
  echec(
    `${suspectes.length} organisation(s) « ${PREFIXE}… » contiennent des données réelles.`,
    'Vérifiez-les à la main. Rien n’a été supprimé.',
  );
}

if (!supprimer) {
  console.info('\nRelancez avec --supprimer pour les effacer définitivement.\n');
  process.exit(0);
}

const [{ total: avant }] = await api.sql(projet.id, 'SELECT count(*)::int AS total FROM organizations');
const ids = organisations.map((o) => `'${o.id}'`).join(', ');

// Les utilisateurs sont relevés avant la suppression : une fois l'organisation
// partie, l'adhésion qui les rattache n'existe plus.
const utilisateurs = await api.sql(
  projet.id,
  `SELECT DISTINCT "userId" AS id FROM organization_members WHERE "organizationId" IN (${ids})`,
);

await api.sql(
  projet.id,
  `BEGIN;
   DELETE FROM organizations WHERE id IN (${ids});
   ${utilisateurs.length ? `DELETE FROM users WHERE id IN (${utilisateurs.map((u) => `'${u.id}'`).join(', ')});` : ''}
   COMMIT;`,
);

const [{ total: apres }] = await api.sql(projet.id, 'SELECT count(*)::int AS total FROM organizations');
const restantes = await api.sql(
  projet.id,
  `SELECT count(*)::int AS n FROM organizations WHERE name LIKE '${PREFIXE}%'`,
);

console.info(`\n✔ ${organisations.length} organisation(s) et ${utilisateurs.length} compte(s) supprimés.`);
console.info(`  organisations « ${PREFIXE}… » restantes : ${restantes[0].n}`);
console.info(`  organisations au total : ${avant} → ${apres}\n`);
