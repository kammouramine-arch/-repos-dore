import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const mobile = (path: string) => readFileSync(`mobile/${path}`, 'utf8');
/** Le fichier sans ses commentaires : ils citent les défauts corrigés. */
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/**
 * La composition des en-têtes, et l'espace qu'ils ne prennent plus.
 *
 * ## Ce que ces tests protègent
 *
 * Trois passes de suite ont « corrigé » le vide de l'accueil et de Mon compte
 * sans que l'appareil montre de différence. La raison en était mesurable et
 * elle n'a été trouvée qu'en la mesurant : entre la dernière ligne de
 * l'en-tête et le premier intitulé de section il y avait 204 points, dont 176
 * de fondu **réservé** — une vue vide que rien ne pouvait occuper — et 20
 * d'écart de section. Réduire ce fondu de 240 à 176 n'avait donc retiré que 27
 * points : le geste était juste, son ampleur ridicule au regard du défaut.
 *
 * Ces tests ne disent pas qu'un écran est beau. Ils fixent les deux propriétés
 * dont dépend le fait qu'il puisse l'être, et qui se cassent en silence :
 * aucune hauteur n'est réservée pour du vide, et ce qui remplit le bleu est du
 * contenu.
 */

describe('le bleu porte du contenu, pas du vide', () => {
  /*
   * La règle qui remplace la réserve.
   *
   * Réserver le fondu garantissait qu'aucun intitulé gris ne tombe sur du
   * bleu. La garantie tient maintenant autrement : ce qui tombe sur le bleu y
   * est écrit en blanc et appartient au héros, et ce qui suit l'atmosphère est
   * opaque. Le fondu, lui, déborde derrière sans rien coûter.
   */
  it('ne réserve aucune hauteur de mise en page pour le fondu', () => {
    const atmosphere = mobile('src/components/brand-atmosphere.tsx');
    expect(atmosphere).not.toContain('style={{ height: fade }}');
    // La boîte ne fait que la hauteur du contenu confié…
    expect(atmosphere).toContain('<View onLayout={measure}>{children}</View>');
    // …et le dégradé, absolu, déborde d'autant par le bas.
    expect(atmosphere).toContain('const height = solid + fade;');
    expect(atmosphere).toContain('height: height + TOP_BLEED');
  });

  /*
   * Le vrai test du vide : ce que le héros contient.
   *
   * Un en-tête qui ne porte que trois lignes de texte laisse forcément du bleu
   * nu en dessous, quelle que soit la longueur du fondu. Sur l'accueil, le
   * bleu porte maintenant l'identité, l'état, l'intitulé et les cartes de
   * devis — il n'y a plus de place pour du vide.
   */
  it('met les devis dans le bleu de l’accueil, pas après lui', () => {
    const home = mobile('app/(app)/index.tsx');
    const open = home.lastIndexOf('<BrandAtmosphere');
    const close = home.indexOf('</BrandAtmosphere>', open);
    expect(open).toBeGreaterThan(0);
    const hero = home.slice(open, close);
    expect(hero).toContain('<HomeHero');
    expect(hero).toContain('<QuoteCarousel');
    expect(hero).toContain('onBrand');
  });

  it('met l’intitulé « Compte » dans le bleu, et la première carte juste après', () => {
    const account = mobile('app/(app)/plus.tsx');
    const open = account.lastIndexOf('<BrandAtmosphere');
    const close = account.indexOf('</BrandAtmosphere>', open);
    const hero = account.slice(open, close);
    expect(hero).toContain('<HeroIdentity');
    expect(hero).toContain('<HeroLabel');
    // Le premier groupe n'a plus d'intitulé à lui : il est déjà sur le bleu.
    expect(account).toContain('<SettingsGroup>');
    const below = account.slice(close);
    expect(below.indexOf('<SettingsGroup>')).toBeGreaterThan(0);
  });

  /*
   * L'atmosphère reste le premier élément de la zone défilante : c'est ce qui
   * lui interdit de traverser une carte, et cela ne doit pas se perdre en
   * recomposant l'en-tête.
   */
  it('garde l’atmosphère en tête du contenu défilant', () => {
    for (const screen of ['app/(app)/index.tsx', 'app/(app)/plus.tsx']) {
      const source = mobile(screen);
      const scroll = source.indexOf('<Screen');
      const atmosphere = source.indexOf('<BrandAtmosphere', scroll);
      expect(atmosphere, screen).toBeGreaterThan(scroll);
      expect(source.slice(scroll, atmosphere), screen).not.toContain('<Card');
    }
  });
});

