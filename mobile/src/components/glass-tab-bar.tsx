import * as React from 'react';
import { Animated as RNAnimated, Keyboard, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { activeScheme, colors, radius, shadows, spacing, useThemeScheme } from '@/theme';
import { DURATION, EASE_OUT, SPRING } from '@/theme/motion';
import { GlassGroup, GlassSurface, useGlassKind } from './glass';
import { useReducedMotion, useTouchMotion } from './motion';
import { copy, useMobileLocale } from '@/lib/i18n';

/**
 * Barre de navigation flottante.
 *
 * Cinq destinations, et une action :
 *
 *     [ Accueil · Clients · Documents · Outils · Compte ]  ( + )
 *
 * Le « + » n'est **pas** une sixième destination. Le mettre au milieu des
 * cinq forçait six cibles sur la largeur d'un iPhone et laissait croire qu'il
 * menait quelque part. C'est une action : elle vit dans sa propre pastille, à
 * côté de la barre, et ouvre directement le devis à la voix.
 *
 * ## Une seule lentille, jamais cinq fonds
 *
 * La sélection est **un objet unique** — une seule vue, montée une fois pour
 * la durée de vie de la barre, qui se déplace. Ce n'est pas un détail
 * d'implémentation : une pastille par onglet qu'on ferait apparaître et
 * disparaître donnerait exactement ce qu'on voyait, une sélection qui
 * *change de place* au lieu d'y *aller*.
 *
 * Sa position vient de la **mesure réelle** de chaque onglet
 * (`onLayout`), pas d'une largeur divisée par cinq : le jour où un libellé
 * s'allonge ou qu'une destination s'ajoute, la lentille reste alignée.
 *
 * ## Pourquoi la lentille n'est pas elle-même du verre natif
 *
 * On a essayé. Une vue d'effet natif imbriquée dans une autre ne suit pas une
 * transformation animée de façon fiable : le matériau se redessine à sa
 * position finale, et la lentille « apparaît ailleurs » au lieu de glisser.
 * C'est très exactement le défaut constaté sur l'appareil.
 *
 * La composition retenue est celle d'iOS : le **plateau** est le verre, la
 * **lentille** est une teinte posée dessus. Le matériau reste natif là où il
 * fait son travail, et ce qui bouge est une vue ordinaire, qui bouge
 * réellement.
 *
 * ## Pourquoi la barre est en position absolue
 *
 * Posée dans le flux, elle raccourcissait la scène : le contenu s'arrêtait net
 * à son bord supérieur et les cartes du bas se voyaient coupées. Ici elle
 * flotte au-dessus d'une scène pleine hauteur ; chaque écran réserve la place
 * avec `useTabBarSpace()`.
 */

type TabName = 'index' | 'clients' | 'devis' | 'outils' | 'plus';

const items: { name: TabName; icon: string; activeIcon: string }[] = [
  { name: 'index', icon: 'home-outline', activeIcon: 'home' },
  { name: 'clients', icon: 'people-outline', activeIcon: 'people' },
  { name: 'devis', icon: 'document-text-outline', activeIcon: 'document-text' },
  { name: 'outils', icon: 'apps-outline', activeIcon: 'apps' },
  { name: 'plus', icon: 'person-outline', activeIcon: 'person' },
];

const BAR_HEIGHT = 64;
const CREATE_SIZE = 60;
/** Écart entre la barre et la pastille de création. */
const GAP = 10;
/** La lentille reprend le ressort de sélection commun à l'application. */
const SLIDE = SPRING.select;
/** Marge de la lentille à l'intérieur du plateau. */
const INSET = 5;

/**
 * Place à réserver sous le contenu défilant d'un écran d'onglet.
 *
 * La barre flottant au-dessus de la scène, sans cette réserve la dernière
 * carte de chaque écran passerait derrière elle — c'est très exactement la
 * « découpe » constatée sur l'appareil.
 */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + Math.max(insets.bottom, spacing.md) + spacing.xl + spacing.md;
}

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Géométrie mesurée d'un onglet, dans le repère du plateau. */
interface Slot {
  x: number;
  width: number;
}

