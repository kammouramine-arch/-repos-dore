import * as React from 'react';
import { Animated as RNAnimated, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { activeScheme, colors, radius, shadows, spacing, useThemeScheme } from '@/theme';
import { DURATION, EASE_OUT } from '@/theme/motion';
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
  label,
  active,
  onPress,
}: {
  item: (typeof items)[number];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const touch = useTouchMotion(0.9);
  /**
   * L'état actif, en une seule valeur.
   *
   * Elle ne suit plus la position d'une capsule : il n'y en a plus. Elle suit
   * la sélection, et rien d'autre, sur une durée courte.
   */
  const presence = useSharedValue(active ? 1 : 0);
  React.useEffect(() => {
    presence.value = reduced
      ? (active ? 1 : 0)
      : withTiming(active ? 1 : 0, { duration: DURATION.instant, easing: EASE_OUT });
  }, [active, presence, reduced]);

  const outline = useAnimatedStyle(() => ({ opacity: 1 - presence.value }));
  const filled = useAnimatedStyle(() => ({ opacity: presence.value }));
  const icon = useAnimatedStyle(() => ({
    // Une retenue, pas un saut : l'icône sélectionnée s'affirme de 3 %.
    transform: [{ scale: reduced ? 1 : 1 + 0.03 * presence.value }],
  }));
  const caption = useAnimatedStyle(() => ({
    color: interpolateColor(presence.value, [0, 1], [colors.muted, colors.accent]),
    // Le libellé sélectionné s'affirme sans changer de graisse : une graisse
    // qui change décale la mise en page d'un demi-point à chaque passage.
    opacity: 0.78 + 0.22 * presence.value,
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
  const kind = useGlassKind();
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const activeName = state.routes[state.index]?.name;
  const activeIndex = items.findIndex((item) => item.name === activeName);
  // Route masquée (prospects, création) : aucune destination n'est
  // « sélectionnée », et aucun onglet ne s'allume.
  void activeIndex;

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

  const dark = activeScheme() === 'dark';

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
          {items.map((item) => (
            <TabItem
              key={item.name}
              item={item}
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