describe('l’identité est un bloc, pas des lignes empilées', () => {
  const hero = mobile('src/components/hero.tsx');

  it('groupe la marque et les mots sur une rangée', () => {
    expect(hero).toContain("flexDirection: 'row'");
    expect(hero).toContain('export function HeroIdentity');
    expect(hero).toContain('export function HeroMark');
  });

  /*
   * La marque flottait en haut à droite, détachée de tout. Une décoration dont
   * on ne peut pas dire ce qu'elle fait n'a rien à faire dans une interface :
   * elle est maintenant le point d'appui de l'identité, à gauche.
   */
  it('accroche la marque à l’identité au lieu de la laisser flotter', () => {
    const home = mobile('app/(app)/index.tsx');
    expect(home).toContain('mark={<HeroMark><Logo size={28} showName={false} tone="inverse" /></HeroMark>}');
  });

  /*
   * « 3 devis attendent une réponse » ne menait nulle part : une phrase qui
   * constate un retard sans permettre d'agir dessus est un reproche.
   */
  it('fait de l’état un chemin plutôt qu’une constatation', () => {
    expect(hero).toContain('export function HeroStatus');
    const home = mobile('app/(app)/index.tsx');
    expect(home).toContain("icon: 'time-outline'");
    expect(home).toContain("onPress: () => router.push('/devis')");
  });

  it('donne à Compte une identité de profil, pas une page de couverture', () => {
    const account = mobile('app/(app)/plus.tsx');
    expect(account).toContain('size={56}');
    expect(account).toContain('titleSize={23}');
    // Le surtitre d'accueil appartenait à une page d'accueil.
    expect(account).not.toContain('Bienvenue dans votre atelier');
  });

  /*
   * Les deux écrans partagent le vocabulaire mais pas la composition :
   * l'accueil nomme l'atelier et son activité, Mon compte nomme la personne et
   * son abonnement. Réutiliser un héros générique avec un autre texte
   * reproduirait exactement la composition qu'on vient de retirer.
   */
  it('ne donne pas le même en-tête aux deux écrans', () => {
    const home = mobile('app/(app)/index.tsx');
    const account = mobile('app/(app)/plus.tsx');
    expect(home).toContain('<HeroStatus');
    expect(account).not.toContain('<HeroStatus');
    expect(account).toContain('<StatusChip');
    expect(home).not.toContain('<StatusChip');
  });
});

describe('le repli du héros tient sur le fil d’interface', () => {
  const hero = mobile('src/components/hero.tsx');

  /*
   * Une animation de défilement pilotée par l'état React recalcule l'arbre à
   * chaque image : sur un iPhone, cela se voit immédiatement. La position vit
   * dans une valeur partagée, et les styles sont dérivés sur le fil
   * d'interface.
   */
  it('lit la position de défilement sans repasser par JavaScript', () => {
    expect(hero).toContain('useAnimatedStyle');
    expect(hero).toContain('SharedValue<number>');
    expect(code(hero)).not.toContain('useState');
    expect(code(hero)).not.toContain('onScroll');
  });

  it('reste discret : quelques points, une réduction, aucune bascule', () => {
    expect(hero).toContain('const LIFT = 16;');
    expect(hero).toContain('const MARK_SCALE = 0.88;');
    // Pas de ressort décoratif ni de rebond sur un en-tête qui défile.
    expect(code(hero)).not.toContain('withSpring');
    expect(code(hero)).not.toContain('withSequence');
  });

  /*
   * La mise en page doit tenir seule : c'est la règle « on corrige l'espace
   * d'abord, on anime ensuite ». En mouvement réduit, il ne reste rien du
   * repli, et l'écran doit rester juste.
   */
  it('n’anime rien quand iOS demande moins de mouvement', () => {
    expect(hero).toContain('useReducedMotion');
    expect(hero).toContain('const active = !reduced && scrollY != null;');
  });
});

describe('la présentation ne promet pas ce qui a été retiré', () => {
  /*
   * L'encaissement en ligne des factures a quitté l'application au build 57 :
   * « mes clients » désignait les artisans abonnés, pas les clients de
   * l'artisan. La troisième diapositive de la découverte continuait pourtant
   * de le vendre à chaque nouvel arrivant — une promesse tenue par personne.
   */
  it('ne vend plus le règlement en ligne des factures', () => {
    const decouverte = mobile('app/(public)/decouverte.tsx');
    expect(decouverte).not.toContain('règle sa facture en ligne');
    expect(decouverte).not.toContain('settles the invoice online');
    // Ce qui la remplace existe : facture, justificatifs, export comptable.
    expect(decouverte).toContain('l’export part chez votre comptable');
    expect(decouverte).toContain('goes straight to your accountant');
  });
});
