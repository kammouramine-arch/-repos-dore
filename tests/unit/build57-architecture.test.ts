import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const mobile = (path: string) => read(`mobile/${path}`);
/** Le fichier sans ses commentaires : ils citent les défauts corrigés. */
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/**
 * Les trois garanties d'architecture du build 57.
 *
 * Elles ne portent pas sur l'apparence — un test ne sait pas si un écran est
 * beau. Elles portent sur des propriétés structurelles dont on a appris, à
 * l'usage, qu'elles se cassent en silence et ne se voient qu'une fois sur un
 * appareil réel, trop tard.
 */

describe('changer de thème ne démonte rien', () => {
  /*
   * Le fournisseur d'apparence remontait l'arbre en changeant une clé. Cela
   * appliquait bien le thème partout — et détruisait le routeur au passage :
   * choisir « Clair » renvoyait l'utilisateur à l'accueil, pile de navigation
   * perdue, position de défilement perdue.
   *
   * Un réglage ne doit jamais déplacer celui qui le règle.
   */
  it('n’utilise aucune clé de remontage dans le fournisseur d’apparence', () => {
    const provider = code(mobile('src/lib/appearance.tsx'));
    expect(provider).not.toContain('key={activeScheme()}');
    expect(provider).not.toContain('React.Fragment key');
  });

  it('prévient les abonnés hors de la phase de rendu', () => {
    const provider = mobile('src/lib/appearance.tsx');
    // Muter pendant le rendu (pour que le premier montage soit juste), mais
    // notifier dans un effet de mise en page : prévenir pendant un rendu est
    // interdit par React, et le faire dans un effet ordinaire ferait clignoter.
    expect(provider).toContain('applyScheme(scheme);');
    expect(provider).toContain('React.useLayoutEffect');
    expect(provider).toContain('publishScheme();');
  });

  /*
   * Sans abonnement, un écran garderait l'ancienne palette jusqu'à ce qu'autre
   * chose le fasse se re-rendre. React re-rendant les enfants d'un parent qui
   * se re-rend, il suffit d'abonner la racine de chaque écran.
   */
  it('abonne la racine de chaque écran et le chrome permanent', () => {
    const screens = [
      'app/(app)/index.tsx',
      'app/(app)/plus.tsx',
      'app/(app)/clients.tsx',
      'app/(app)/devis.tsx',
      'app/(app)/outils.tsx',
      'app/apparence.tsx',
      'app/notifications.tsx',
      'app/signature.tsx',
      'app/factures.tsx',
      'src/components/glass-tab-bar.tsx',
      'src/components/toast.tsx',
    ];
    for (const screen of screens) {
      expect(mobile(screen), screen).toContain('useThemeScheme()');
    }
  });

  /*
   * Le verre d'iOS, les claviers et les alertes ne lisent pas notre palette :
   * ils lisent l'apparence de la fenêtre. Sans cet alignement, un iPhone réglé
   * en sombre gardait une barre d'onglets noire sous une application passée en
   * clair — deux thèmes à l'écran en même temps.
   */
  it('aligne l’apparence native sur le thème choisi dans l’application', () => {
    expect(mobile('src/lib/appearance.tsx')).toContain('Appearance.setColorScheme(scheme)');
  });
});

describe('aucun calque de fond ne traverse le contenu', () => {
  /*
   * Deux plans qui glissent l'un sur l'autre finissent toujours par se couper :
   * il existe une position de défilement où la frontière du bleu passe
   * derrière une carte de réglages. Aucun réglage d'animation ne l'évite —
   * seule l'architecture le peut. L'atmosphère est donc un élément du flux.
   */
  it('ne monte plus de dégradé en position absolue derrière un écran', () => {
    const atmosphere = mobile('src/components/brand-atmosphere.tsx');
    // La seule vue absolue est le dégradé **à l'intérieur** de la boîte en
    // flux : elle se déplace avec elle, elle ne la traverse pas.
    expect(atmosphere).toContain("position: 'absolute'");
    expect(atmosphere).toContain('<View onLayout={measure}>{children}</View>');

    for (const screen of ['app/(app)/index.tsx', 'app/(app)/plus.tsx']) {
      expect(code(mobile(screen)), screen).not.toContain('BrandBackdrop');
    }
  });

  it('fait finir le dégradé exactement sur la couleur de page', () => {
    const atmosphere = mobile('src/components/brand-atmosphere.tsx');
    // Lu à chaque rendu depuis la palette courante : en sombre, le bas vaut le
    // bleu de nuit, pas le blanc. Un dégradé clair sur fond noir dessinerait
    // une bande lumineuse au milieu de l'écran.
    expect(atmosphere).toContain('const surface = colors.surface;');
    expect(atmosphere).toContain('mix(BRAND_TOP, surface, ease(fade))');
  });

  it('réserve le fondu, pour qu’aucun intitulé ne puisse y tomber', () => {
    const atmosphere = mobile('src/components/brand-atmosphere.tsx');
    expect(atmosphere).toContain('const FADE = 240');
    // Le bleu couvre le contenu ; le fondu qui suit est laissé vide.
    expect(atmosphere).toContain('style={{ height: FADE }}');
  });
});

