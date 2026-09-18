import * as React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, useThemeScheme } from '@/theme';
import { TabIcon } from '@/components/tab-icon';
import { GlassTabBar } from '@/components/glass-tab-bar';
import { useMobileLocale } from '@/lib/i18n';

/**
 * Navigation principale. Le bouton central « Nouveau devis » reste accessible
 * au pouce depuis n'importe quel onglet : c'est le geste qui rapporte.
 */
export default function AppTabsLayout() {
  // Re-rendu à chaque bascule d'apparence, sans démontage : la navigation
  // et la position de défilement survivent au changement de thème.
  useThemeScheme();
  const locale = useMobileLocale();

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      detachInactiveScreens={false}
      tabBar={props => <GlassTabBar {...props} />}
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
        /*
         * `position: 'absolute'` : le navigateur cesse de réserver une bande
         * en bas de la scène. C'est ce qui fait que le contenu occupe toute la
         * hauteur et passe réellement **sous** le verre, au lieu de s'arrêter
         * net à son bord — la découpe constatée sur l'appareil. Chaque écran
         * réserve la place lui-même avec `useTabBarSpace()`.
         */
        tabBarStyle: { position: 'absolute', backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
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
          title: 'Documents',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} name={focused ? 'document-text' : 'document-text-outline'} size={size} color={typeof color === 'string' ? color : colors.subtle} />
          ),
        }}
      />
      {/* La création n'est plus une destination : le « + » ouvre une feuille
          montée dans la barre. La route reste pour les liens profonds. */}
      <Tabs.Screen name="nouveau" options={{ href: null }} />
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
        name="outils"
        options={{
          title: locale === 'en' ? 'Tools' : 'Outils',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} name={focused ? 'apps' : 'apps-outline'} size={size} color={typeof color === 'string' ? color : colors.subtle} />
          ),
        }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: locale === 'en' ? 'Account' : 'Mon compte',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} name={focused ? 'person' : 'person-outline'} size={size} color={typeof color === 'string' ? color : colors.subtle} />
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
