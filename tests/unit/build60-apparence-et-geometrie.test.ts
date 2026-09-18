import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { isPreference, migratePreference, resolveScheme } from '../../mobile/src/lib/scheme-resolver';
import { travelDuration } from '../../mobile/src/components/tab-lens-timing';

const mobile = (path: string) => readFileSync(`mobile/${path}`, 'utf8');
/** Le fichier sans ses commentaires : ils citent les défauts corrigés. */
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/**
 * Trois défauts que seul un appareil montrait, et leurs garde-fous.
 *
 * Ces trois-là ont en commun d'être **invisibles en revue web** : la zone sûre
 * y vaut zéro, `Appearance.setColorScheme` n'y fait rien, et « Réduire les
 * animations » y est toujours désactivé. Quatre revues visuelles successives
 * les ont donc laissés passer. Les tests qui suivent les attrapent là où ils
 * vivent réellement : dans la logique, pas dans le rendu.
 */

describe('Clair ou Sombre, et rien d’autre', () => {
  /*
   * Il n'y a plus de troisième valeur : la préférence enregistrée est le thème
   * affiché. « Automatique » obligeait l'application à lire l'apparence de
   * l'iPhone tout en la lui imposant — donc à lire sa propre écriture — et
   * rendait le contraire du mode précédent. Le retirer supprime le problème
   * plutôt que de le contenir.
   */
  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
  ] as const)('préférence %s = thème %s', (preference, expected) => {
    expect(resolveScheme(preference)).toBe(expected);
  });

  it('n’accepte que deux valeurs', () => {
    expect(isPreference('light')).toBe(true);
    expect(isPreference('dark')).toBe(true);
    for (const rejected of ['system', 'automatic', 'auto', '', null, undefined, 0, {}]) {
      expect(isPreference(rejected), String(rejected)).toBe(false);
    }
  });

  /*
   * La migration, et la seule fois où l'iPhone a encore voix au chapitre.
   *
   * Un utilisateur qui avait « Automatique » garde le thème qu'il avait sous
   * les yeux : on le résout une fois contre l'apparence du téléphone, et il
   * devient explicite. Un premier lancement suit exactement le même chemin.
   */
  it.each([
    ['light', 'light', 'light'],
    ['dark', 'light', 'dark'],
    ['system', 'dark', 'dark'],
    ['system', 'light', 'light'],
    ['automatic', 'dark', 'dark'],
    [null, 'dark', 'dark'],
    [undefined, 'light', 'light'],
    ['n’importe quoi', 'dark', 'dark'],
  ] as const)('enregistré %s + iPhone %s = %s', (stored, system, expected) => {
    expect(migratePreference(stored, system)).toBe(expected);
  });

  /*
   * La valeur migrée doit être **regravée**. Sans cela, un ancien
   * « automatique » serait relu et re-résolu à chaque lancement, et le thème
   * suivrait encore le téléphone — précisément ce qu'on vient de retirer.
   */
  it('regrave la préférence migrée, pour ne la résoudre qu’une fois', () => {
    const provider = mobile('src/lib/appearance.tsx');
    expect(provider).toContain('return migratePreference(raw, launchScheme);');
    const read = provider.indexOf('void readChoice().then');
    const rewrite = provider.indexOf('void writeChoice(stored);', read);
    expect(rewrite).toBeGreaterThan(read);
  });

  /*
   * L'apparence du téléphone est figée au lancement : la relire après qu'un
   * thème a été imposé renverrait ce thème, pas le système.
   */
  it('ne lit l’apparence du téléphone qu’au chargement du module', () => {
    const store = mobile('src/lib/system-scheme.ts');
    expect(store).toContain("export const launchScheme: ColorScheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';");
    // Plus d'écoute continue : elle n'existait que pour « Automatique ».
    expect(store).not.toContain('addChangeListener');
    expect(store).not.toContain('AppState');
  });

  it('ne propose que deux options à l’écran', () => {
    // Les commentaires citent « Automatique » pour expliquer son retrait.
    const screen = code(mobile('app/apparence.tsx'));
    expect(screen).not.toContain("value: 'system'");
    expect(screen).not.toContain('Automatique');
    expect(screen).not.toContain('Automatic');
    expect(screen).not.toContain('Follows your iPhone');
    const options = screen.slice(screen.indexOf('const OPTIONS'), screen.indexOf('const SAMPLE'));
    expect(options.match(/value: '/g)?.length).toBe(2);
  });

  it('ne déplace jamais celui qui règle l’apparence', () => {
    const provider = code(mobile('src/lib/appearance.tsx'));
    expect(provider).not.toContain('key={');
    expect(provider).not.toContain('router.replace');
    expect(provider).not.toContain('router.push');
  });
});