function TabItem({
  item,
  index,
  label,
  active,
  centre,
  span,
  onLayout,
  onPress,
}: {
  item: (typeof items)[number];
  index: number;
  label: string;
  active: boolean;
  /** Centre de la lentille, en points, partagé par toute la barre. */
  centre: SharedValue<number>;
  /** Largeur d'un onglet : l'échelle sur laquelle se lit la proximité. */
  span: SharedValue<number>;
  onLayout: (index: number, slot: Slot) => void;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const touch = useTouchMotion(0.9);
  const [slot, setSlot] = React.useState<Slot | null>(null);

  const measure = (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    const next = { x, width };
    setSlot((previous) => (previous && Math.abs(previous.x - x) < 1 && Math.abs(previous.width - width) < 1 ? previous : next));
    onLayout(index, next);
  };

  /*
   * L'état de l'icône est déduit de **où se trouve la lentille**, pas de quel
   * onglet est sélectionné.
   *
   * Chaque onglet avait auparavant son propre ressort, démarré par un effet
   * React au changement de route. Cinq ressorts indépendants partaient donc en
   * même temps que la lentille, chacun avec sa phase : l'ancienne icône
   * s'éteignait avant que la lentille ne soit partie, la nouvelle s'allumait
   * avant qu'elle n'arrive, et l'on voyait un clignotement au lieu d'un
   * déplacement.
   *
   * Ici, une seule valeur mène tout. L'icône s'allume à mesure que la lentille
   * la recouvre et s'éteint à mesure qu'elle la quitte — comme un objet posé
   * sur la barre qui éclaire ce qu'il survole. Interrompre le geste à
   * mi-course laisse deux icônes à moitié allumées, ce qui est exactement
   * juste.
   */
  const presence = useDerivedValue(() => {
    if (reduced) return active ? 1 : 0;
    if (!slot || span.value <= 0) return active ? 1 : 0;
    const own = slot.x + slot.width / 2;
    return Math.max(0, 1 - Math.abs(centre.value - own) / span.value);
  }, [active, reduced, slot]);

  const outline = useAnimatedStyle(() => ({ opacity: 1 - presence.value }));
  const filled = useAnimatedStyle(() => ({ opacity: presence.value }));
  const icon = useAnimatedStyle(() => ({
    transform: [
      { translateY: reduced ? 0 : -1.5 * presence.value },
      { scale: reduced ? 1 : 1 + 0.08 * presence.value },
    ],
  }));
  const caption = useAnimatedStyle(() => ({
    color: interpolateColor(presence.value, [0, 1], [colors.muted, colors.accent]),
    // Le libellé sélectionné s'affirme sans changer de graisse : une graisse
    // qui change décale la mise en page d'un demi-point à chaque passage.
    opacity: 0.78 + 0.22 * presence.value,
  }));

  return (
    <RNAnimated.View style={{ flex: 1, transform: [{ scale: touch.scale }] }} onLayout={measure}>
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        hitSlop={4}
        onPressIn={touch.pressIn}
        onPressOut={touch.pressOut}
        onPress={() => {
          touch.pressOut();
          onPress();
        }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: BAR_HEIGHT, gap: 3 }}
      >
        <Animated.View style={[{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }, icon]}>
          <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, outline]}>
            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.inkSoft} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, filled]}>
            <Ionicons name={item.activeIcon as keyof typeof Ionicons.glyphMap} size={22} color={colors.accent} />
          </Animated.View>
        </Animated.View>
        <Animated.Text numberOfLines={1} style={[{ fontSize: 9.5, fontWeight: '600', letterSpacing: 0.1 }, caption]}>
          {label}
        </Animated.Text>
      </Pressable>
    </RNAnimated.View>
  );
}

/**
 * Le bouton « + ».
 *
 * Plein et coloré plutôt que translucide : c'est l'action qui rapporte, elle
 * doit ressortir sur n'importe quel fond, et un contraste garanti vaut mieux
 * qu'un effet de plus. Il reste hors de la lentille : ce n'est pas une
 * destination, il n'a donc jamais à être « sélectionné ».
 */
