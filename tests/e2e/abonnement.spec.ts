import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/**
 * Parcours commercial : essai de 7 jours, expiration, page d'abonnement.
 * Le test manipule directement la base pour simuler la fin de l'essai.
 */
const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.E2E_DATABASE_URL ??
        'postgresql://devisia:devisia@127.0.0.1:5432/devisia_test?schema=public',
    },
  },
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe('abonnement', () => {
  test('essai de 7 jours puis conversion', async ({ page }) => {
    const email = `essai-${Date.now().toString(36)}@devisia.test`;

    // Inscription : l'essai démarre automatiquement.
    await page.goto('/inscription');
    await page.getByLabel(/Nom de votre entreprise/i).fill('Plomberie Sept Jours');
    await page.getByLabel(/Adresse email/i).fill(email);
    await page.getByLabel(/Mot de passe/i).fill('devisia-e2e-2026');
    await page.getByRole('button', { name: /Créer mon compte/i }).click();
    await page.waitForURL('**/app/bienvenue', { timeout: 30_000 });

    const user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });
    const organizationId = user?.memberships[0]?.organizationId;
    expect(organizationId).toBeTruthy();

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: organizationId! },
    });
    expect(subscription?.status).toBe('trialing');
    expect(subscription?.trialStartedAt).not.toBeNull();

    // 7 jours exactement, pas 14.
    const days = Math.round(
      ((subscription!.trialEndsAt!.getTime() - subscription!.trialStartedAt!.getTime()) /
        (24 * 60 * 60 * 1000)) *
        10,
    ) / 10;
    expect(days).toBe(7);

    // Pendant l'essai, la création de devis est ouverte.
    await page.goto('/app/parametres/abonnement');
    await expect(
      page.getByText(/Période d’essai|essai de 7 jours/i).filter({ visible: true }).first(),
    ).toBeVisible();

    // Fin de l'essai.
    await prisma.subscription.update({
      where: { organizationId: organizationId! },
      data: { trialEndsAt: new Date(Date.now() - 60_000) },
    });

    await page.goto('/app');
    await expect(
      page.getByText(/Votre essai gratuit est terminé/i).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 20_000 });

    // Le serveur refuse l'écriture, avec un message explicite.
    const refused = await page.request.post('/api/quotes', {
      data: {
        customerId: '00000000-0000-0000-0000-000000000000',
        title: 'Devis après expiration',
        items: [
          {
            kind: 'SERVICE',
            label: 'Prestation',
            unit: 'u',
            quantity: 1,
            unitPriceCents: 10000,
            vatRate: 20,
            discountRate: 0,
          },
        ],
      },
    });
    expect(refused.status()).toBe(402);
    const payload = (await refused.json()) as { error: { code: string; message: string } };
    expect(payload.error.code).toBe('PLAN_LIMIT');
    expect(payload.error.message).toMatch(/essai gratuit est terminé/i);

    // Les données restent lisibles : rien n'est supprimé.
    const readable = await page.request.get('/api/quotes');
    expect(readable.ok()).toBeTruthy();

    // La page d'abonnement propose les trois formules.
    await page.goto('/app/parametres/abonnement');
    for (const plan of ['Essentiel', 'Pro', 'Entreprise']) {
      await expect(
        page.getByText(plan, { exact: true }).filter({ visible: true }).first(),
      ).toBeVisible();
    }
  });

  test('la page tarifs annonce 7 jours d’essai', async ({ page }) => {
    await page.goto('/tarifs');
    await expect(page.getByText(/7 jours/i).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/14 jours/i)).toHaveCount(0);
  });
});