describe('une seule zone sûre en tête d’écran', () => {
  /*
   * La cause exacte des 134 points de bleu vide.
   *
   * `contentInsetAdjustmentBehavior="automatic"` demande à iOS d'ajouter
   * lui-même la zone sûre ; l'accueil et Mon compte l'ajoutaient **aussi** par
   * `useBrandSurface().paddingTop`. Sur un iPhone à encoche : 59 + 59 + 16.
   * Sur le paquet web les deux valent zéro, ce qui est la raison pour laquelle
   * quatre revues visuelles ne l'ont pas vu.
   */
  it('laisse `Screen` poser la marge haute, et lui seul', () => {
    const ui = mobile('src/components/ui.tsx');
    expect(ui).toContain('contentInsetAdjustmentBehavior="never"');
    expect(ui).toContain('automaticallyAdjustContentInsets={false}');
    expect(ui).toContain('paddingTop: insets.top + spacing.xl');
  });

  it('n’ajoute plus de zone sûre dans les écrans qui la recevaient déjà', () => {
    expect(mobile('src/components/brand-backdrop.tsx')).not.toContain('insets.top');
    for (const screen of ['app/(app)/index.tsx', 'app/(app)/plus.tsx']) {
      const source = mobile(screen);
      expect(source, screen).not.toContain('surface.paddingTop');
      expect(source, screen).toContain('contentStyle={{ paddingBottom: tabBarSpace }}');
    }
  });
});


