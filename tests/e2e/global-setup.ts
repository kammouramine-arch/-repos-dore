import { fork, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { assertDemoDatabase } from '../../scripts/lib/demo-safety';

const requireModule = createRequire(resolve('package.json'));

export default async function setup() {
  const database = process.env.E2E_DATABASE_URL ?? 'postgresql://devisia:devisia@127.0.0.1:5432/devisia_test?schema=public';
  assertDemoDatabase({ NODE_ENV: 'test', DEVISIA_ALLOW_DEMO_SEED: 'true', DATABASE_URL: database });
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'production', DATABASE_URL: database, DIRECT_URL: database,
    APP_URL: `http://127.0.0.1:${process.env.E2E_PORT || 3100}`, AUTH_SECRET: 'e2e-secret-devisia-0123456789abcdef',
    AI_PROVIDER: 'local', EMAIL_PROVIDER: 'console', STORAGE_PROVIDER: 'local', STORAGE_LOCAL_DIR: './.tmp-storage-e2e' };
  for (const [module, args] of [['prisma/build/index.js', ['migrate', 'deploy']], ['next/dist/bin/next', ['build']]] as const) {
    const result = spawnSync(process.execPath, [requireModule.resolve(module), ...args], { env, stdio: 'inherit', timeout: 300_000 });
    if (result.error || result.status !== 0) throw new Error(`E2E preparation failed: ${module}`);
  }
  const server = fork(resolve('scripts/e2e-server.mjs'), [], { env, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  const exited = new Promise<number | null>((resolveExit) => server.once('exit', resolveExit));
  const stop = async () => {
    if (server.exitCode !== null) throw new Error('E2E server exited unexpectedly');
    server.send('shutdown');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const code = await Promise.race([exited, new Promise<never>((_, reject) => {
        timer = setTimeout(() => { server.kill(); reject(new Error('E2E server did not shut down cleanly')); }, 15_000);
      })]);
      if (code !== 143) throw new Error(`Unexpected E2E shutdown code: ${code}`);
    } finally { clearTimeout(timer); }
  };
  try {
    await new Promise<void>((ready, reject) => {
      const timer = setTimeout(() => reject(new Error('E2E server startup timeout')), 60_000);
      server.once('message', () => { clearTimeout(timer); ready(); });
      server.once('error', (error) => { clearTimeout(timer); reject(error); });
      server.once('exit', () => { clearTimeout(timer); reject(new Error('E2E server exited during startup')); });
    });
  } catch (error) { server.kill(); throw error; }
  return stop;
}
