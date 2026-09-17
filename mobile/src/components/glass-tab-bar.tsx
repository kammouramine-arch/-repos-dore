import * as React from 'react';
import { Animated as RNAnimated, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
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
import { activeScheme, colors, radius, shadows, spacing } from '@/theme';
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
 * Elle ouvrait auparavant un menu de cinq entrées. Un menu à ce niveau, c'est
 * une décision de plus avant le geste qui rapporte — et c'était la feuille
 * dont le voile restait affiché par-dessus toute l'application. Le geste le
 * plus fréquent mérite le chemin le plus court : on appuie, on parle.
 *
 * ## Pourquoi la barre est en position absolue
 *
 * Posée dans le flux, elle raccourcissait la scène : le contenu s'arrêtait net
 * à son bord supérieur, les cartes du bas se voyaient coupées en deux, et
 * derrière le verre on ne voyait que le blanc du navigateur. Un matériau
 * translucide sans rien derrière n'est pas du verre, c'est un rectangle pâle.
 *
 * Ici la barre flotte au-dessus d'une scène pleine hauteur ; le contenu passe
 * réellement dessous. En contrepartie, chaque écran doit réserver la place —
 * d'où `useTabBarSpace()`, à ajouter au bas de son contenu défilant.
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
/** La capsule reprend le ressort de sélection commun à l'application. */
const SLIDE = SPRING.select;

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

function TabItem({
  item,
  index,
  label,
  active,
  slide,
  slot,
  onPress,
}: {
  item: (typeof items)[number];
  index: number;
  label: string;
  active: boolean;
  /** Position de la capsule, en points, partagée par toute la barre. */
  slide: SharedValue<number>;
  slot: number;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const touch = useTouchMotion(0.9);

  /*
   * L'état de l'icône est déduit de **où se trouve la capsule**, pas de quel
   * onglet est sélectionné.
   *
   * Chaque onglet avait auparavant son propre ressort, démarré par un effet
   * React au changement de route. Trois ressorts indépendants partaient donc
   * en même temps que la capsule, chacun avec sa phase : l'ancienne icône
   * s'éteignait avant que la capsule ne soit partie, la nouvelle s'allumait
   * avant qu'elle n'arrive, et l'on voyait un clignotement au lieu d'un
   * déplacement.
   *
   * Ici, une seule valeur mène tout. L'icône s'allume à mesure que le verre la
   * recouvre, et s'éteint à mesure qu'il la quitte — comme un objet posé sur
   * la barre, qui éclaire ce qu'il survole. Interrompre le geste à mi-course
   * laisse deux icônes à moitié allumées, ce qui est exactement juste.
   */
  const presence = useDerivedValue(() => {
    if (reduced || slot <= 0) return active ? 1 : 0;
    const distance = Math.abs(slide.value - index * slot) / slot;
    return Math.max(0, 1 - distance);
  }, [active, index, reduced, slot]);

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
  }));

  return (
    <RNAnimated.View style={{ flex: 1, transform: [{ scale: touch.scale }] }}>
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        hitSlop={4}
        onPressIn={touch.pressIn}
        onPressOut={touch.pressOut}
        onPress={() => {
          touch.pressOut();
          void Haptics.selectionAsync().catch(() => undefined);
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
        <Animated.Text
          numberOfLines={1}
          style={[{ fontSize: 9.5, fontWeight: '600', letterSpacing: 0.1 }, caption]}
        >
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
 * qu'un effet de plus. Il reste dans le `GlassContainer` pour que le verre
 * d'iOS 26 le prenne en compte quand les deux formes se rapprochent.
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
   * C'est la « forme bleue décorative bloquée » visible sur l'enregistrement.
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
  const router = useRouter();
  const locale = useMobileLocale();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const kind = useGlassKind();
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const [barWidth, setBarWidth] = React.useState(0);
  const slide = useSharedValue(0);
  const fade = useSharedValue(1);
  const positioned = React.useRef(false);

  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const slot = barWidth / items.length;
  const activeName = state.routes[state.index]?.name;
  const activeIndex = items.findIndex((item) => item.name === activeName);
  const activeSlot = Math.max(0, activeIndex);
  // Route masquée (prospects, ou l'ancienne route de création) : aucune
  // destination n'est « sélectionnée », la capsule s'efface au lieu de
  // retomber sur Accueil.
  const unselected = activeIndex < 0;

  /*
   * L'étirement.
   *
   * Un rectangle qui se déplace d'un point à un autre reste un rectangle qui
   * se déplace. Ce qui donne à la matière d'iOS son caractère, c'est qu'elle
   * se laisse tirer : elle s'allonge dans le sens de la course et reprend sa
   * forme en arrivant, comme une goutte.
   *
   * L'étirement est déduit de l'écart qui reste à parcourir — donc de la
   * vitesse réelle, jamais d'un minuteur. Changer d'onglet en cours de route
   * ne relance rien : la capsule est déjà en mouvement, la cible se déplace,
   * elle suit. Le facteur est plafonné pour que le verre ne se transforme
   * jamais en traînée.
   */
  const target = useSharedValue(0);
  const stretch = useDerivedValue(() => {
    const remaining = Math.abs(target.value - slide.value);
    return Math.min(remaining / Math.max(slot, 1), 1);
  }, [slot]);

  React.useEffect(() => {
    if (!barWidth) return;
    const destination = activeSlot * slot;
    target.value = destination;
    // Premier positionnement sans mouvement : la capsule ne doit pas traverser
    // la barre depuis la gauche à chaque montage.
    if (!positioned.current || reduced) {
      positioned.current = true;
      slide.value = destination;
      fade.value = unselected ? 0 : 1;
      return;
    }
    // `withSpring` repart de la position **et de la vitesse** courantes : un
    // enchaînement rapide d'onglets se suit naturellement au lieu d'empiler
    // des animations.
    slide.value = withSpring(destination, SLIDE);
    fade.value = withTiming(unselected ? 0 : 1, { duration: DURATION.instant, easing: EASE_OUT });
  }, [activeSlot, barWidth, fade, reduced, slide, slot, target, unselected]);

  const capsule = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateX: slide.value },
      { scaleX: 1 + stretch.value * 0.16 },
      { scaleY: 1 - stretch.value * 0.06 },
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
   * La matière de la capsule.
   *
   * Sur du vrai verre, elle doit rester translucide : une pastille opaque
   * posée dessus masquerait la matière et se verrait comme une vignette
   * collée. Sans verre, elle reprend le bleu de la marque, assez pâle pour
   * laisser lire l'icône qu'elle recouvre — plus dense en mode sombre, où un
   * voile trop léger ne se distingue pas du fond.
   */
  const dark = activeScheme() === 'dark';
  const capsuleColor = kind === 'solid'
    ? colors.accentSoft
    : dark
      ? 'rgba(124, 150, 255, 0.22)'
      : 'rgba(47, 82, 232, 0.14)';

  return (
    <>
      {/*
        `pointerEvents="box-none"` : le conteneur couvre le bas de l'écran mais
        ne prend aucun geste — seuls la barre et le « + » répondent. Sans cela,
        une bande invisible avalerait les touchers au-dessus de la barre.
      */}
      <View
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
            onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
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
                  ? { shadowColor: '#0A1A4A', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }
                  : {}),
            }}
          >
            {/*
              La capsule est elle-même une surface de verre quand l'appareil en
              a une : c'est ce qui la fait réfracter ce qui passe dessous en se
              déplaçant, au lieu de glisser comme un autocollant. Sans verre
              natif, elle retombe sur un aplat teinté — aucune imitation.
            */}
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  left: 4,
                  top: 6,
                  width: Math.max(0, slot - 8),
                  height: BAR_HEIGHT - 12,
                },
                capsule,
              ]}
            >
              <GlassSurface
                radius={radius.lg}
                effect="clear"
                interactive
                solidColor={capsuleColor}
                tint={capsuleColor}
                style={{ flex: 1, backgroundColor: kind === 'liquid' ? undefined : capsuleColor }}
              />
            </Animated.View>
            {items.map((item, index) => (
              <TabItem
                key={item.name}
                item={item}
                index={index}
                slide={slide}
                slot={slot}
                label={labelFor(item.name)}
                active={item.name === activeName}
                onPress={() => select(item.name)}
              />
            ))}
          </GlassSurface>

          {/* Appuyer, puis parler. Rien entre les deux. */}
          <CreateButton
            label={copy(locale, 'voiceQuote')}
            onPress={() => router.push('/devis/nouveau?dicter=1')}
          />
        </GlassGroup>
      </View>
    </>
  );
}
