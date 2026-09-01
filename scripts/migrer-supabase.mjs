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

const API = 'https://api.supabase.com/v1';
const jeton = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const appliquer = process.argv.includes('--appliquer');
const refDemande = process.argv[process.argv.indexOf('--projet') + 1];

function stop(message, indice) {
  console.error(`\n✖ ${message}`);
  if (indice) console.error(`\n  ${indice}\n`);
  process.exit(1);
}

if (!jeton) {
  stop(
    'SUPABASE_ACCESS_TOKEN est absent.',
    'Obtenez-le par `supabase login`, ou sur https://supabase.com/dashboard/account/tokens',
  );
}

async function appel(chemin, options = {}) {
  const reponse = await fetch(`${API}${chemin}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${jeton}`,
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const texte = await reponse.text();
  let corps = null;
  try {
    corps = JSON.parse(texte);
  } catch {
    /* réponse non JSON : on garde le texte brut pour le message d'erreur */
  }
  if (!reponse.ok) {
    // Le jeton peut apparaître dans une trace : on ne rend que le statut.
    stop(
      `L'API Supabase a répondu ${reponse.status} sur ${chemin}.`,
      corps?.message ?? texte.slice(0, 200),
    );
  }
  return corps;
}

/** Exécute du SQL sur la base du projet et renvoie les lignes. */
const sql = (ref, requete) =>
  appel(`/projects/${ref}/database/query`, {
    method: 'POST',
    body: JSON.stringify({ query: requete }),
  });

/* ------------------------------------------------------------ 1. le projet */
const projets = await appel('/projects');
if (!Array.isArray(projets) || projets.length === 0) stop('Aucun projet accessible avec ce jeton.');

console.info('\nProjets accessibles :');
for (const p of projets) {
  console.info(`  ${p.id}  ${p.name}  (${p.region}, ${p.status})`);
}

const projet = refDemande
  ? projets.find((p) => p.id === refDemande)
  : projets.length === 1
    ? projets[0]
    : null;

if (!projet) {
  stop(
    refDemande ? `Projet « ${refDemande} » introuvable.` : 'Plusieurs projets : précisez lequel.',
    'node scripts/migrer-supabase.mjs --projet <ref>',
  );
}
console.info(`\nProjet ciblé : ${projet.name} (${projet.id})\n`);

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

const tables = await sql(
  projet.id,
  `SELECT count(*)::int AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
);
console.info(`\n  tables applicatives avant : ${tables[0].n - 1}`);

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

const tablesApres = await sql(
  projet.id,
  `SELECT count(*)::int AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
);
console.info(`  tables applicatives après : ${tablesApres[0].n - 1}`);
console.info('\n✔ Base de production à jour.\n');
