import fs from 'fs';
import path from 'path';
import { loadModule, parseSync } from 'pgsql-parser';

/**
 * Migrations, parsed with PostgreSQL's own grammar.
 *
 * This catches a broken migration before it reaches a database — a syntax error in a
 * function body, a missing comma, a policy that never compiles. It does *not* prove
 * the statements succeed against a real schema: only `supabase db push` does that.
 */

const dir = path.resolve(__dirname, '../supabase/migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const read = (file: string) => fs.readFileSync(path.join(dir, file), 'utf8');

beforeAll(async () => {
  await loadModule();
});

describe('migrations', () => {
  it('ships every migration the deployment guide lists', () => {
    expect(files).toEqual([
      '20260101000000_init.sql',
      '20260101000100_rls.sql',
      '20260101000200_functions.sql',
      '20260101000300_subscriptions.sql',
      '20260101000400_agents_insights.sql',
      '20260101000500_store_events.sql',
    ]);

    const guide = fs.readFileSync(path.resolve(__dirname, '../docs/DEPLOYMENT.md'), 'utf8');
    for (const file of files) expect(guide).toContain(file);
  });

  it.each(files)('%s parses as valid PostgreSQL', (file) => {
    const result = parseSync(read(file));
    expect(result.stmts?.length ?? 0).toBeGreaterThan(0);
  });

  it('applies in filename order without forward references', () => {
    // Each migration may only reference tables created in itself or earlier.
    const created = new Set<string>();

    for (const file of files) {
      const sql = read(file);
      for (const match of sql.matchAll(/create table public\.(\w+)/g)) created.add(match[1]);

      // `alter table` is the common way to depend on an earlier migration.
      for (const match of sql.matchAll(/alter table public\.(\w+)/g)) {
        expect(`${file} alters ${match[1]}: ${created.has(match[1])}`).toBe(
          `${file} alters ${match[1]}: true`,
        );
      }
    }
  });

  it('never drops user data on the way up', () => {
    for (const file of files) {
      const sql = read(file).toLowerCase();
      // Dropping the superseded daily counter is deliberate and pre-launch; nothing
      // else may drop a table holding someone's life.
      const drops = [...sql.matchAll(/drop table (?:if exists )?public\.(\w+)/g)].map((m) => m[1]);
      for (const table of drops) {
        expect(`${file} drops ${table}`).toBe(`${file} drops ai_usage`);
      }
    }
  });

  it('creates every table with row level security in the same repository', () => {
    const all = files.map(read).join('\n');
    const tables = [...all.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]);

    for (const table of tables) {
      const enabled =
        all.includes(`alter table public.${table} enable row level security`) ||
        new RegExp(`array\\[[^\\]]*'${table}'`).test(all);
      expect(`${table}: ${enabled}`).toBe(`${table}: true`);
    }
  });

  it('marks every security definer function with a pinned search_path', () => {
    const all = files.map(read).join('\n');
    const definers = [...all.matchAll(/create or replace function ([\s\S]*?)\$\$/g)]
      .map((m) => m[0])
      .filter((body) => body.includes('security definer'));

    expect(definers.length).toBeGreaterThan(5);
    for (const body of definers) {
      const name = body.match(/function public\.(\w+)/)?.[1] ?? 'unknown';
      expect(`${name}: ${body.includes('set search_path')}`).toBe(`${name}: true`);
    }
  });
});
