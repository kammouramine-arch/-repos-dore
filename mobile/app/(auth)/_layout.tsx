import { Stack } from 'expo-router';
import { colors } from '@/theme';

/** Espace d’authentification isolé pour des transitions natives cohérentes. */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        animation: 'fade_from_bottom',
        animationDuration: 220,
        gestureEnabled: true,
      }}
    />
  );
}
