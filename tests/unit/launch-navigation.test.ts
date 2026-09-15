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
  it('replaces the Activity tab with Devis and keeps five destinations with the central +', () => {
    const bar = readFileSync('mobile/src/components/scrub-tab-bar.tsx', 'utf8');
    expect(bar).toContain("{ name: 'devis', label: 'Devis', icon: 'document-text-outline', activeIcon: 'document-text' }");
    expect(bar).not.toContain("name: 'prospects'");
    expect(bar.match(/\{ name: '/g)).toHaveLength(5);
    const tabs = readFileSync('mobile/app/(app)/_layout.tsx', 'utf8');
    expect(tabs).toContain('<Tabs.Screen name="prospects" options={{ href: null }} />');
    expect(tabs).toMatch(/name="devis"[\s\S]*document-text/);
    expect(readFileSync('mobile/app/(app)/index.tsx', 'utf8')).not.toContain("router.push('/prospects')");
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
