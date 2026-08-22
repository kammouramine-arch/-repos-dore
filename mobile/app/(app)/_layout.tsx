import { Tabs, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
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
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.subtle,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopColor: colors.line,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={typeof color === 'string' ? color : colors.subtle} />,
        }}
      />
      <Tabs.Screen
        name="prospects"
        options={{
          title: 'Prospects',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={typeof color === 'string' ? color : colors.subtle} />,
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
                    marginTop: -18,
                    width: 60,
                    height: 60,
                    borderRadius: radius.full,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  },
                  shadows.floating as object,
                ]}
              >
                <Ionicons name="add" size={30} color={colors.white} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={typeof color === 'string' ? color : colors.subtle} />,
        }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: 'Plus',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={typeof color === 'string' ? color : colors.subtle} />,
        }}
      />
      <Tabs.Screen name="devis" options={{ href: null }} />
    </Tabs>
  );
}
