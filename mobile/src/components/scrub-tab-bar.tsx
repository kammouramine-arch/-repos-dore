import * as React from 'react';
import { Animated, Keyboard, PanResponder, Pressable, Text, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme';
import { useReducedMotion } from './motion';
import { scrubSlot } from '@/lib/tab-navigation';

const items = [
  { name: 'index', label: 'Accueil', icon: 'home-outline' },
  { name: 'prospects', label: 'Prospects', icon: 'chatbubbles-outline' },
  { name: 'nouveau', label: 'Créer un devis', icon: 'add' },
  { name: 'clients', label: 'Clients', icon: 'people-outline' },
  { name: 'plus', label: 'Plus', icon: 'grid-outline' },
] as const;
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

/** The thumb tracks the finger; navigation commits only when released. */
export function ScrubTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const bar = React.useRef<View>(null);
  const [bounds, setBounds] = React.useState({ x: 0, y: 0, width: 0 });
  const [width, setWidth] = React.useState(0);
  const [thumb] = React.useState(() => new Animated.Value(0));
  const [preview, setPreview] = React.useState<number | null>(null);
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const active = items.findIndex(item => item.name === state.routes[state.index].name);
  const slotWidth = width / items.length;
  const position = React.useCallback((slot: number, animate: boolean) => {
    thumb.stopAnimation();
    const toValue = Math.max(0, slot) * slotWidth;
    if (!animate || reduced) thumb.setValue(toValue);
    else Animated.spring(thumb, { toValue, damping: 24, stiffness: 300, mass: 0.7, useNativeDriver: true }).start();
  }, [thumb, slotWidth, reduced]);
  React.useEffect(() => { position(active, true); }, [active, position]);
  const select = React.useCallback((slot: number) => {
    const route = state.routes.find(route => route.name === items[slot]?.name);
    if (!route || slot === 2) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(route.name, route.params);
    else position(active, true);
  }, [state.routes, navigation, active, position]);
  const gesture = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderGrant: () => { thumb.stopAnimation(); },
    onPanResponderMove: (_, g) => {
      const x = g.moveX - bounds.x;
      const slot = scrubSlot(x, bounds.width);
      setPreview(slot);
      // Continuous position, not a succession of separate tab animations.
      thumb.setValue(Math.max(0, Math.min(width - slotWidth, x - slotWidth / 2)));
    },
    onPanResponderRelease: (_, g) => {
      setPreview(null);
      const x = g.moveX - bounds.x;
      const inside = x >= 0 && x <= width && g.moveY >= bounds.y - 16 && g.moveY <= bounds.y + 80;
      const slot = inside ? scrubSlot(x, width) : null;
      position(slot ?? active, true);
      if (slot !== null) select(slot);
    },
    onPanResponderTerminate: () => { setPreview(null); position(active, true); },
  }), [active, position, select, slotWidth, thumb, width, bounds]);
  if (keyboardVisible) return null;
  return <View style={{ backgroundColor: colors.canvas, paddingBottom: Math.max(insets.bottom, 12), paddingHorizontal: 12, paddingTop: 8 }}>
    <View ref={bar} onLayout={event => {
      setWidth(event.nativeEvent.layout.width);
      bar.current?.measureInWindow((x, y, measuredWidth) => { setBounds({ x, y, width: measuredWidth }); });
    }} {...gesture.panHandlers} style={{ height: 60, borderRadius: 30, backgroundColor: colors.surface, flexDirection: 'row' }}>
      {active >= 0 && width > 0 && <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 4, left: 3, width: slotWidth - 6, height: 52, borderRadius: 26, backgroundColor: colors.accentSoft, transform: [{ translateX: thumb }] }} />}
      {items.map((item, index) => {
        const focused = (preview ?? active) === index;
        return <Pressable key={item.name} accessibilityRole={index === 2 ? 'button' : 'tab'} accessibilityLabel={item.label} accessibilityState={index === 2 ? undefined : { selected: active === index }}
          onPress={() => {
            if (index === 2) { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined); router.push('/devis/nouveau'); }
            else select(index);
          }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Ionicons name={item.icon} size={index === 2 ? 30 : focused ? 25 : 23} color={focused || index === 2 ? colors.accent : colors.subtle} />
          {index !== 2 && <Text style={{ fontSize: 10, fontWeight: '600', color: focused ? colors.accent : colors.subtle }}>{item.label}</Text>}
        </Pressable>;
      })}
    </View>
  </View>;
}
