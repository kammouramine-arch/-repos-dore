#!/usr/bin/env node
/**
 * Assemble les migrations Prisma en un seul fichier SQL exécutable tel quel
 * dans l'éditeur SQL de Supabase.
 *
 * Ce chemin existe pour une raison précise : il permet de migrer une base de
 * production sans installer le dépôt, sans Node, et surtout sans que le mot de
 * passe de la base quitte l'interface Supabase, où la session est déjà ouverte.
 *
 * Le fichier produit reste honnête vis-à-vis de Prisma : il crée la table
 * `_prisma_migrations` et y inscrit chaque migration avec sa somme de contrôle
 * réelle. `prisma migrate status` considère ensuite la base à jour, et les
 * migrations suivantes s'appliqueront normalement.
 *
 *   node scripts/build-production-sql.mjs > devisia-production.sql
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'prisma', 'migrations');

const migrations = readdirSync(dir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
  .map((name) => {
    const sql = readFileSync(path.join(dir, name, 'migration.sql'), 'utf8');
    return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  });

if (migrations.length === 0) throw new Error('Aucune migration trouvée.');

const out = [];
const w = (line = '') => out.push(line);

w('-- =========================================================================');
w('-- DEVISIA — initialisation de la base de production');
w('--');
w(`-- Généré depuis ${migrations.length} migration(s) Prisma :`);
for (const m of migrations) w(`--   ${m.name}`);
w('--');
w('-- À exécuter dans Supabase → SQL Editor → New query → Run.');
w('-- Le script est transactionnel : en cas d\'erreur, rien n\'est appliqué.');
w('-- Il refuse de s\'exécuter sur une base qui contient déjà les tables DEVISIA,');
w('-- afin de ne jamais écraser des données existantes.');
w('-- =========================================================================');
w();
w('BEGIN;');
w();
w('-- Garde-fou : une base déjà initialisée doit être migrée par');
w('-- `npm run db:deploy:production`, pas réinitialisée à la main.');
w('DO $$');
w('BEGIN');
w('  IF EXISTS (');
w('    SELECT 1 FROM information_schema.tables');
w("     WHERE table_schema = 'public'");
w("       AND table_name IN ('organizations', '_prisma_migrations')");
w('  ) THEN');
w('    RAISE EXCEPTION');
w("      'La base contient déjà les tables DEVISIA. Script interrompu, aucune donnée touchée.';");
w('  END IF;');
w('END $$;');
w();
w('-- Journal des migrations, dans la forme exacte attendue par Prisma.');
w('CREATE TABLE IF NOT EXISTS "_prisma_migrations" (');
w('  "id"                  VARCHAR(36) PRIMARY KEY,');
w('  "checksum"            VARCHAR(64)              NOT NULL,');
w('  "finished_at"         TIMESTAMPTZ,');
w('  "migration_name"      VARCHAR(255)             NOT NULL,');
w('  "logs"                TEXT,');
w('  "rolled_back_at"      TIMESTAMPTZ,');
w('  "started_at"          TIMESTAMPTZ DEFAULT now() NOT NULL,');
w('  "applied_steps_count" INTEGER     DEFAULT 0     NOT NULL');
w(');');

for (const m of migrations) {
  w();
  w('-- =========================================================================');
  w(`-- ${m.name}`);
  w('-- =========================================================================');
  w();
  w(m.sql.trimEnd());
  w();
  w(`-- Enregistrement de « ${m.name} » comme appliquée.`);
  w('INSERT INTO "_prisma_migrations"');
  w('  ("id", "checksum", "migration_name", "started_at", "finished_at", "applied_steps_count")');
  w('VALUES');
  w(`  (gen_random_uuid()::text, '${m.checksum}', '${m.name}', now(), now(), 1);`);
}

w();
w('COMMIT;');
w();
w('-- Vérification — doit renvoyer 32 tables applicatives et '
  + `${migrations.length} migration(s).`);
w('SELECT');
w("  (SELECT count(*) FROM information_schema.tables");
w("    WHERE table_schema = 'public' AND table_type = 'BASE TABLE') - 1 AS tables_applicatives,");
w('  (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL) AS migrations;');

process.stdout.write(out.join('\n') + '\n');
