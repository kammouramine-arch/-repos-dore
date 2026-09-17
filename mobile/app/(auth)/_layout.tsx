import { Stack } from 'expo-router';
import { colors, useThemeScheme } from '@/theme';

/** Espace d’authentification isolé pour des transitions natives cohérentes. */
export default function AuthLayout() {
  // Re-rendu à chaque bascule d'apparence, sans démontage : la navigation
  // et la position de défilement survivent au changement de thème.
  useThemeScheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
        animation: 'fade_from_bottom',
        animationDuration: 220,
        gestureEnabled: true,
      }}
    />
  );
}
