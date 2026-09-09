import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient({ datasources: { db: { url: process.env.E2E_DATABASE_URL ?? 'postgresql://devisia:devisia@127.0.0.1:5432/devisia_test?schema=public' } } });
test.afterAll(async () => { await prisma.$disconnect(); });

test('verification restores persisted cooldown and respects exact rate-limit delay', async ({ page }) => {
  const email = `cooldown-${randomUUID()}@devisera.test`;
  // Isolated pending identity: this case tests cooldown, not signup delivery.
  // Other journeys exercise signup; do not consume their shared IP quota.
  const user = await prisma.user.create({ data: { email, passwordHash: await hash('devisera-e2e-2026', 12) } });
  await prisma.organization.create({ data: { name: 'Cooldown fixture', slug: `cooldown-${randomUUID()}`, members: { create: { userId: user.id, role: 'OWNER' } } } });
  const challenge = { id: randomUUID(), email, tokenHash: 'fixture-not-a-valid-code', sentAt: new Date(), expiresAt: new Date(Date.now() + 600_000), windowStart: new Date(), sendCount: 1 };
  await prisma.emailChallenge.upsert({ where: { userId: user.id }, create: { userId: user.id, ...challenge }, update: challenge });
  await page.goto('/connexion');
  await page.getByLabel(/Adresse email/i).fill(email);
  await page.getByLabel(/Mot de passe/i).fill('devisera-e2e-2026');
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await expect(page).toHaveURL(/\/verification/);
  await expect(page.getByRole('button', { name: /Renvoyer dans \d+ s/ })).toBeDisabled();
  await page.clock.install();
  await page.clock.fastForward(61_000);
  await expect(page.getByRole('button', { name: 'Renvoyer le code', exact: true })).toBeEnabled();
  await page.route('**/api/auth/code-email', async (route) => {
    await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { code: 'RATE_LIMITED', retryAfterSeconds: 2541, message: 'internal rate-limit detail' } }) });
  });
  await page.getByRole('button', { name: 'Renvoyer le code', exact: true }).click();
  await expect(page.getByText('Vous pourrez demander un nouveau code dans 2541 s.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Renvoyer dans 2541 s', exact: true })).toBeDisabled();
  await expect(page.getByText('internal rate-limit detail')).toHaveCount(0);
});
