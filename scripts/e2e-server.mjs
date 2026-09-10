// Private IPC lifecycle: no HTTP shutdown endpoint and no Windows shell tree.
import { startServer } from 'next/dist/server/lib/start-server.js';

async function main() {
  await startServer({ dir: process.cwd(), port: Number(process.env.E2E_PORT || 3100), hostname: '127.0.0.1', isDev: false });
  process.on('message', (message) => {
    if (message === 'shutdown') process.emit('SIGTERM', 'SIGTERM');
  });
  process.on('disconnect', () => process.emit('SIGTERM', 'SIGTERM'));
  process.send?.('ready');
}
main().catch(() => { console.error('E2E server startup failed'); process.exit(1); });
