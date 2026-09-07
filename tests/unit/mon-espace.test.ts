import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Architecture de « Mon espace » et « Mon compte ».
 *
 * Constaté sur iPhone : noter l'application, contacter le support, les
 * paiements et la suppression du compte se trouvaient au fond de « Mon
 * compte », sous les champs de code de confirmation. Ces cas figent la
 * répartition : « Mon espace » expose ces zones ; « Mon compte » ne les
 * porte plus ; chaque écran poussé reçoit un bouton retour applicatif.
 */
const MOBILE = path.resolve(__dirname, '../../mobile');
const read = (file: string) => readFileSync(path.join(MOBILE, file), 'utf8');

describe('mon espace', () => {
  const espace = read('app/(app)/plus.tsx');

  it('expose compte, abonnement, paiements, assistance, avis, légal et suppression', () => {
    for (const marker of ["'/compte'", "'/entreprise'", "'/abonnement'", "'/paiements'", "'/suppression'", "copy(locale, 'rate')", "copy(locale, 'contact')", "copy(locale, 'privacy')", "copy(locale, 'terms')", "copy(locale, 'deleteAccount')"]) {
      expect(espace, marker).toContain(marker);
    }
    expect(espace).toContain("SUPPORT_EMAIL = 'contact@devisera.fr'");
  });

  it('ne renvoie plus vers le navigateur pour des écrans natifs', () => {
    expect(espace).not.toMatch(/Sur le web/);
  });
});

describe('mon compte', () => {
  const compte = read('app/compte.tsx');

  it('se limite aux informations du compte', () => {
    expect(compte).toContain('updateName');
    expect(compte).toContain('requestEmailCode');
    expect(compte).toContain('updateLanguage');
    for (const moved of ['write-review', 'reportaproblem', 'apps.apple.com/account/subscriptions', 'deleteAccount(', '/confidentialite']) {
      expect(compte, moved).not.toContain(moved);
    }
  });

  it('délègue la suppression à un écran dédié qui appelle la même API', () => {
    expect(compte).toContain("'/suppression'");
    const suppression = read('app/suppression.tsx');
    expect(suppression).toContain('api.auth.deleteAccount(password)');
    expect(suppression).toContain('await signOut()');
  });
});

describe('en-tête des écrans poussés', () => {
  const layout = read('app/_layout.tsx');

  it('fournit son propre bouton retour et masque celui du système', () => {
    expect(layout).toContain('headerBackVisible: false');
    expect(layout).toMatch(/headerLeft: \(\{ canGoBack, tintColor \}[\s\S]*<HeaderBack/);
    expect(layout).toContain("headerTitleAlign: 'center'");
  });

  it('nomme les nouveaux écrans', () => {
    expect(layout).toContain('name="paiements"');
    expect(layout).toContain('name="suppression"');
  });

  it('libelle le retour sans nom de route', () => {
    const back = read('src/components/header-back.tsx');
    expect(back).toContain("copy(locale, 'back')");
    // Aucun nom de groupe de routes ne doit être rendu comme texte.
    expect(back).not.toMatch(/<Text[^>]*>[^<]*\((app|auth|public)\)/);
  });
});

describe('barre de navigation', () => {
  const bar = read('src/components/scrub-tab-bar.tsx');

  it('n’a qu’un indicateur de sélection et le positionne sans animation au montage', () => {
    expect(bar.match(/backgroundColor: colors\.accentSoft/g)?.length).toBe(1);
    expect(bar).toContain('positioned.current');
    expect(bar).toContain('indicatorX.setValue(target)');
  });

  it('garde une graisse d’étiquette constante pour ne jamais décaler la mise en page', () => {
    expect(bar).not.toMatch(/fontWeight: active \?/);
  });
});
