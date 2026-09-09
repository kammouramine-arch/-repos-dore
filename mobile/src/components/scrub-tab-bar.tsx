import * as React from 'react';
import { Animated, Easing, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadows, spacing } from '@/theme';
import { useReducedMotion, useTouchMotion } from './motion';
import { useAuth } from '@/lib/auth';
import { copy, mobileLocale } from '@/lib/i18n';

/**
 * Barre de navigation.
 *
 * La précédente superposait deux indicateurs de sélection — une pastille
 * glissante sous la barre et une seconde, propre à chaque onglet — qui ne
 * s'accordaient pas, et l'indicateur partait de zéro à chaque montage. Ici :
 * une surface contenue (fond, filet, ombre), un seul indicateur qui glisse,
 * des icônes qui passent du contour au plein par fondu natif, une étiquette
 * dont la graisse ne change pas (donc aucune largeur qui saute), et un
 * bouton « + » qui répond sous le pouce sans déplacer la barre.
 */
const items = [
  { name: 'index', label: 'Accueil', icon: 'home-outline', activeIcon: 'home' },
  { name: 'clients', label: 'Clients', icon: 'people-outline', activeIcon: 'people' },
  { name: 'nouveau', label: 'Créer', icon: 'add', activeIcon: 'add' },
  { name: 'prospects', label: 'Activité', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
  { name: 'plus', label: 'Mon espace', icon: 'person-outline', activeIcon: 'person' },
] as const;

const BAR_HEIGHT = 66;
const CREATE_SIZE = 60;

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
  const touch = useTouchMotion(0.92);
  const [progress] = React.useState(() => new Animated.Value(active ? 1 : 0));

  React.useEffect(() => {
    if (reduced) {
      progress.setValue(active ? 1 : 0);
      return undefined;
    }
    const animation = Animated.spring(progress, { toValue: active ? 1 : 0, damping: 18, stiffness: 260, mass: 0.6, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [active, reduced, progress]);

  const lift = reduced ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5] });
  const grow = reduced ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: touch.scale }] }}>
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
        <Animated.View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: lift }, { scale: grow }] }}>
          <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={23} color={colors.subtle} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', opacity: progress }]}>
            <Ionicons name={item.activeIcon as keyof typeof Ionicons.glyphMap} size={23} color={colors.accent} />
          </Animated.View>
        </Animated.View>
        <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: '600', letterSpacing: 0.1, color: active ? colors.accent : colors.subtle }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Le bouton « + » : l'interaction signature.
 *
 * À l'appui, le disque se comprime et un halo de marque s'ouvre autour de
 * lui ; au relâchement, une impulsion haptique moyenne, puis l'écran de
 * création se pose élément par élément. Le halo est purement décoratif et
 * disparaît avec « Réduire les animations ».
 */
function CreateButton({ label, onPress }: { label: string; onPress: () => void }) {
  const touch = useTouchMotion(0.88);
  const reduced = useReducedMotion();
  const [bloom] = React.useState(() => new Animated.Value(0));
  const pulse = React.useCallback(() => {
    if (reduced) return;
    bloom.setValue(0);
    Animated.timing(bloom, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [bloom, reduced]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: BAR_HEIGHT }}>
      <Animated.View style={{ transform: [{ scale: touch.scale }], marginTop: -26 }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: CREATE_SIZE,
            height: CREATE_SIZE,
            borderRadius: CREATE_SIZE / 2,
            backgroundColor: colors.accentBright,
            opacity: bloom.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.45, 0] }),
            transform: [{ scale: bloom.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          hitSlop={6}
          onPressIn={() => { touch.pressIn(); pulse(); }}
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
      </Animated.View>
    </View>
  );
}

export function ScrubTabBar({ state, navigation }: BottomTabBarProps) {
  const { session } = useAuth();
  const locale = mobileLocale(session);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const [barWidth, setBarWidth] = React.useState(0);
  const [indicatorX] = React.useState(() => new Animated.Value(0));
  const [indicatorOpacity] = React.useState(() => new Animated.Value(1));
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
  // Route masquée (liste des devis) ou onglet de création : aucun onglet
  // n'est « sélectionné », l'indicateur s'efface au lieu de retomber sur Accueil.
  const onCreate = activeName === 'nouveau' || activeIndex < 0;

  React.useEffect(() => {
    if (!barWidth) return;
    const target = activeSlot * slot;
    // Premier positionnement sans mouvement : l'indicateur ne doit pas
    // traverser la barre depuis la gauche à chaque montage.
    if (!positioned.current || reduced) {
      positioned.current = true;
      indicatorX.setValue(target);
      indicatorOpacity.setValue(onCreate ? 0 : 1);
      return;
    }
    const animation = Animated.parallel([
      Animated.spring(indicatorX, { toValue: target, damping: 22, stiffness: 300, mass: 0.7, useNativeDriver: true }),
      Animated.timing(indicatorOpacity, { toValue: onCreate ? 0 : 1, duration: 160, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [activeSlot, barWidth, indicatorOpacity, indicatorX, onCreate, reduced, slot]);

  if (keyboardVisible) return null;

  const select = (name: string) => {
    const route = state.routes.find((candidate) => candidate.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (event.defaultPrevented) return;
    navigation.navigate(route.name, route.params);
  };
  const labelFor = (name: (typeof items)[number]['name']) =>
    name === 'index' ? copy(locale, 'home') : name === 'clients' ? copy(locale, 'clients') : name === 'nouveau' ? copy(locale, 'create') : name === 'prospects' ? copy(locale, 'activity') : copy(locale, 'space');

  return (
    <View style={{ backgroundColor: 'transparent', paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.sm), paddingHorizontal: spacing.md }}>
      <View
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={{
          height: BAR_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          overflow: 'visible',
          borderRadius: radius.xl,
          backgroundColor: colors.canvas,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.lineStrong,
          ...shadows.floating,
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 6,
            top: 8,
            width: Math.max(0, slot - 12),
            height: BAR_HEIGHT - 16,
            borderRadius: radius.lg,
            backgroundColor: colors.accentSoft,
            opacity: indicatorOpacity,
            transform: [{ translateX: indicatorX }],
          }}
        />
        {items.map((item) =>
          item.name === 'nouveau' ? (
            <CreateButton key={item.name} label={labelFor(item.name)} onPress={() => select(item.name)} />
          ) : (
            <TabItem key={item.name} item={item} label={labelFor(item.name)} active={item.name === activeName} onPress={() => select(item.name)} />
          ),
        )}
      </View>
    </View>
  );
}
