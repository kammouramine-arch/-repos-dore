import * as React from 'react';
import { Animated as RNAnimated, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadows, spacing } from '@/theme';
import { GlassGroup, GlassSurface, useGlassKind } from './glass';
import { useReducedMotion, useTouchMotion } from './motion';
import { CreateSheet } from './create-sheet';
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
 * côté de la barre, et ouvre une feuille de création.
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
/** Ressort de la capsule : rapide, sans rebond visible, arrêt net. */
const SLIDE = { damping: 20, stiffness: 240, mass: 0.7 } as const;

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
  const progress = useSharedValue(active ? 1 : 0);

  React.useEffect(() => {
    progress.value = reduced ? (active ? 1 : 0) : withSpring(active ? 1 : 0, SLIDE);
  }, [active, reduced, progress]);

  const outline = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const filled = useAnimatedStyle(() => ({ opacity: progress.value }));
  const icon = useAnimatedStyle(() => ({
    transform: [{ translateY: reduced ? 0 : -1.5 * progress.value }, { scale: reduced ? 1 : 1 + 0.08 * progress.value }],
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
        <Text
          numberOfLines={1}
          style={{ fontSize: 9.5, fontWeight: '600', letterSpacing: 0.1, color: active ? colors.accent : colors.muted }}
        >
          {label}
        </Text>
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
  const bloom = useSharedValue(0);
  const halo = useAnimatedStyle(() => ({ opacity: bloom.value * 0.35, transform: [{ scale: 1 + bloom.value }] }));

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
          bloom.value = withTiming(1, { duration: 460 });
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
  const locale = useMobileLocale();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const kind = useGlassKind();
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const [barWidth, setBarWidth] = React.useState(0);
  const [creating, setCreating] = React.useState(false);
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

  React.useEffect(() => {
    if (!barWidth) return;
    const target = activeSlot * slot;
    // Premier positionnement sans mouvement : la capsule ne doit pas traverser
    // la barre depuis la gauche à chaque montage.
    if (!positioned.current || reduced) {
      positioned.current = true;
      slide.value = target;
      fade.value = unselected ? 0 : 1;
      return;
    }
    slide.value = withSpring(target, SLIDE);
    fade.value = withTiming(unselected ? 0 : 1, { duration: 160 });
  }, [activeSlot, barWidth, fade, reduced, slide, slot, unselected]);

  const capsule = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: slide.value }],
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
   * Sur du vrai verre, la capsule doit rester translucide : une pastille
   * opaque posée dessus masquerait la matière et se verrait comme une
   * vignette collée. Sans verre, elle reprend le bleu pâle de la marque, qui
   * tient sa lisibilité sur une surface pleine.
   */
  const capsuleColor = kind === 'solid' ? colors.accentSoft : 'rgba(47, 82, 232, 0.14)';

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
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  left: 4,
                  top: 6,
                  width: Math.max(0, slot - 8),
                  height: BAR_HEIGHT - 12,
                  borderRadius: radius.lg,
                  backgroundColor: capsuleColor,
                },
                capsule,
              ]}
            />
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

          <CreateButton label={copy(locale, 'create')} onPress={() => setCreating(true)} />
        </GlassGroup>
      </View>

      <CreateSheet visible={creating} onClose={() => setCreating(false)} />
    </>
  );
}
