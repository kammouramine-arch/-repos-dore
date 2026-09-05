import * as React from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { PanResponder, Pressable, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows } from '@/theme';
import { TabIcon } from '@/components/tab-icon';
import { useReducedMotion } from '@/components/motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isTabBarSwipe, tabSwipeDestination } from '@/lib/tab-navigation';

/**
 * Navigation principale. Le bouton central « Nouveau devis » reste accessible
 * au pouce depuis n'importe quel onglet : c'est le geste qui rapporte.
 */
export default function AppTabsLayout() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);
  const barHeight = 64 + bottomPadding;
  const swipe = React.useMemo(() => PanResponder.create({
    // Only the bottom navigation owns this gesture, never lists or form fields.
    onMoveShouldSetPanResponderCapture: (event, gesture) => isTabBarSwipe({ startY: gesture.y0, currentY: event.nativeEvent.pageY, height, barHeight, dx: gesture.dx, dy: gesture.dy }),
    onPanResponderRelease: (_event, gesture) => {
      const destination = tabSwipeDestination(pathname, gesture.dx);
      if (destination) { void Haptics.selectionAsync().catch(() => undefined); router.navigate(destination); }
    },
  }), [height, barHeight, pathname, router]);

  return (
    <View style={{ flex: 1 }} {...swipe.panHandlers}>
    <Tabs
      screenListeners={{ tabPress: () => { void Haptics.selectionAsync().catch(() => undefined); } }}
      screenOptions={{
        animation: reduced ? 'none' : 'shift',
        headerShown: false,
        sceneStyle: { backgroundColor: colors.surface },
        lazy: true,
        freezeOnBlur: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.subtle,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopWidth: 0,
          height: barHeight,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          paddingTop: 10,
          paddingBottom: bottomPadding,
          shadowColor: colors.ink,
          shadowOpacity: 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -5 },
          elevation: 14,
        },
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} name={focused ? 'home' : 'home-outline'} size={size} color={typeof color === 'string' ? color : colors.subtle} />
          ),
        }}
      />
      <Tabs.Screen
        name="prospects"
        options={{
          title: 'Prospects',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={typeof color === 'string' ? color : colors.subtle} />
          ),
        }}
      />
      <Tabs.Screen
        name="nouveau"
        options={{
          title: '',
          tabBarButton: () => (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Créer un devis"
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/devis/nouveau');
                }}
                style={({ pressed }) => [
                  {
                    marginTop: -22,
                    width: 64,
                    height: 64,
                    borderRadius: radius.full,
                    backgroundColor: colors.accent,
                    borderWidth: 5,
                    borderColor: colors.canvas,
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  },
                  shadows.floating as object,
                ]}
              >
                <Ionicons name="add" size={31} color={colors.white} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} name={focused ? 'people' : 'people-outline'} size={size} color={typeof color === 'string' ? color : colors.subtle} />
          ),
        }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: 'Plus',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} name={focused ? 'grid' : 'grid-outline'} size={size} color={typeof color === 'string' ? color : colors.subtle} />
          ),
        }}
      />
      <Tabs.Screen name="devis" options={{ href: null }} />
    </Tabs>
    </View>
  );
}