describe('une seule lentille de sélection', () => {
  const bar = mobile('src/components/glass-tab-bar.tsx');

  /*
   * Cinq fonds qu'on ferait apparaître et disparaître donnent une sélection
   * qui *change de place* ; une seule vue qui se déplace donne une sélection
   * qui *y va*. C'est toute la différence que l'appareil montrait.
   */
  it('rend une vue de sélection, pas une par onglet', () => {
    const lens = bar.slice(bar.indexOf('La lentille : une seule vue'));
    expect(lens.match(/<Animated\.View/g)?.length).toBe(1);
    // Dans la boucle des onglets, aucun fond de sélection.
    const loop = bar.slice(bar.indexOf('{items.map((item, index) =>'));
    expect(loop).not.toContain('backgroundColor: lensColor');
  });

  it('prend sa position de la mesure réelle des onglets', () => {
    expect(bar).toContain('onLayout={measure}');
    expect(bar).toContain('slot.x + slot.width / 2');
    // Plus de largeur divisée par cinq : un libellé plus long décalait tout.
    expect(code(bar)).not.toContain('barWidth / items.length');
  });

  it('se redirige en vol au lieu d’empiler les animations', () => {
    // `withSpring` repart de la position **et de la vitesse** courantes.
    expect(bar).toContain('centre.value = withSpring(destination, SLIDE)');
    expect(bar).toContain('Math.abs(target.value - centre.value)');
  });

  it('laisse le verre au plateau et une teinte à la lentille', () => {
    // Une vue d'effet natif imbriquée dans une autre ne suit pas une
    // transformation animée : le matériau se redessine à sa position finale.
    expect(bar.match(/<GlassSurface/g)?.length).toBe(1);
    const lens = bar.slice(bar.indexOf('La lentille : une seule vue'));
    expect(lens).not.toContain('<GlassSurface');
  });
});

describe('l’encaissement des factures a quitté l’interface', () => {
  /*
   * « Mes clients » désignait les artisans abonnés à DEVISERA, pas les clients
   * de l'artisan. L'application ne doit donc plus laisser croire qu'un artisan
   * encaisse ses factures par DEVISERA. L'infrastructure serveur reste en
   * place, inutilisée.
   */
  it('ne propose plus rien de tel dans l’application', () => {
    const app = ['app/(app)/outils.tsx', 'app/(app)/plus.tsx', 'app/entreprise.tsx', 'src/components/invoice-board.tsx'];
    for (const screen of app) {
      const source = code(mobile(screen));
      // La route d'activation, l'API de paiement et l'action sur la facture.
      // (Le mot « encaissements » reste légitime dans l'export comptable : il
      // y désigne les sommes reçues, pas une fonction de paiement.)
      expect(source, screen).not.toContain("'/encaissement'");
      expect(source, screen).not.toContain('invoicePayments');
      expect(source, screen).not.toContain('Encaisser');
    }
  });

  it('garde l’abonnement DEVISERA sur StoreKit', () => {
    // Le paiement du logiciel par l'artisan n'a rien à voir avec le règlement
    // d'une facture : sur iPhone il reste l'achat intégré d'Apple.
    const products = read('packages/shared/src/apple-products.ts');
    expect(products).toContain('fr.devisia.essentiel.monthly');
    expect(products).toContain('fr.devisia.pro.monthly');
    expect(products).toContain('fr.devisia.entreprise.monthly');
    expect(mobile('src/components/apple-paywall.tsx')).toContain('purchaseApplePlan');
  });
});