function CreateButton({ label, onPress }: { label: string; onPress: () => void }) {
  const touch = useTouchMotion(0.9);
  const reduced = useReducedMotion();
  /*
   * Le halo d'appui.
   *
   * Il montait à 1 et **y restait** : aucune valeur ne le ramenait à zéro.
   * Un disque bleu pâle, à double échelle, se figeait donc au-dessus de
   * l'interface dès le premier appui sur le « + » et n'en repartait plus.
   *
   * Il s'ouvre puis se referme en une séquence : la valeur finit à zéro, donc
   * le halo finit invisible, quoi qu'il arrive ensuite — navigation, perte de
   * focus, démontage de l'écran.
   */
  const bloom = useSharedValue(0);
  const halo = useAnimatedStyle(() => ({ opacity: bloom.value * 0.3, transform: [{ scale: 1 + bloom.value * 0.9 }] }));

  return (
    <RNAnimated.View style={{ transform: [{ scale: touch.scale }] }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width: CREATE_SIZE,
            height: CREATE_SIZE,
            borderRadius: CREATE_SIZE / 2,
            backgroundColor: colors.accentBright,
          },
          halo,
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={6}
        onPressIn={() => {
          touch.pressIn();
          if (reduced) return;
          bloom.value = 0;
          bloom.value = withSequence(
            withTiming(1, { duration: DURATION.quick, easing: EASE_OUT }),
            withTiming(0, { duration: DURATION.slow, easing: EASE_OUT }),
          );
        }}
        onPressOut={touch.pressOut}
        onPress={() => {
          touch.pressOut();
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
          onPress();
        }}
        style={({ pressed }) => ({
          width: CREATE_SIZE,
          height: CREATE_SIZE,
          borderRadius: CREATE_SIZE / 2,
          backgroundColor: pressed ? colors.accentHover : colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.floating,
        })}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>
    </RNAnimated.View>
  );
}

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  // Re-rendu à chaque bascule d'apparence, sans démontage : la navigation
  // et la position de défilement survivent au changement de thème.
  useThemeScheme();
  const router = useRouter();
  const locale = useMobileLocale();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const kind = useGlassKind();
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);

  /*
   * La géométrie mesurée des onglets.
   *
   * Une référence plutôt qu'un état : ces valeurs ne changent rien au rendu,
   * elles alimentent des valeurs partagées lues sur le fil d'interface.
   */
  const slots = React.useRef<Slot[]>([]);
  const [measured, setMeasured] = React.useState(false);

  /** Centre de la lentille, et sa largeur. Une seule paire pour toute la barre. */
  const centre = useSharedValue(0);
  const width = useSharedValue(0);
  /** Là où la lentille se rend : sert à en déduire sa vitesse. */
  const target = useSharedValue(0);
  const span = useSharedValue(0);
  const fade = useSharedValue(0);
  const positioned = React.useRef(false);

  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const activeName = state.routes[state.index]?.name;
  const activeIndex = items.findIndex((item) => item.name === activeName);
  // Route masquée (prospects, création) : aucune destination n'est
  // « sélectionnée », la lentille s'efface au lieu de retomber sur Accueil.
  const unselected = activeIndex < 0;

  const onSlotLayout = React.useCallback((index: number, slot: Slot) => {
    slots.current[index] = slot;
    if (slots.current.filter(Boolean).length === items.length) setMeasured(true);
  }, []);

  React.useEffect(() => {
    if (!measured) return;
    const slot = slots.current[Math.max(0, activeIndex)];
    if (!slot) return;
    const destination = slot.x + slot.width / 2;
    target.value = destination;
    span.value = slot.width;
    width.value = slot.width - INSET * 2;

    // Premier positionnement sans mouvement : la lentille ne doit pas
    // traverser la barre depuis la gauche à chaque montage.
    if (!positioned.current || reduced) {
      positioned.current = true;
      centre.value = destination;
      fade.value = unselected ? 0 : 1;
      return;
    }
    /*
     * `withSpring` repart de la position **et de la vitesse** courantes.
     * Enchaîner Accueil puis Documents ne met donc rien en file d'attente :
     * la cible change, la lentille est déjà en vol, elle se redirige.
     */
    centre.value = withSpring(destination, SLIDE);
    fade.value = withTiming(unselected ? 0 : 1, { duration: DURATION.instant, easing: EASE_OUT });
  }, [activeIndex, centre, fade, measured, reduced, span, target, unselected, width]);

  /*
   * L'étirement.
   *
   * Un rectangle qui se déplace d'un point à un autre reste un rectangle qui
   * se déplace. Ce qui donne à la matière son caractère, c'est qu'elle se
   * laisse tirer : elle s'allonge dans le sens de la course et reprend sa
   * forme en arrivant, comme une goutte.
   *
   * Il est déduit de l'écart qui reste à parcourir — donc de la vitesse
   * réelle — et jamais d'un minuteur. Il est plafonné pour que la lentille ne
   * devienne pas une traînée.
   */
  const stretch = useDerivedValue(() => {
    if (span.value <= 0) return 0;
    return Math.min(Math.abs(target.value - centre.value) / span.value, 1);
  });

  /*
   * Une petite pulsation à l'arrivée, une fois la course finie.
   *
   * Le retour haptique au moment du toucher dit « j'ai compris » ; celui-ci
   * dit « j'y suis ». Il n'est émis qu'au franchissement du seuil, jamais en
   * continu, et jamais pendant une course interrompue.
   */
  const settle = React.useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, []);
  useAnimatedReaction(
    () => stretch.value,
    (now, before) => {
      if (before != null && before > 0.06 && now <= 0.06) runOnJS(settle)();
    },
  );

  const lens = useAnimatedStyle(() => ({
    opacity: fade.value,
    width: width.value,
    transform: [
      { translateX: centre.value - width.value / 2 },
      { scaleX: 1 + stretch.value * 0.18 },
      { scaleY: 1 - stretch.value * 0.07 },
    ],
  }));

  const select = (name: string) => {
    const route = state.routes.find((candidate) => candidate.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (event.defaultPrevented) return;
    navigation.navigate(route.name, route.params);
  };
  const labelFor = (name: TabName) =>
    name === 'index' ? copy(locale, 'home')
      : name === 'clients' ? copy(locale, 'clients')
        : name === 'devis' ? copy(locale, 'documents')
          : name === 'outils' ? copy(locale, 'tools')
            : copy(locale, 'accountTab');

  /*
   * Le matériau de la lentille.
   *
   * Une teinte de marque, plus dense en mode sombre où un voile léger ne se
   * distingue pas du fond. Sur du verre elle reste translucide : une pastille
   * opaque masquerait la matière et se verrait comme une vignette collée.
   */
  const dark = activeScheme() === 'dark';
  const lensColor = kind === 'solid'
    ? colors.accentSoft
    : dark
      ? 'rgba(124, 150, 255, 0.24)'
      : 'rgba(47, 82, 232, 0.13)';

  return (
    <View
      /*
       * `pointerEvents="box-none"` : le conteneur couvre le bas de l'écran mais
       * ne prend aucun geste — seuls la barre et le « + » répondent. Sans cela,
       * une bande invisible avalerait les touchers au-dessus de la barre.
       */
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: Math.max(insets.bottom, spacing.md),
        paddingHorizontal: spacing.md,
        opacity: keyboardVisible ? 0 : 1,
      }}
    >
      <GlassGroup spacing={GAP + 6} style={{ flexDirection: 'row', alignItems: 'center', gap: GAP }}>
        <GlassSurface
          radius={radius.xl}
          effect="regular"
          interactive
          style={{
            flex: 1,
            height: BAR_HEIGHT,
            flexDirection: 'row',
            alignItems: 'center',
            // Le verre natif dessine ses propres bords ; l'ombre portée reste
            // utile pour décoller la barre du contenu qui passe dessous.
            ...(kind === 'solid'
              ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong, ...shadows.floating }
              : Platform.OS === 'ios'
                ? { shadowColor: dark ? '#000000' : '#0A1A4A', shadowOpacity: dark ? 0.4 : 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }
                : {}),
          }}
        >
          {/*
            La lentille : une seule vue, montée une fois, qui se déplace.
            Sa largeur suit celle de l'onglet visé ; sa position est le centre
            mesuré de cet onglet, moins la moitié de sa propre largeur.
          */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: 0,
                top: INSET + 1,
                height: BAR_HEIGHT - (INSET + 1) * 2,
                borderRadius: radius.lg,
                backgroundColor: lensColor,
              },
              lens,
            ]}
          />
          {items.map((item, index) => (
            <TabItem
              key={item.name}
              item={item}
              index={index}
              centre={centre}
              span={span}
              onLayout={onSlotLayout}
              label={labelFor(item.name)}
              active={item.name === activeName}
              onPress={() => select(item.name)}
            />
          ))}
        </GlassSurface>

        {/* Appuyer, puis parler. Rien entre les deux. */}
        <CreateButton label={copy(locale, 'voiceQuote')} onPress={() => router.push('/devis/nouveau?dicter=1')} />
      </GlassGroup>
    </View>
  );
}
