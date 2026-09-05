import { Tabs, useRouter } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows } from '@/theme';

/**
 * Navigation principale. Le bouton central « Nouveau devis » reste accessible
 * au pouce depuis n'importe quel onglet : c'est le geste qui rapporte.
 */
export default function AppTabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
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
          height: 88,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 9 : 10,
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
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={typeof color === 'string' ? color : colors.subtle} />
          ),
        }}
      />
      <Tabs.Screen
        name="prospects"
        options={{
          title: 'Prospects',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={typeof color === 'string' ? color : colors.subtle} />
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
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={typeof color === 'string' ? color : colors.subtle} />
          ),
        }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: 'Plus',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={typeof color === 'string' ? color : colors.subtle} />
          ),
        }}
      />
      <Tabs.Screen name="devis" options={{ href: null }} />
    </Tabs>
  );
}
