import { execSync } from 'node:child_process';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://devisia:devisia@127.0.0.1:5432/devisia_test?schema=public';

/**
 * Applique les migrations sur la base de test avant la suite d'intégration.
 *
 * `DIRECT_URL` est réécrite en même temps que `DATABASE_URL` : le schéma Prisma
 * l'utilise pour les migrations, et la laisser pointer vers la base de
 * développement ferait migrer la mauvaise base.
 */
export default function setup() {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL },
  });
}
