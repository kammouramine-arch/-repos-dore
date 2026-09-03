import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://devisia:devisia@127.0.0.1:5432/devisia_test?schema=public';

/**
 * Parcours de bout en bout : inscription → onboarding → prospect → devis →
 * génération → PDF → envoi → consultation client → acceptation.
 *
 * L'application tourne avec le moteur IA local et le fournisseur email
 * « console » : aucun appel externe n'est nécessaire.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx prisma migrate deploy && npx next build && npx next start --port ${PORT}`,
    url: BASE_URL,
    // Toujours reconstruire et redémarrer : réutiliser un serveur existant peut
    // servir des ressources d'un build précédent (chunks CSS introuvables).
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NODE_ENV: 'production',
      DATABASE_URL,
      APP_URL: BASE_URL,
      AUTH_SECRET: 'e2e-secret-devisia-0123456789abcdef',
      AI_PROVIDER: 'local',
      EMAIL_PROVIDER: 'console',
      STORAGE_PROVIDER: 'local',
      STORAGE_LOCAL_DIR: './.tmp-storage-e2e',
    },
  },
});
