import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('launch navigation', () => {
  it('always offers Retour on stack screens, with a screen-specific fallback instead of Home', () => {
    const root = readFileSync('mobile/app/_layout.tsx', 'utf8');
    expect(root).toContain("<HeaderBack tint={tintColor ?? colors.accent} />");
    expect(root).not.toMatch(/canGoBack \? <HeaderBack/);
    expect(root).toContain("...backTo('/(app)/devis')");
    expect(root).toContain("...backTo('/(app)/clients')");
    const back = readFileSync('mobile/src/components/header-back.tsx', 'utf8');
    expect(back).toContain('if (router.canGoBack()) router.back();');
    expect(back).toContain('else router.replace(fallback);');
  });
  /*
   * Accueil · Clients · (+) · Documents · Outils.
   *
   * Les fonctions du métier — reçus, export comptable, marque — ont quitté les
   * réglages de compte pour l'onglet Outils ; « Mon espace » n'occupe plus une
   * destination et ne mélange plus préférences et produit.
   */
  it('keeps five destinations with the central + and gives the trade tools their own tab', () => {
    const bar = readFileSync('mobile/src/components/glass-tab-bar.tsx', 'utf8');
    expect(bar).not.toContain("name: 'prospects'");
    expect(bar.match(/\{ name: '/g)).toHaveLength(5);
    for (const name of ["'index'", "'clients'", "'nouveau'", "'devis'", "'outils'"]) expect(bar).toContain(`{ name: ${name}`);
    const tabs = readFileSync('mobile/app/(app)/_layout.tsx', 'utf8');
    expect(tabs).toContain('<Tabs.Screen name="prospects" options={{ href: null }} />');
    expect(tabs).toContain('<Tabs.Screen name="plus" options={{ href: null }} />');
    expect(tabs).toMatch(/name="outils"[\s\S]*apps/);
    expect(readFileSync('mobile/app/(app)/index.tsx', 'utf8')).not.toContain("router.push('/prospects')");

    const outils = readFileSync('mobile/app/(app)/outils.tsx', 'utf8');
    for (const href of ["'/depenses'", "'/comptable'", "'/marque'"]) expect(outils).toContain(href);

    // Et elles ne restent pas en double dans les réglages de compte.
    const plus = readFileSync('mobile/app/(app)/plus.tsx', 'utf8');
    for (const href of ["'/depenses'", "'/comptable'", "'/marque'"]) expect(plus).not.toContain(href);
  });
  it('no longer advertises the public quote-request form', () => {
    expect(readFileSync('packages/shared/src/plans.ts', 'utf8')).not.toContain('Formulaire de demande de devis pour votre site');
  });
  it('the Devis tab searches and filters by real statuses only', () => {
    const screen = readFileSync('mobile/app/(app)/devis.tsx', 'utf8');
    expect(screen).toContain('<SearchField');
    expect(screen).toContain("{ id: 'closed', label: 'Clos', statuses: ['EXPIRE', 'ANNULE'] }");
    expect(screen).not.toMatch(/label: 'Accept/);
  });
});
