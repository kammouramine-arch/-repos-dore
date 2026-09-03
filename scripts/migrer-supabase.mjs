#!/usr/bin/env node
/**
 * Application des migrations Prisma sur Supabase, via l'API de gestion.
 *
 * `prisma migrate deploy` exige une connexion directe à la base, donc le mot de
 * passe PostgreSQL. Ce script s'en passe : il parle à l'API de gestion Supabase
 * avec un jeton d'accès obtenu par `supabase login`, et reproduit exactement ce
 * que ferait Prisma — la migration et la ligne correspondante dans
 * `_prisma_migrations`, dans une seule transaction.
 *
 *   SUPABASE_ACCESS_TOKEN=… node scripts/migrer-supabase.mjs --projet <ref>
 *   SUPABASE_ACCESS_TOKEN=… node scripts/migrer-supabase.mjs --projet <ref> --appliquer
 *
 * Sans --appliquer, il ne fait que constater. Aucun jeton, mot de passe ou
 * chaîne de connexion n'est affiché ni écrit sur le disque.
 */
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { argument, client, echec as stop, jetonRequis, projetCible } from './lib/supabase-api.mjs';

const appliquer = process.argv.includes('--appliquer');

/* ------------------------------------------------------------ 1. le projet */
const api = client(jetonRequis());
const projet = await projetCible(api, argument('--projet'));
const sql = (ref, requete) => api.sql(ref, requete);

/* --------------------------------------------- 2. l'état réel de la base */
const [{ present }] = await sql(
  projet.id,
  `SELECT EXISTS (
     SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
   ) AS present`,
);
if (!present) {
  stop(
    'La table `_prisma_migrations` est absente : cette base n’a jamais été migrée par Prisma.',
    'Vérifiez que vous ciblez bien la base de production DEVISIA.',
  );
}

const appliquees = await sql(
  projet.id,
  `SELECT migration_name, checksum, finished_at IS NOT NULL AS fini
     FROM _prisma_migrations ORDER BY started_at`,
);
const parNom = new Map(appliquees.map((m) => [m.migration_name, m]));

const dossiers = (await readdir('prisma/migrations', { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const locales = [];
for (const nom of dossiers) {
  const fichier = path.join('prisma/migrations', nom, 'migration.sql');
  const contenu = await readFile(fichier, 'utf8').catch(() => null);
  if (contenu == null) continue;
  locales.push({
    nom,
    contenu,
    checksum: createHash('sha256').update(contenu).digest('hex'),
  });
}

console.info('── État des migrations ─────────────────────────────────────');
const enAttente = [];
for (const m of locales) {
  const enBase = parNom.get(m.nom);
  if (!enBase) {
    console.info(`  ○ ${m.nom}  — en attente`);
    enAttente.push(m);
  } else if (!enBase.fini) {
    stop(`La migration ${m.nom} est enregistrée mais inachevée.`, 'À examiner à la main.');
  } else if (enBase.checksum !== m.checksum) {
    stop(
      `La migration ${m.nom} a été appliquée avec un contenu différent.`,
      'Le fichier local a changé après coup : ne rien appliquer avant d’avoir tranché.',
    );
  } else {
    console.info(`  ● ${m.nom}  — appliquée`);
  }
}

/**
 * Relevé du nombre de lignes de chaque table.
 *
 * Une migration additive ne doit toucher aucune donnée existante. Le relevé
 * avant/après le prouve plutôt que de l'affirmer.
 */
async function releve(ref) {
  const noms = await sql(
    ref,
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
  );
  const union = noms
    .map((t) => `SELECT '${t.table_name}' AS t, count(*)::int AS n FROM "${t.table_name}"`)
    .join(' UNION ALL ');
  const lignes = await sql(ref, `${union} ORDER BY t`);
  return new Map(lignes.map((l) => [l.t, l.n]));
}

const avant = await releve(projet.id);
console.info(`\n  tables applicatives avant : ${avant.size - 1}`);
console.info(`  lignes au total : ${[...avant.values()].reduce((a, b) => a + b, 0)}`);

if (enAttente.length === 0) {
  console.info('\n✔ Aucune migration en attente.\n');
  process.exit(0);
}

if (!appliquer) {
  console.info(`\n${enAttente.length} migration(s) à appliquer. Relancez avec --appliquer.\n`);
  process.exit(0);
}

/* ------------------------------------------------------------ 3. appliquer */
console.info('\n── Application ─────────────────────────────────────────────');
for (const m of enAttente) {
  // Une seule transaction : la table et sa trace dans `_prisma_migrations`
  // arrivent ensemble, ou pas du tout. C'est exactement ce que fait Prisma.
  const requete = `BEGIN;
${m.contenu}
INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES
  (gen_random_uuid()::text, '${m.checksum}', now(), '${m.nom}', NULL, NULL, now(), 1);
COMMIT;`;
  await sql(projet.id, requete);
  console.info(`  ✔ ${m.nom}`);
}

/* ------------------------------------------------------------ 4. vérifier */
console.info('\n── Vérification ────────────────────────────────────────────');
const apres = await sql(
  projet.id,
  `SELECT migration_name, checksum FROM _prisma_migrations ORDER BY started_at`,
);
for (const m of enAttente) {
  const enBase = apres.find((x) => x.migration_name === m.nom);
  if (!enBase) stop(`${m.nom} n'est pas enregistrée après application.`);
  if (enBase.checksum !== m.checksum) stop(`${m.nom} : empreinte incohérente après application.`);
  console.info(`  ${m.nom} : enregistrée, empreinte conforme`);
}

const apresReleve = await releve(projet.id);
console.info(`  tables applicatives après : ${apresReleve.size - 1}`);

const nouvelles = [...apresReleve.keys()].filter((t) => !avant.has(t));
const disparues = [...avant.keys()].filter((t) => !apresReleve.has(t));
// `_prisma_migrations` gagne une ligne par migration appliquée : c'est le
// but de l'opération, pas une donnée métier touchée.
const modifiees = [...avant.entries()].filter(
  ([t, n]) => t !== '_prisma_migrations' && apresReleve.get(t) !== n,
);

if (nouvelles.length) console.info(`  tables créées : ${nouvelles.join(', ')}`);
if (disparues.length) stop(`Des tables ont disparu : ${disparues.join(', ')}.`);
if (modifiees.length) {
  stop(
    `Le nombre de lignes a changé sur : ${modifiees.map(([t, n]) => `${t} (${n} → ${apresReleve.get(t)})`).join(', ')}.`,
    'Une migration additive ne devrait toucher aucune donnée existante.',
  );
}
console.info('  données existantes : inchangées (aucune table perdue, aucun décompte modifié)');
console.info('\n✔ Base de production à jour.\n');
