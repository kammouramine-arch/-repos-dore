import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Credentials travel through the subprocess environment, never CLI arguments
// or logs. Archives contain personal data: use approved encrypted storage.
const mode = process.argv[2];
const name = process.argv[3];
if (!['backup', 'restore-test'].includes(mode) || !/^[a-zA-Z0-9_-]+$/.test(name ?? '')) {
  throw new Error('Usage: node scripts/database-backup.mjs backup|restore-test archive-name');
}
const source = process.env.BACKUP_DATABASE_URL;
if (!source) throw new Error('Set BACKUP_DATABASE_URL securely. Its value is never printed.');
const url = new URL(source);
if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('PostgreSQL connection required.');
const root = resolve('output/backups');
mkdirSync(root, { recursive: true });
const archive = join(root, `${name}.dump`);
const manifest = join(root, `${name}.json`);
const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGCONNECT_TIMEOUT: '15' };
if (url.searchParams.has('sslmode')) env.PGSSLMODE = url.searchParams.get('sslmode');
function run(binary, args) {
  const executable = process.env.PG_BIN ? join(process.env.PG_BIN, `${binary}${process.platform === 'win32' ? '.exe' : ''}`) : binary;
  const result = spawnSync(executable, args, { env, stdio: 'ignore' });
  if (result.status !== 0) throw new Error(`${binary} failed. Check connectivity, permissions and PostgreSQL client version. Connection details suppressed.`);
}
if (mode === 'backup') {
  if (existsSync(archive) || existsSync(manifest)) throw new Error('Archive already exists. Choose a new name; backups are never overwritten.');
  run('pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--file', archive]);
  const bytes = readFileSync(archive);
  writeFileSync(manifest, JSON.stringify({ createdAt: new Date().toISOString(), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), format: 'postgres-custom', includesExternalObjectStorage: false }, null, 2), { flag: 'wx' });
  console.log(`Backup verified for file integrity: ${name}. Restore rehearsal remains required.`);
} else {
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !/_restore_test$/.test(env.PGDATABASE)) throw new Error('Restore is restricted to a local database ending in _restore_test. Production restore is deliberately unsupported.');
  const metadata = JSON.parse(readFileSync(manifest, 'utf8'));
  if (createHash('sha256').update(readFileSync(archive)).digest('hex') !== metadata.sha256) throw new Error('Archive checksum mismatch.');
  // No --clean: refuse existing objects, never delete a database or tables.
  run('pg_restore', ['--exit-on-error', '--single-transaction', '--no-owner', '--no-acl', '--dbname', env.PGDATABASE, archive]);
  console.log('Archive restored to isolated test database. Validate records/files/application flows before declaring recovery successful.');
}
