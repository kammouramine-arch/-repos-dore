import { Stack } from 'expo-router';
import { colors, useThemeScheme } from '@/theme';

/** Espace public : découverte du produit, avant tout compte. */
export default function PublicLayout() {
  // Re-rendu à chaque bascule d'apparence, sans démontage : la navigation
  // et la position de défilement survivent au changement de thème.
  useThemeScheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}
    />
  );
}
