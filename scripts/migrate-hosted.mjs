import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

// Supabase's direct endpoint is IPv6-only on some projects. Its documented
// session pooler (5432, never transaction mode) supports Prisma migrations.
// Credentials stay within the hosting environment and are never printed.
const require = createRequire(import.meta.url);
const env = { ...process.env };
const direct = new URL(env.DIRECT_URL);
const app = new URL(env.DATABASE_URL);
const project = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(direct.hostname)?.[1];
if (project && app.hostname.endsWith('.pooler.supabase.com') &&
    decodeURIComponent(app.username).endsWith(`.${project}`) && app.pathname === direct.pathname) {
  app.port = '5432';
  app.searchParams.delete('pgbouncer');
  app.searchParams.set('connection_limit', '1');
  env.DIRECT_URL = app.toString();
  console.info('Migrating through the same Supabase project’s session-mode connection.');
}
const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], { env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
