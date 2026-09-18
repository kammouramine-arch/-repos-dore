#!/usr/bin/env node
/**
 * Application des migrations sur la base de production.
 *
 * Migrer une base qui porte de vraies données ne pardonne pas : ce script
 * refuse de partir sur une connexion inadaptée, montre ce qui va être appliqué,
 * puis vérifie le résultat. Aucun secret n'est écrit sur le disque ni affiché :
 * les URL sont lues dans l'environnement et systématiquement masquées.
 *
 * Utilisation :
 *   DIRECT_URL="postgresql://…:5432/postgres" npm run db:deploy:production
 *
 * `DATABASE_URL` (connexion applicative, éventuellement à travers un pooler)
 * n'est pas requise ici : les migrations passent toujours par la connexion
 * directe.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Masque identifiants et hôte : une URL de base ne doit jamais finir dans un journal. */
function redact(raw) {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^[^.]+/, '***');
    return `${url.protocol}//***:***@${host}:${url.port || '5432'}${url.pathname}`;
  } catch {
    return '<URL illisible>';
  }
}

function fail(message, hint) {
  console.error(`\n✖ ${message}`);
  if (hint) console.error(`\n  ${hint}\n`);
  process.exit(1);
}

const direct = process.env.DIRECT_URL?.trim();

if (!direct) {
  fail(
    'DIRECT_URL est absente.',
    'Supabase → Project Settings → Database → Connection string → URI (port 5432).\n' +
      '  DIRECT_URL="postgresql://…" npm run db:deploy:production',
  );
}

let parsed;
try {
  parsed = new URL(direct);
} catch {
  fail('DIRECT_URL n’est pas une URL valide.');
}

if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
  fail(`DIRECT_URL doit être une URL PostgreSQL (reçu « ${parsed.protocol} »).`);
}

// Le mode transaction d'un pooler ne sait ni tenir les verrous consultatifs de
// Prisma ni exécuter du DDL : la migration échouerait, ou pire, s'arrêterait au
// milieu. On refuse avant d'avoir touché quoi que ce soit.
const pooled =
  parsed.port === '6543' ||
  parsed.searchParams.has('pgbouncer') ||
  /pooler\./.test(parsed.hostname);

if (pooled) {
  fail(
    `DIRECT_URL semble passer par un pooler (${redact(direct)}).`,
    'Les migrations exigent la connexion directe, port 5432.\n' +
      '  Supabase → Database → Connection string → URI, en décochant « Use connection pooling ».',
  );
}

const env = { ...process.env, DIRECT_URL: direct, DATABASE_URL: direct };
const prisma = require.resolve('prisma/build/index.js');
const run = (args, capture = false) =>
  execFileSync(process.execPath, [prisma, ...args], {
    env,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
  });

console.info(`\nBase ciblée : ${redact(direct)}\n`);

// 1. État avant application — c'est la seule occasion de voir ce qui manque.
console.info('── État des migrations ──────────────────────────────────────');
let status = '';
try {
  status = run(['migrate', 'status'], true);
  console.info(status.trim());
} catch (error) {
  // `migrate status` sort en code non nul dès qu'une migration est en attente :
  // c'est une information, pas une erreur.
  status = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  console.info(status.trim());
}

if (/Database schema is up to date/i.test(status)) {
  console.info('\n✔ Aucune migration en attente. Rien à appliquer.\n');
} else {
  console.info('\n── Application ─────────────────────────────────────────────');
  run(['migrate', 'deploy']);
}

// 2. Vérification : on ne se fie pas au code de sortie, on regarde la base.
console.info('\n── Vérification ────────────────────────────────────────────');
const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient({ datasources: { db: { url: direct } } });

try {
  const [tables] = await client.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  const [applied] = await client.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`,
  );
  const failed = await client.$queryRawUnsafe(
    `SELECT migration_name FROM "_prisma_migrations"
      WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL`,
  );

  console.info(`  tables applicatives : ${tables.n - 1}`);
  console.info(`  migrations appliquées : ${applied.n}`);

  if (failed.length > 0) {
    fail(
      `Migrations inachevées : ${failed.map((m) => m.migration_name).join(', ')}.`,
      'Consultez `npx prisma migrate status` avant toute nouvelle tentative.',
    );
  }

  // Une lecture réelle vaut mieux qu'un comptage : elle prouve que le client
  // Prisma généré correspond bien au schéma désormais en base.
  await client.organization.count();
  console.info('  lecture applicative : OK');
  console.info('\n✔ Base de production prête.\n');
} finally {
  await client.$disconnect();
}
