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
   * Cinq destinations, et une action.
   *
   *     [ Accueil · Clients · Documents · Outils · Compte ]  ( + )
   *
   * Le « + » n'est pas une destination : le placer parmi les onglets imposait
   * six cibles sur la largeur d'un iPhone et laissait croire qu'il menait
   * quelque part. Il ouvre une feuille, montée dans la barre.
   */
  it('carries five destinations and keeps creation as an action, not a tab', () => {
    const bar = readFileSync('mobile/src/components/glass-tab-bar.tsx', 'utf8');
    expect(bar.match(/\{ name: '/g)).toHaveLength(5);
    for (const name of ["'index'", "'clients'", "'devis'", "'outils'", "'plus'"]) {
      expect(bar).toContain(`{ name: ${name}`);
    }
    expect(bar).not.toContain("{ name: 'nouveau'");
    // Le « + » mène droit au devis à la voix : plus de menu intermédiaire.
    expect(bar).toContain("router.push('/devis/nouveau?dicter=1')");

    const tabs = readFileSync('mobile/app/(app)/_layout.tsx', 'utf8');
    expect(tabs).toContain('<Tabs.Screen name="prospects" options={{ href: null }} />');
    expect(tabs).toContain('<Tabs.Screen name="nouveau" options={{ href: null }} />');
    expect(tabs).toMatch(/name="outils"[\s\S]*apps/);
    expect(tabs).toMatch(/name="plus"[\s\S]*person/);

    // La barre flotte : la scène occupe toute la hauteur et le contenu passe
    // dessous, au lieu de s'arrêter net à son bord.
    expect(tabs).toContain("tabBarStyle: { position: 'absolute'");
    expect(bar).toContain("position: 'absolute'");
    expect(bar).toContain('export function useTabBarSpace');

    // Chaque écran d'onglet réserve la place : sinon la dernière carte passe
    // derrière la barre — la « découpe » constatée sur l'appareil.
    for (const screen of ['index', 'clients', 'devis', 'outils', 'plus']) {
      expect(readFileSync(`mobile/app/(app)/${screen}.tsx`, 'utf8'), screen).toContain('useTabBarSpace()');
    }

    const outils = readFileSync('mobile/app/(app)/outils.tsx', 'utf8');
    for (const href of ["'/depenses'", "'/comptable'", "'/marque'"]) expect(outils).toContain(href);

    // Et les réglages de compte ne reprennent aucune fonction du métier.
    const compte = readFileSync('mobile/app/(app)/plus.tsx', 'utf8');
    for (const href of ["'/depenses'", "'/comptable'", "'/marque'"]) expect(compte).not.toContain(href);
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
