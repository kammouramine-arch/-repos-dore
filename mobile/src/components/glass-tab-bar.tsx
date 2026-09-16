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
import { copy, useMobileLocale } from '@/lib/i18n';

/**
 * Barre de navigation en verre.
 *
 * Cinq destinations, dont la création au centre :
 *
 *     Accueil · Clients · (+) · Documents · Outils
 *
 * La barre elle-même est une surface de verre native (iOS 26) posée
 * au-dessus du contenu, qui défile dessous et la traverse. La sélection
 * n'est pas une couleur d'icône : c'est une capsule qui **glisse** d'une
 * destination à l'autre, avec un ressort, pendant que l'icône passe du
 * contour au plein par fondu. Quand « Réduire les animations » est actif,
 * elle se pose directement sur la bonne destination ; quand « Réduire la
 * transparence » l'est, le verre cède la place à une surface opaque.
 *
 * Le bouton « + » reste plein et coloré plutôt que translucide : c'est
 * l'action qui rapporte, elle doit ressortir, et un contraste garanti vaut
 * mieux qu'un effet de plus.
 */

type TabName = 'index' | 'clients' | 'nouveau' | 'devis' | 'outils';

const items: { name: TabName; icon: string; activeIcon: string }[] = [
  { name: 'index', icon: 'home-outline', activeIcon: 'home' },
  { name: 'clients', icon: 'people-outline', activeIcon: 'people' },
  { name: 'nouveau', icon: 'add', activeIcon: 'add' },
  { name: 'devis', icon: 'document-text-outline', activeIcon: 'document-text' },
  { name: 'outils', icon: 'apps-outline', activeIcon: 'apps' },
];

const BAR_HEIGHT = 70;
const CREATE_SIZE = 62;
/** Ressort de la capsule : rapide, sans rebond visible, arrêt net. */
const SLIDE = { damping: 20, stiffness: 240, mass: 0.7 } as const;

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

/*
 * Deux pilotes d'animation, chacun là où il est le meilleur.
 *
 * La capsule de sélection et les icônes passent par Reanimated : leur valeur
 * est lue dans un style animé, sur le fil d'interface. La compression au
 * toucher reprend `useTouchMotion`, le geste commun à toute l'application —
 * déjà sur le pilote natif, et déjà respectueux de « Réduire les animations ».
 * Les deux cohabitent sans se gêner ; ce qui se gênerait, ce serait deux
 * définitions du même appui.
 */

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
  const touch = useTouchMotion(0.92);
  const progress = useSharedValue(active ? 1 : 0);

  React.useEffect(() => {
    progress.value = reduced ? (active ? 1 : 0) : withSpring(active ? 1 : 0, SLIDE);
  }, [active, reduced, progress]);

  const outline = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const filled = useAnimatedStyle(() => ({ opacity: progress.value }));
  const icon = useAnimatedStyle(() => ({
    transform: [
      { translateY: reduced ? 0 : -2 * progress.value },
      { scale: reduced ? 1 : 1 + 0.09 * progress.value },
    ],
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
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: BAR_HEIGHT, gap: 4 }}
      >
        <Animated.View style={[{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }, icon]}>
          <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, outline]}>
            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={24} color={colors.subtle} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, filled]}>
            <Ionicons name={item.activeIcon as keyof typeof Ionicons.glyphMap} size={24} color={colors.accent} />
          </Animated.View>
        </Animated.View>
        <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.15, color: active ? colors.accent : colors.subtle }}>
          {label}
        </Text>
      </Pressable>
    </RNAnimated.View>
  );
}

/**
 * Le bouton « + ».
 *
 * Il monte au-dessus de la barre, garde un anneau de la couleur du fond pour
 * se détacher du verre, et répond au pouce par une compression puis une
 * impulsion haptique moyenne.
 */
function CreateButton({ label, onPress }: { label: string; onPress: () => void }) {
  const touch = useTouchMotion(0.88);
  const reduced = useReducedMotion();
  const bloom = useSharedValue(0);

  const halo = useAnimatedStyle(() => ({
    opacity: bloom.value * 0.4,
    transform: [{ scale: 1 + bloom.value * 1.1 }],
  }));

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: BAR_HEIGHT }}>
      <RNAnimated.View style={{ marginTop: -26, transform: [{ scale: touch.scale }] }}>
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
            bloom.value = withTiming(1, { duration: 480 });
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
            borderWidth: 4,
            borderColor: colors.canvas,
            ...shadows.floating,
          })}
        >
          <Ionicons name="add" size={30} color={colors.white} />
        </Pressable>
      </RNAnimated.View>
    </View>
  );
}

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
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
  // Route masquée (prospects, dormante) ou onglet de création : aucune
  // destination n'est « sélectionnée », la capsule s'efface au lieu de
  // retomber sur Accueil.
  const onCreate = activeName === 'nouveau' || activeIndex < 0;

  React.useEffect(() => {
    if (!barWidth) return;
    const target = activeSlot * slot;
    // Premier positionnement sans mouvement : la capsule ne doit pas traverser
    // la barre depuis la gauche à chaque montage.
    if (!positioned.current || reduced) {
      positioned.current = true;
      slide.value = target;
      fade.value = onCreate ? 0 : 1;
      return;
    }
    slide.value = withSpring(target, SLIDE);
    fade.value = withTiming(onCreate ? 0 : 1, { duration: 160 });
  }, [activeSlot, barWidth, fade, onCreate, reduced, slide, slot]);

  const capsule = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: slide.value }],
  }));

  if (keyboardVisible) return null;

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
        : name === 'nouveau' ? copy(locale, 'create')
          : name === 'devis' ? copy(locale, 'documents')
            : copy(locale, 'tools');

  /*
   * Sur du vrai verre, la capsule doit rester translucide : une pastille
   * opaque posée dessus masquerait la matière et ferait ressortir une
   * vignette collée. Sans verre, elle reprend le bleu pâle de la marque,
   * qui tient sa lisibilité sur une surface pleine.
   */
  const capsuleColor = kind === 'solid' ? colors.accentSoft : 'rgba(47, 82, 232, 0.13)';

  return (
    <View
      style={{
        backgroundColor: 'transparent',
        paddingTop: spacing.md,
        paddingBottom: Math.max(insets.bottom, spacing.md),
        paddingHorizontal: spacing.md,
      }}
    >
      <GlassGroup spacing={18} style={{ overflow: 'visible' }}>
        <GlassSurface
          radius={radius.xl}
          effect="regular"
          onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
          style={{
            height: BAR_HEIGHT,
            flexDirection: 'row',
            alignItems: 'center',
            // Le verre natif dessine ses propres bords ; l'ombre portée reste
            // utile pour décoller la barre du contenu qui passe dessous.
            ...(kind === 'solid'
              ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong, ...shadows.floating }
              : Platform.OS === 'ios'
                ? { shadowColor: '#0A1A4A', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } }
                : {}),
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: 6,
                top: 8,
                width: Math.max(0, slot - 12),
                height: BAR_HEIGHT - 16,
                borderRadius: radius.lg,
                backgroundColor: capsuleColor,
              },
              capsule,
            ]}
          />
          {items.map((item) =>
            item.name === 'nouveau' ? (
              <CreateButton key={item.name} label={labelFor(item.name)} onPress={() => select(item.name)} />
            ) : (
              <TabItem key={item.name} item={item} label={labelFor(item.name)} active={item.name === activeName} onPress={() => select(item.name)} />
            ),
          )}
        </GlassSurface>
      </GlassGroup>
    </View>
  );
}
