import * as React from 'react';
import { Animated, Pressable, Text, type ColorValue } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/theme';
import { useTouchMotion } from './motion';
import { copy, useMobileLocale } from '@/lib/i18n';

/**
 * Bouton retour de l'en-tête.
 *
 * Constaté sur iPhone : le bouton natif se dessinait vide — une capsule sans
 * chevron ni texte — en haut à gauche de « Mon compte » et « Abonnement ».
 * Plutôt que dépendre du rendu système, l'en-tête reçoit ce contrôle : un
 * chevron et « Retour », une cible de 44 pt, une compression tactile et un
 * retour haptique. Il n'affiche jamais le nom d'une route.
 */
export function HeaderBack({ tint = colors.accent }: { tint?: ColorValue }) {
  const router = useRouter();
  const locale = useMobileLocale();
  const touch = useTouchMotion(0.94);
  const lastPressAt = React.useRef(0);
  return (
    <Animated.View style={{ transform: [{ scale: touch.scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy(locale, 'back')}
        hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
        onPressIn={touch.pressIn}
        onPressOut={touch.pressOut}
        onPress={() => {
          touch.pressOut();
          const now = Date.now();
          if (now - lastPressAt.current < 400) return;
          lastPressAt.current = now;
          void Haptics.selectionAsync().catch(() => undefined);
          if (router.canGoBack()) router.back();
          else router.replace('/(app)');
        }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 44,
          paddingLeft: 2,
          paddingRight: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="chevron-back" size={26} color={tint} style={{ marginLeft: -4 }} />
        <Text style={{ color: tint, fontSize: 17, fontWeight: '600', letterSpacing: -0.2 }}>{copy(locale, 'back')}</Text>
      </Pressable>
    </Animated.View>
  );
}
