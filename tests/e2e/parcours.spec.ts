import { expect, test, type Page } from '@playwright/test';

/**
 * Parcours principal de DEVISIA, du compte vide au devis envoyé et consulté.
 * Chaque exécution crée sa propre entreprise : les tests restent indépendants.
 */

const stamp = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page) {
  const email = `e2e-${stamp()}@devisia.test`;
  await page.goto('/inscription');
  await page.getByLabel(/Nom de votre entreprise/i).fill('Plomberie E2E');
  await page.getByLabel(/^Prénom/i).fill('Karim');
  await page.getByLabel(/^Nom$/i).fill('Benali');
  await page.getByLabel(/Adresse email/i).fill(email);
  await page.getByLabel(/Mot de passe/i).fill('devisia-e2e-2026');
  await page.getByRole('button', { name: /Créer mon compte/i }).click();
  await page.waitForURL('**/app/bienvenue', { timeout: 30_000 });
  return email;
}

test.describe('parcours complet', () => {
  test('de l’inscription au devis envoyé et consulté', async ({ page, context }) => {
    // 1. Inscription -----------------------------------------------------------
    await signUp(page);
    await expect(page.getByRole('heading', { name: /Bienvenue sur DEVISIA/i })).toBeVisible();

    // 2. Onboarding ------------------------------------------------------------
    await page.getByLabel(/Raison sociale/i).fill('Plomberie E2E');
    await page.getByLabel(/Taux horaire par défaut/i).fill('55');
    await page.getByRole('button', { name: /Terminer et créer mon premier devis/i }).click();
    await expect(page.getByText(/Bienvenue sur DEVISIA\./i).first()).toBeVisible({ timeout: 20_000 });

    // 3. Catalogue de prix -----------------------------------------------------
    await page.goto('/app/catalogue');
    await page.getByRole('button', { name: /Nouvel article/i }).click();
    await page.getByLabel(/Désignation/i).fill('Siphon évier laiton');
    await page.getByLabel(/Prix d’achat HT/i).fill('14');
    await page.getByLabel(/Prix de vente HT/i).fill('32');
    await page.getByLabel(/Mots-clés/i).fill('siphon, evier');
    await page.getByRole('button', { name: /Ajouter au catalogue/i }).click();
    // Le catalogue s'affiche en tableau sur desktop et en liste sur mobile.
    await expect(
      page.getByText('Siphon évier laiton').filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 20_000 });

    // 4. Création d'un client --------------------------------------------------
    await page.goto('/app/clients');
    await page.getByRole('button', { name: /Nouveau client/i }).first().click();
    await page.getByLabel(/^Prénom/i).fill('Paul');
    await page.getByLabel(/^Nom$/i).fill('Roussel');
    await page.getByLabel(/^Email/i).fill(`client-${stamp()}@devisia.test`);
    await page.getByRole('button', { name: /Créer le client/i }).click();
    await expect(page.getByText('Paul Roussel').filter({ visible: true }).first()).toBeVisible({
      timeout: 20_000,
    });

    // 5. Création du devis par description -------------------------------------
    await page.goto('/app/devis/nouveau');
    await page
      .getByLabel(/Décrivez votre chantier/i)
      .fill(
        "Le client a une fuite sous l'évier. Il faut remplacer le siphon, vérifier les raccordements et prévoir environ une heure de main-d'œuvre.",
      );
    await page.getByRole('button', { name: /Préparer le devis/i }).click();

    await expect(page.getByRole('heading', { name: /Vérifiez votre devis/i })).toBeVisible({
      timeout: 60_000,
    });

    // Le catalogue de l'entreprise a bien été utilisé.
    await expect(
      page.getByText('Catalogue', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();

    // 6. Vérification et enregistrement ----------------------------------------
    // Un seul client existe : la première option réelle suit le libellé d'invite.
    await page.locator('#customerId').selectOption({ index: 1 });
    await page.getByRole('button', { name: /Enregistrer le devis/i }).click();
    await page.waitForURL(/\/app\/devis\/[0-9a-f-]{36}$/, { timeout: 30_000 });

    const quoteUrl = page.url();
    await expect(page.getByText(/Brouillon/i).first()).toBeVisible();

    // 7. PDF -------------------------------------------------------------------
    const quoteId = quoteUrl.split('/').pop()!;
    const pdf = await page.request.get(`/api/quotes/${quoteId}/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toContain('application/pdf');
    expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');

    // 8. Envoi au client -------------------------------------------------------
    await page.getByRole('button', { name: /Envoyer le devis/i }).click();
    await page.getByRole('button', { name: /Envoyer maintenant/i }).click();
    await expect(page.getByText(/Devis envoyé/i).first()).toBeVisible({ timeout: 30_000 });

    // 9. Consultation par le client -------------------------------------------
    const publicLink = await page
      .getByText(/\/devis\//)
      .filter({ visible: true })
      .first()
      .innerText();
    const token = publicLink.trim().split('/devis/').pop()!;

    const clientPage = await context.newPage();
    await clientPage.goto(`/devis/${token}`);
    await expect(clientPage.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(clientPage.getByText(/Total TTC/i).first()).toBeVisible();

    // La page sert à lire le devis et à contacter l'artisan, pas à accepter ou
    // refuser dans DEVISIA.
    await expect(clientPage.getByText(/Votre devis est disponible/i)).toBeVisible();
    await expect(clientPage.getByRole('button', { name: /Accepter|Refuser/i })).toHaveCount(0);
    await clientPage.close();

    // 10. Retour côté artisan : consultation et indicateurs --------------------
    await page.goto(quoteUrl);
    await expect(page.getByText(/^Consulté$/).filter({ visible: true }).first()).toBeVisible({
      timeout: 30_000,
    });

    await page.goto('/app');
    // Le tableau de bord mesure ce qui est chiffré et envoyé : DEVISIA ne
    // demande aucune acceptation au client.
    await expect(page.getByText(/Chiffre d’affaires devisé/i).first()).toBeVisible();
    await expect(page.getByText(/Taux d’acceptation/i)).toHaveCount(0);

    await expect(page.getByText(/Devis acceptés/i)).toHaveCount(0);
  });

  test('la page publique refuse un jeton inconnu', async ({ page }) => {
    const response = await page.goto('/devis/jeton-inexistant-devisia');
    expect(response?.status()).toBe(404);
  });

  test('l’espace applicatif est protégé', async ({ page }) => {
    await page.goto('/app');
    await page.waitForURL('**/connexion**', { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /Content de vous revoir/i })).toBeVisible();
  });
});