describe('la lentille se déplace vite, et d’un seul geste', () => {
  const bar = mobile('src/components/glass-tab-bar.tsx');

  /*
   * Une seule vue de sélection, et un seul matériau à l'intérieur : deux
   * pastilles dont l'une s'efface pendant que l'autre apparaît donnent un
   * fondu, pas un déplacement.
   */
  it('ne rend qu’une seule lentille, hors de la boucle des onglets', () => {
    const lens = bar.slice(bar.indexOf('La lentille : une seule vue'));
    expect(lens.match(/<Animated\.View/g)?.length).toBe(1);
    expect(lens.match(/<GlassView/g)?.length).toBe(1);
    const loop = bar.slice(bar.indexOf('{items.map((item, index) =>'));
    expect(loop).not.toContain('backgroundColor: lensColor');
    expect(bar.match(/<GlassSurface/g)?.length).toBe(1);
  });

  /*
   * La durée, plafonnée.
   *
   * Le ressort précédent s'établissait en ~450 ms et mettait 0,64 s sur
   * l'appareil : la capsule se déplaçait, mais on l'attendait. Un ressort donne
   * en outre une durée proportionnelle à la distance, si bien qu'Accueil →
   * Compte traînait deux fois plus qu'un onglet voisin.
   */
  it.each([
    [1, 171],
    [2, 187],
    [3, 203],
    [4, 219],
  ])('%i onglet(s) franchi(s) = %i ms', (jumped, expected) => {
    expect(travelDuration(jumped)).toBe(expected);
  });

  it('ne dépasse jamais 220 ms, quelle que soit la distance', () => {
    for (const jumped of [5, 8, 20]) expect(travelDuration(jumped)).toBeLessThanOrEqual(220);
    // Et reste dans la fenêtre demandée pour un onglet voisin.
    expect(travelDuration(1)).toBeGreaterThanOrEqual(150);
    expect(travelDuration(1)).toBeLessThanOrEqual(180);
  });

  /*
   * `translateX` porte le déplacement, et lui seul. La largeur animée était la
   * cause de l'étirement qui reliait deux onglets pendant plusieurs images.
   */
  it('n’anime que la position, jamais la largeur', () => {
    const motion = mobile('src/components/tab-lens-motion.ts');
    expect(motion).toContain('lens.centre.value = withTiming(destination');
    expect(motion).toContain('lens.width.value = value;');
    expect(motion).not.toMatch(/width\.value = with(Timing|Spring)/);
    expect(motion).not.toContain('withSpring');
  });

  it('annule avant de viser ailleurs, pour repartir de sa position courante', () => {
    const motion = mobile('src/components/tab-lens-motion.ts');
    const travel = motion.slice(motion.indexOf('export function travelTo'));
    const cancel = travel.indexOf('cancelAnimation(lens.centre)');
    const assign = travel.indexOf('lens.centre.value = withTiming');
    expect(cancel).toBeGreaterThan(0);
    expect(assign).toBeGreaterThan(cancel);
  });

  /*
   * Le mouvement part du **toucher**, pas de la route.
   *
   * Il était déclenché par un effet dépendant de `state.index` : la capsule
   * n'avait le droit de bouger qu'une fois la navigation résolue, et ce délai
   * s'ajoutait à la durée de l'animation.
   */
  it('part au toucher, la route ne faisant que rattraper', () => {
    const select = bar.slice(bar.indexOf('const select = (name: string)'), bar.indexOf('const labelFor'));
    const move = select.indexOf('moveLens(index, from)');
    const navigate = select.indexOf('navigation.navigate');
    expect(move).toBeGreaterThan(0);
    expect(navigate).toBeGreaterThan(move);
  });

  it('change d’onglet par le navigateur, sans pousser d’écran', () => {
    const select = bar.slice(bar.indexOf('const select = (name: string)'), bar.indexOf('const labelFor'));
    expect(select).toContain('navigation.navigate(route.name, route.params)');
    expect(select).not.toContain('router.push');
  });

  it('anime quand la question posée à iOS échoue', () => {
    expect(mobile('src/components/motion.tsx')).toContain('.catch(() => setReduced(false));');
  });

  it('garde les écrans montés d’un onglet à l’autre', () => {
    const layout = mobile('app/(app)/_layout.tsx');
    expect(layout).toContain('detachInactiveScreens={false}');
    expect(layout).toContain('freezeOnBlur: false');
    // Et la barre vit au niveau du navigateur : elle ne se remonte pas.
    expect(layout).toContain('tabBar={props => <GlassTabBar {...props} />}');
  });
});

describe('le verre natif ne choisit pas son camp tout seul', () => {
  /*
   * Constaté sur appareil, sur les captures du build 59 : en apparence claire,
   * le plateau de la barre d'onglets ressortait **anthracite**, avec des
   * libellés gris dessus.
   *
   * `UIGlassEffect` s'adapte à ce qu'il a dessous, et sous la barre il y a le
   * bleu de marque saturé de l'accueil et de Mon compte. Le matériau suivait
   * donc le fond plutôt que le thème. Rien ne pouvait le montrer en revue : le
   * paquet web n'a pas de verre natif, il tombe sur la surface opaque, qui
   * était juste.
   *
   * On ancre désormais la teinte sur le thème effectif.
   */
  it('ancre la teinte du verre sur le thème effectif', () => {
    const glass = mobile('src/components/glass.tsx');
    expect(glass).toContain("const ANCHOR = { light: 'rgba(255,255,255,0.52)', dark: 'rgba(18,24,36,0.48)' } as const;");
    expect(glass).toContain('tintColor={tint ?? ANCHOR[activeScheme()]}');
  });

  it('laisse le flou et la surface opaque suivre le même thème', () => {
    const glass = mobile('src/components/glass.tsx');
    expect(glass).toContain("tint={dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}");
    // Et la barre se re-rend à chaque bascule, sinon la teinte resterait figée.
    expect(mobile('src/components/glass-tab-bar.tsx')).toContain('useThemeScheme()');
  });
});
