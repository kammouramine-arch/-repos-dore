import * as React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme';
import { TabIcon } from '@/components/tab-icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrubTabBar } from '@/components/scrub-tab-bar';
import { useMobileLocale } from '@/lib/i18n';

/**
 * Navigation principale. Le bouton central « Nouveau devis » reste accessible
 * au pouce depuis n'importe quel onglet : c'est le geste qui rapporte.
 */
export default function AppTabsLayout() {
  const insets = useSafeAreaInsets();
  const locale = useMobileLocale();
  const bottomPadding = Math.max(insets.bottom, 12);
  const barHeight = 64 + bottomPadding;

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      detachInactiveScreens={false}
      tabBar={props => <ScrubTabBar {...props} />}
      screenListeners={{ tabPress: () => { void Haptics.selectionAsync().catch(() => undefined); } }}
      screenOptions={{
        // Keep native scenes attached and opaque. Content must not depend on
        // an interrupted shift animation or thaw after a modal/tab transition.
        animation: 'none',
        headerShown: false,
        sceneStyle: { backgroundColor: colors.surface },
        lazy: true,
        freezeOnBlur: false,
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
          title: locale === 'en' ? 'Home' : 'Accueil',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} name={focused ? 'home' : 'home-outline'} size={size} color={typeof color === 'string' ? color : colors.subtle} />
          ),
        }}
      />
      <Tabs.Screen
        name="devis"
        options={{
          title: locale === 'en' ? 'Quotes' : 'Devis',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} name={focused ? 'document-text' : 'document-text-outline'} size={size} color={typeof color === 'string' ? color : colors.subtle} />
          ),
        }}
      />
      <Tabs.Screen
        name="nouveau"
        options={{
          title: locale === 'en' ? 'Create' : 'Créer',
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: locale === 'en' ? 'Clients' : 'Clients',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} name={focused ? 'people' : 'people-outline'} size={size} color={typeof color === 'string' ? color : colors.subtle} />
          ),
        }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: locale === 'en' ? 'More' : 'Plus',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} name={focused ? 'grid' : 'grid-outline'} size={size} color={typeof color === 'string' ? color : colors.subtle} />
          ),
        }}
      />
      {/* Prospects : hors du produit de lancement. La route reste montée
          (lien profond, données existantes) mais n'a plus d'entrée. */}
      <Tabs.Screen name="prospects" options={{ href: null }} />
    </Tabs>
    </View>
  );
}
