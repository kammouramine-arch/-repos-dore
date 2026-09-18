import { expect, type Page } from '@playwright/test';
import type { PrismaClient } from '@prisma/client';

/** Console email must fail honestly. Seed verification only for subsequent
 * browser journeys; this is not a claim of inbox delivery/code validation. */
export async function continueWithVerifiedFixture(page: Page, prisma: PrismaClient, email: string) {
  await expect(page.getByRole('button', { name: /Créer mon compte/i })).toBeEnabled({ timeout: 30_000 });
  await expect(page.getByRole('alert').filter({ hasText: /.+/ }).first()).toBeVisible();
  await expect(page).toHaveURL(/\/inscription/);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  expect(user.emailVerifiedAt).toBeNull();
  await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
  await page.goto('/connexion?next=/app/bienvenue');
  await page.getByLabel(/Adresse email/i).fill(email);
  await page.getByLabel(/Mot de passe/i).fill('devisera-e2e-2026');
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await page.waitForURL('**/app/bienvenue', { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: /Bienvenue sur DEVISERA/i })).toBeVisible();
  await expect.poll(async () => (await page.request.get('/api/auth/session')).status()).toBe(200);
}
