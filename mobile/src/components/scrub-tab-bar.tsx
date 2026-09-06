import * as React from 'react';
import { Animated, Keyboard, Pressable, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadows, spacing } from '@/theme';
import { useReducedMotion, useTouchMotion } from './motion';
import { useAuth } from '@/lib/auth';
import { copy, mobileLocale } from '@/lib/i18n';

/**
 * A direct, native-feeling bar. The old version put a horizontal
 * PanResponder over the entire bar; short taps could therefore be interpreted
 * as an interrupted scrub on a real iPhone. Each item now owns one action and
 * the premium movement comes from the active pill and elevated creation tab.
 */
const items = [
  { name: 'index', label: 'Accueil', icon: 'home-outline', activeIcon: 'home' },
  { name: 'clients', label: 'Clients', icon: 'people-outline', activeIcon: 'people' },
  { name: 'nouveau', label: 'Créer', icon: 'add', activeIcon: 'add' },
  { name: 'prospects', label: 'Activité', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
  { name: 'plus', label: 'Mon espace', icon: 'person-outline', activeIcon: 'person' },
] as const;

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

function NavigationItem({
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
  const touch = useTouchMotion(item.name === 'nouveau' ? 0.91 : 0.94);
  const [selection] = React.useState(() => new Animated.Value(active ? 1 : 0));

  React.useEffect(() => {
    if (reduced) {
      selection.setValue(active ? 1 : 0);
      return undefined;
    }
    const animation = Animated.spring(selection, {
      toValue: active ? 1 : 0,
      damping: 20,
      stiffness: 280,
      mass: 0.65,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, reduced, selection]);

  const isCreate = item.name === 'nouveau';
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: touch.scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={isCreate ? undefined : { selected: active }}
        hitSlop={4}
        onPressIn={touch.pressIn}
        onPressOut={touch.pressOut}
        onPress={() => {
          touch.pressOut();
          if (isCreate) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
          else void Haptics.selectionAsync().catch(() => undefined);
          onPress();
        }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 58 }}
      >
        {isCreate ? (
          <View
            style={{
              width: 58,
              height: 58,
              marginTop: -23,
              borderRadius: 29,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 5,
              borderColor: colors.canvas,
              ...shadows.floating,
            }}
          >
            <Ionicons name="add" size={29} color={colors.white} />
          </View>
        ) : (
          <>
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 3,
                width: 54,
                height: 34,
                borderRadius: 17,
                backgroundColor: colors.accentSoft,
                opacity: selection,
                transform: [{ scale: selection.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }],
              }}
            />
            <Ionicons name={(active ? item.activeIcon : item.icon) as keyof typeof Ionicons.glyphMap} size={22} color={active ? colors.accent : colors.subtle} />
            <Text style={{ marginTop: 3, fontSize: 10, fontWeight: active ? '700' : '600', color: active ? colors.accent : colors.subtle }}>
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function ScrubTabBar({ state, navigation }: BottomTabBarProps) {
  const { session } = useAuth();
  const locale = mobileLocale(session);
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const [barWidth, setBarWidth] = React.useState(0);
  const indicatorX = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  React.useEffect(() => {
    if (!barWidth) return;
    Animated.spring(indicatorX, {
      toValue: Math.max(0, state.index) * (barWidth / items.length),
      damping: 22,
      stiffness: 300,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [barWidth, indicatorX, state.index]);

  if (keyboardVisible) return null;

  const activeName = state.routes[state.index]?.name;
  const select = (name: string) => {
    const route = state.routes.find(candidate => candidate.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (event.defaultPrevented) return;
    navigation.navigate(route.name, route.params);
  };

  return (
    <View
      style={{
        backgroundColor: 'transparent',
        paddingTop: spacing.sm,
        paddingBottom: Math.max(insets.bottom, spacing.sm),
        paddingHorizontal: spacing.md,
      }}
    >
      <View
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={{
          height: 68,
          flexDirection: 'row',
          alignItems: 'center',
          overflow: 'visible',
          borderRadius: radius.xl,
          backgroundColor: colors.canvas,
          borderWidth: 1,
          borderColor: colors.line,
          paddingHorizontal: 4,
          ...shadows.floating,
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 4,
            top: 8,
            width: Math.max(0, barWidth / items.length - 8),
            height: 42,
            borderRadius: radius.lg,
            backgroundColor: colors.accentSoft,
            transform: [{ translateX: indicatorX }],
          }}
        />
        {items.map(item => (
          <NavigationItem
            key={item.name}
            item={item}
            label={item.name === 'index' ? copy(locale, 'home') : item.name === 'clients' ? copy(locale, 'clients') : item.name === 'nouveau' ? copy(locale, 'create') : item.name === 'prospects' ? copy(locale, 'activity') : copy(locale, 'space')}
            active={item.name === activeName}
            onPress={() => select(item.name)}
          />
        ))}
      </View>
    </View>
  );
}
