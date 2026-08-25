import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { loadModule, parseSync } from 'pgsql-parser';

/**
 * Migrations, parsed with PostgreSQL's own grammar.
 *
 * This catches a broken migration before it reaches a database — a syntax error in a
 * function body, a missing comma, a policy that never compiles. It does *not* prove
 * the statements succeed against a real schema: only `supabase db push` does that.
 */

const root = path.resolve(__dirname, '..');
const dir = path.resolve(root, 'supabase/migrations');
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
      '20260101000600_ai_router.sql',
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

  it('stops after the duplicate branch, so a replayed store event cannot rewrite entitlement', () => {
    // A live database found this: without the RETURN the function fell through and
    // re-applied the payload, downgrading a paying account on a replayed webhook.
    const sql = read('20260101000500_store_events.sql');
    const body = sql.slice(
      sql.indexOf('create or replace function public.apply_store_subscription'),
      sql.indexOf('revoke all on function public.apply_store_subscription'),
    );
    expect(body).toMatch(/if v_inserted = 0 then[\s\S]*?return query select false, true;\s*\n\s*return;/);
  });

  it('stops after refusing a rate-limited call, so it cannot also report success', () => {
    const sql = read('20260101000500_store_events.sql');
    const body = sql.slice(
      sql.indexOf('create or replace function public.check_rate_limit'),
      sql.indexOf('revoke all on function public.check_rate_limit'),
    );
    expect(body).toMatch(/if v_count > p_limit then[\s\S]*?return;\s*\n\s*end if;/);
  });

  it('keeps every user-facing RPC self-sufficient about the auth schema', () => {
    // security invoker functions calling auth.uid() depend on the caller's privileges
    // on the auth schema, which is not guaranteed. Definer + explicit auth.uid()
    // filtering removes that dependency.
    const all = files.map(read).join('\n');
    expect(all).not.toContain('security invoker');
    for (const fn of ['get_life_progress', 'get_habit_streak', 'export_my_data', 'forget_everything', 'get_usage_summary']) {
      const at = all.lastIndexOf(`function public.${fn}`);
      expect(`${fn}: ${all.slice(at, at + 400).includes('security definer')}`).toBe(`${fn}: true`);
    }
  });

  it('ships the live verification script the deployment guide points at', () => {
    const verify = fs.readFileSync(path.resolve(__dirname, '../supabase/tests/verify.sql'), 'utf8');
    // It must assert isolation, not just run queries.
    expect(verify).toMatch(/user B can READ user A/);
    expect(verify).toMatch(/a user promoted themselves/);
    expect(verify).toMatch(/idempotency is broken/);
    // And clean up after itself so it is safe on a real project.
    expect(verify).toMatch(/delete from auth\.users where id in \(a, b\)/);
  });

  it('keeps the pasteable bundle identical to the migrations', () => {
    // supabase/dist/all-migrations.sql is what someone copies into the SQL editor when
    // they are setting a project up without a terminal. It must never drift.
    let result = 'in sync';
    try {
      execFileSync('node', ['scripts/build-sql.mjs', '--check'], { cwd: root, stdio: 'pipe' });
    } catch {
      result = 'STALE — run: npm run db:bundle';
    }
    expect(result).toBe('in sync');
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
