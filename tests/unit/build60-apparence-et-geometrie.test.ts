import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { isPreference, migratePreference, resolveScheme } from '../../mobile/src/lib/scheme-resolver';

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


describe('la barre d’onglets : un plateau stable, un état actif en couleur', () => {
  const bar = mobile('src/components/glass-tab-bar.tsx');

  /*
   * Pourquoi la capsule coulissante a été retirée.
   *
   * Six passes à la faire glisser, et l'appareil montrait toujours un état qui
   * change de place. Mesurée au 60e sur l'enregistrement du build 63, la
   * traversée Accueil → Compte donnait :
   *
   *   38 → 148 → 312 → 326 → 336 → 340 → 343
   *
   * soit 90 % de la distance en deux images — 35 ms — puis 100 ms à grappiller
   * les trente derniers points. La durée était juste ; la courbe
   * `bezier(0.22, 1, 0.36, 1)` atteint 0,9 dès le quart du temps, et ce qui se
   * lit alors n'est pas un déplacement mais un saut suivi d'un tassement.
   *
   * Décision prise sur les trois références fournies — Fitness Park, Strava,
   * FotMob. Échantillonnées sur toute leur durée, **aucune** n'a de sélecteur
   * mobile : le plateau est fixe, et seule la couleur de l'icône et du libellé
   * change. C'est ce qu'on fait ici.
   */
  it('ne rend plus aucune capsule de sélection', () => {
    expect(bar).not.toContain('lensColor');
    expect(bar).not.toContain('translateX');
    expect(bar).not.toContain('cancelAnimation');
    // Le plateau reste, et reste seul à porter du verre.
    expect(bar.match(/<GlassSurface/g)?.length).toBe(1);
    expect(bar).not.toContain('<GlassView');
  });

  it('marque l’onglet actif par la couleur, pas par un fond', () => {
    const item = bar.slice(bar.indexOf('function TabItem({'), bar.indexOf('function CreateButton'));
    expect(item).toContain('interpolateColor(presence.value, [0, 1], [colors.muted, colors.accent])');
    // Aucun fond de sélection dans l'onglet : c'était l'architecture rejetée.
    expect(item).not.toContain('backgroundColor');
  });

  /*
   * Court et sans esbroufe : 120 ms, et une affirmation de 3 %. Les
   * références tiennent toutes dans cette fenêtre.
   */
  it('change d’état vite, et à peine', () => {
    const item = bar.slice(bar.indexOf('function TabItem({'), bar.indexOf('function CreateButton'));
    expect(item).toContain('withTiming(active ? 1 : 0, { duration: DURATION.instant, easing: EASE_OUT })');
    expect(item).toContain('const presence = useSharedValue(active ? 1 : 0);');
    expect(item).toContain('1 + 0.03 * presence.value');
    expect(item).not.toContain('withSpring');
    expect(item).not.toContain('withSequence');
  });

  it('respecte le mouvement réduit sans rien casser', () => {
    const item = bar.slice(bar.indexOf('function TabItem({'), bar.indexOf('function CreateButton'));
    expect(item).toContain('reduced');
    expect(mobile('src/components/motion.tsx')).toContain('.catch(() => setReduced(false));');
  });

  it('change d’onglet par le navigateur, sans pousser d’écran', () => {
    const select = bar.slice(bar.indexOf('const select = (name: string)'), bar.indexOf('const labelFor'));
    expect(select).toContain('navigation.navigate(route.name, route.params)');
    expect(select).not.toContain('router.push');
  });

  it('garde les écrans montés d’un onglet à l’autre', () => {
    const layout = mobile('app/(app)/_layout.tsx');
    expect(layout).toContain('detachInactiveScreens={false}');
    expect(layout).toContain('freezeOnBlur: false');
    expect(layout).toContain('tabBar={props => <GlassTabBar {...props} />}');
  });

  it('garde une graisse d’étiquette constante pour ne jamais décaler la mise en page', () => {
    expect(bar).not.toMatch(/fontWeight: active \?/);
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
